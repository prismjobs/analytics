const { createClient } = require('@supabase/supabase-js');
const VivastreetParser = require('../lib/vivastreetParser');
const { TextFeatureExtractor } = require('../lib/textFeaturesAndAnalytics');
const { htmlParaTexto, ehErroDeColunaInexistente, semColunasNovas } = require('../lib/adUpdater');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const textExtractor = new TextFeatureExtractor();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { url, userId, monitoramentoId } = JSON.parse(event.body);

    if (!url || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL e userId são obrigatórios' })
      };
    }

    // 1. Detecta o site
    if (!VivastreetParser.isVivastreetUrl(url)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL não é do Vivastreet' })
      };
    }

    // 2. Faz o parse
    const parser = new VivastreetParser();
    const adData = await parser.parse(url);

    // 3. Salva na base de dados
    //    `telefone` só existe depois da migration_003; se a migration ainda
    //    não foi aplicada, o insert é repetido sem esse campo para o cadastro
    //    do anúncio não falhar por causa disso.
    const registro = {
      user_id: userId,
      site: adData.site,
      ad_id_externo: adData.ad_id_externo,
      url: url,
      monitoramento_id: monitoramentoId || null,
      titulo: adData.titulo,
      descricao: adData.descricao,
      descricao_plain: htmlParaTexto(adData.descricao),
      localizacao: adData.localizacao,
      regiao: adData.regiao,
      tipo_anuncio: adData.tipo_anuncio,
      genero: adData.genero,
      idade: adData.idade,
      etnia: adData.etnia,
      idiomas: adData.idiomas,
      publico_alvo: adData.publico_alvo,
      telefone: adData.telefone || null,
      telefone_capturado_em: adData.telefone ? new Date().toISOString() : null,
      data_publicacao: adData.data_publicacao,
      membro_desde: adData.membro_desde,
      visitors_atual: adData.visitors ?? 0,
      data_ultima_atualizacao: new Date().toISOString(),
      ultima_verificacao: new Date().toISOString()
    };

    let { data: savedAd, error: adError } = await supabase.from('ads').insert([registro]).select();
    let migracaoPendente = false;

    if (adError && ehErroDeColunaInexistente(adError)) {
      migracaoPendente = true;
      ({ data: savedAd, error: adError } = await supabase
        .from('ads')
        .insert([semColunasNovas(registro)])
        .select());
    }

    if (adError) {
      // Log
      await supabase.from('parse_logs').insert([{
        user_id: userId,
        url: url,
        site: 'vivastreet',
        status: 'error',
        mensagem_erro: adError.message
      }]);
      throw adError;
    }

    const adId = savedAd[0].id;

    // 4. Salva fotos
    if (adData.fotos && adData.fotos.length > 0) {
      const fotos = adData.fotos.map(f => ({
        ad_id: adId,
        url_foto: f.url,
        ordem: f.ordem
      }));
      await supabase.from('ad_photos').insert(fotos);
    }

    // 5. Salva serviços
    if (adData.servicos && adData.servicos.length > 0) {
      const servicos = adData.servicos.map(s => ({
        ad_id: adId,
        nome_servico: s.nome,
        incluido: s.incluido,
        preco_extra: s.preco_extra
      }));
      await supabase.from('ad_services').insert(servicos);
    }

    // 6. Salva preços
    if (adData.precos && adData.precos.length > 0) {
      const precos = adData.precos.map(p => ({
        ad_id: adId,
        duracao: p.duracao,
        preco_incall: p.preco_incall,
        preco_outcall: p.preco_outcall
      }));
      await supabase.from('ad_rates').insert(precos);
    }

    // 7. Extrai features de texto
    const textFeatures = textExtractor.extractFeatures(adData.descricao);
    await supabase.from('ad_text_features').insert([
      {
        ad_id: adId,
        ...textFeatures
      }
    ]);

    // 8. Extrai features estruturais
    const structuralFeatures = textExtractor.extractStructuralFeatures({
      fotos: adData.fotos,
      precos: adData.precos,
      servicos: adData.servicos,
      data_atualizacao: new Date().toISOString(),
      membro_desde: adData.membro_desde,
      data_publicacao: adData.data_publicacao
    });
    await supabase.from('ad_structural_features').insert([
      {
        ad_id: adId,
        ...structuralFeatures
      }
    ]);

    // 9. Snapshot inicial — apenas quando o contador de visitantes foi
    //    realmente lido. Gravar 0 por falha de leitura estragaria o cálculo
    //    de crescimento (apareceria como queda real depois).
    if (adData.visitors !== null && adData.visitors !== undefined) {
      await supabase.from('ad_snapshots').insert([
        {
          ad_id: adId,
          visitors: adData.visitors,
          data_snapshot: new Date().toISOString(),
          last_updated_site: adData.data_publicacao
        }
      ]);
    }

    // Log de sucesso
    await supabase.from('parse_logs').insert([{
      user_id: userId,
      url: url,
      site: 'vivastreet',
      status: 'success'
    }]);

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        ad_id: adId,
        titulo: adData.titulo,
        visitors: adData.visitors,
        telefone: adData.telefone || null,
        fotos: adData.fotos.length,
        servicos: adData.servicos.length,
        precos: adData.precos.length,
        migracaoPendente
      })
    };
  } catch (error) {
    console.error('Parse error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
