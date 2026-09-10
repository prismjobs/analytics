const { createClient } = require('@supabase/supabase-js');
const VivastreetParser = require('../lib/vivastreetParser');
const { TextFeatureExtractor } = require('../lib/textFeaturesAndAnalytics');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const textExtractor = new TextFeatureExtractor();

exports.handler = async (event) => {
  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId é obrigatório' })
      };
    }

    // 1. Busca todos os anúncios do usuário
    const { data: ads, error: fetchError } = await supabase
      .from('ads')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    if (!ads || ads.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Nenhum anúncio encontrado' })
      };
    }

    const parser = new VivastreetParser();
    const resultados = [];

    // 2. Para cada anúncio, busca a página atual e atualiza TUDO
    //    (antes só atualizava visitors_atual — por isso região/fotos/
    //    serviços/preços continuavam vazios mesmo após "Atualizar visitors")
    for (const ad of ads) {
      // Timestamp único por anúncio, para casar ads.data_ultima_atualizacao
      // com o registro em ad_snapshots.data_snapshot desta mesma rodada
      const agora = new Date().toISOString();

      try {
        const dados = await parser.parse(ad.url);

        // 2.1 Atualiza os dados principais do anúncio (inclui região!)
        const { error: updateError } = await supabase
          .from('ads')
          .update({
            titulo: dados.titulo,
            descricao: dados.descricao,
            descricao_plain: (dados.descricao || '').replace(/<[^>]*>/g, ''),
            localizacao: dados.localizacao,
            regiao: dados.regiao,
            tipo_anuncio: dados.tipo_anuncio,
            genero: dados.genero,
            idade: dados.idade,
            etnia: dados.etnia,
            idiomas: dados.idiomas,
            publico_alvo: dados.publico_alvo,
            data_publicacao: dados.data_publicacao,
            membro_desde: dados.membro_desde,
            visitors_atual: dados.visitors,
            data_ultima_atualizacao: agora
          })
          .eq('id', ad.id);

        if (updateError) throw updateError;

        // 2.2 Substitui fotos/serviços/preços pelo estado atual do anúncio
        //     (são "foto atual do anúncio", não histórico — por isso apaga
        //     e recria, ao contrário de ad_snapshots que sempre acumula)
        await supabase.from('ad_photos').delete().eq('ad_id', ad.id);
        if (dados.fotos && dados.fotos.length > 0) {
          await supabase.from('ad_photos').insert(
            dados.fotos.map(f => ({ ad_id: ad.id, url_foto: f.url, ordem: f.ordem }))
          );
        }

        await supabase.from('ad_services').delete().eq('ad_id', ad.id);
        if (dados.servicos && dados.servicos.length > 0) {
          await supabase.from('ad_services').insert(
            dados.servicos.map(s => ({
              ad_id: ad.id,
              nome_servico: s.nome,
              incluido: s.incluido,
              preco_extra: s.preco_extra
            }))
          );
        }

        await supabase.from('ad_rates').delete().eq('ad_id', ad.id);
        if (dados.precos && dados.precos.length > 0) {
          await supabase.from('ad_rates').insert(
            dados.precos.map(p => ({
              ad_id: ad.id,
              duracao: p.duracao,
              preco_incall: p.preco_incall,
              preco_outcall: p.preco_outcall
            }))
          );
        }

        // 2.3 Recalcula features de texto/estrutura com os dados mais recentes
        const textFeatures = textExtractor.extractFeatures(dados.descricao);
        await supabase.from('ad_text_features').insert([{ ad_id: ad.id, ...textFeatures }]);

        const structuralFeatures = textExtractor.extractStructuralFeatures({
          fotos: dados.fotos,
          precos: dados.precos,
          servicos: dados.servicos,
          data_atualizacao: agora,
          membro_desde: dados.membro_desde,
          data_publicacao: dados.data_publicacao
        });
        await supabase.from('ad_structural_features').insert([{ ad_id: ad.id, ...structuralFeatures }]);

        // 2.4 Snapshot histórico — ESTE é o registro que alimenta o
        //     "histórico de visualizações" que você precisa ver no frontend.
        //     Nunca é apagado; cada chamada de update acrescenta uma linha nova.
        const { error: snapshotError } = await supabase.from('ad_snapshots').insert([
          {
            ad_id: ad.id,
            visitors: dados.visitors,
            data_snapshot: agora,
            last_updated_site: dados.data_publicacao
          }
        ]);

        if (snapshotError) throw snapshotError;

        resultados.push({
          ad_id: ad.id,
          titulo: dados.titulo,
          visitors: dados.visitors,
          status: 'ok'
        });
      } catch (error) {
        console.error(`Erro ao atualizar anúncio ${ad.id} (${ad.url}):`, error.message);

        await supabase.from('parse_logs').insert([{
          user_id: userId,
          url: ad.url,
          site: 'vivastreet',
          status: 'error',
          mensagem_erro: error.message
        }]);

        resultados.push({
          ad_id: ad.id,
          titulo: ad.titulo,
          status: 'erro',
          mensagem: error.message
        });
      }
    }

    const sucesso = resultados.filter(r => r.status === 'ok').length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        total: ads.length,
        atualizados_com_sucesso: sucesso,
        falhas: ads.length - sucesso,
        detalhes: resultados
      })
    };
  } catch (error) {
    console.error('Update error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
