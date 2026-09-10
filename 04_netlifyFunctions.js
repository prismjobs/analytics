// ============================================
// NETLIFY FUNCTIONS
// netlify/functions/parseAd.js
// ============================================

const { createClient } = require('@supabase/supabase-js');
const VivastreetParser = require('../lib/vivastreetParser');
const { TextFeatureExtractor, CorrelationAnalyzer } = require('../lib/textFeaturesAndAnalytics');

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
    const { url, userId } = JSON.parse(event.body);

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
    const { data: savedAd, error: adError } = await supabase
      .from('ads')
      .insert([
        {
          user_id: userId,
          site: adData.site,
          ad_id_externo: adData.ad_id_externo,
          url: url,
          titulo: adData.titulo,
          descricao: adData.descricao,
          descricao_plain: adData.descricao.replace(/<[^>]*>/g, ''),
          localizacao: adData.localizacao,
          regiao: adData.regiao,
          tipo_anuncio: adData.tipo_anuncio,
          genero: adData.genero,
          idade: adData.idade,
          etnia: adData.etnia,
          idiomas: adData.idiomas,
          publico_alvo: adData.publico_alvo,
          data_publicacao: adData.data_publicacao,
          membro_desde: adData.membro_desde,
          visitors_atual: adData.visitors,
          data_ultima_atualizacao: new Date().toISOString()
        }
      ])
      .select();

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

    // 9. Snapshot inicial
    await supabase.from('ad_snapshots').insert([
      {
        ad_id: adId,
        visitors: adData.visitors,
        data_snapshot: new Date().toISOString(),
        last_updated_site: adData.data_publicacao
      }
    ]);

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
        fotos: adData.fotos.length,
        servicos: adData.servicos.length,
        precos: adData.precos.length
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

// ============================================
// netlify/functions/updateSnapshots.js
// ============================================

exports.updateSnapshots = async (event) => {
  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId é obrigatório' })
      };
    }

    // 1. Busca todos os anúncios do usuário
    const { data: ads } = await supabase
      .from('ads')
      .select('*')
      .eq('user_id', userId);

    if (!ads || ads.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Nenhum anúncio encontrado' })
      };
    }

    const parser = new VivastreetParser();
    const snapshots = [];

    // 2. Para cada anúncio, busca dados atualizados
    for (const ad of ads) {
      try {
        const updatedData = await parser.parse(ad.url);

        // 3. Insere snapshot
        snapshots.push({
          ad_id: ad.id,
          visitors: updatedData.visitors,
          data_snapshot: new Date().toISOString(),
          last_updated_site: updatedData.data_publicacao
        });

        // 4. Atualiza visitors_atual no ads
        await supabase
          .from('ads')
          .update({
            visitors_atual: updatedData.visitors,
            data_ultima_atualizacao: new Date().toISOString()
          })
          .eq('id', ad.id);
      } catch (error) {
        console.error(`Erro ao atualizar anúncio ${ad.id}:`, error.message);
      }
    }

    // 5. Insere todos os snapshots
    if (snapshots.length > 0) {
      await supabase.from('ad_snapshots').insert(snapshots);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        snapshots_criados: snapshots.length
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

// ============================================
// netlify/functions/analytics.js
// ============================================

exports.analytics = async (event) => {
  try {
    const { userId, segmento = 'all' } = JSON.parse(event.body || '{}');

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId é obrigatório' })
      };
    }

    // 1. Busca todos os ads do usuário com features
    let query = supabase
      .from('ad_performance')
      .select('*')
      .eq('user_id', userId);

    // 2. Aplica filtro de segmento
    if (segmento !== 'all' && segmento.includes('_')) {
      const [tipo, valor] = segmento.split('_');
      if (tipo === 'regiao') {
        query = query.eq('localizacao', valor);
      } else if (tipo === 'tipo') {
        query = query.eq('tipo_anuncio', valor);
      }
    }

    const { data: ads } = await query;

    if (!ads || ads.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Nenhum anúncio encontrado' })
      };
    }

    // 3. Define features para análise
    const featureNames = [
      'desc_length',
      'word_count',
      'paragraph_count',
      'emoji_count',
      'number_count',
      'currency_count',
      'caps_count',
      'sentiment_score',
      'readability_grade',
      'adjective_count',
      'verb_count',
      'vocab_diversity',
      'photo_count',
      'price_table_completeness',
      'service_count',
      'premium_services_count'
    ];

    // 4. Calcula correlações
    const correlacoes = CorrelationAnalyzer.multipleCorrelations(ads, featureNames);

    // 5. Calcula estatísticas descritivas
    const stats = {};
    featureNames.forEach(featureName => {
      const values = ads.map(ad => {
        const tf = ad.text_features || {};
        const sf = ad.structural_features || {};
        return tf[featureName] !== undefined ? tf[featureName] : sf[featureName] || 0;
      });
      stats[featureName] = CorrelationAnalyzer.descriptiveStats(values);
    });

    // 6. Comparação top vs bottom
    const comparacao = CorrelationAnalyzer.compareTopVsBottom(ads, featureNames);

    // 7. Salva correlações no banco
    for (const corr of correlacoes) {
      await supabase.from('ad_correlations').insert([
        {
          user_id: userId,
          feature_name: corr.feature_name,
          correlation_coefficient: corr.correlation_coefficient,
          p_value: corr.p_value,
          sample_size: corr.sample_size,
          segmento: segmento,
          data_calculo: new Date().toISOString()
        }
      ]);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        total_ads: ads.length,
        correlacoes: correlacoes,
        estatisticas: stats,
        comparacao_top_vs_bottom: comparacao,
        segmento: segmento
      })
    };
  } catch (error) {
    console.error('Analytics error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
