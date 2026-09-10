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
