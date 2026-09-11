// ============================================
// EXTRAÇÃO DE FEATURES DE TEXTO
// e CÁLCULO DE CORRELAÇÕES
// ============================================

const Sentiment = require('sentiment');
const natural = require('natural');

class TextFeatureExtractor {
  constructor() {
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
  }

  /**
   * Extrai todas as features de texto de uma descrição
   */
  extractFeatures(descricao) {
    if (!descricao || typeof descricao !== 'string') {
      return this.getEmptyFeatures();
    }

    const texto = this.cleanText(descricao);
    const palavras = this.tokenizer.tokenize(texto.toLowerCase());

    return {
      // Tamanho e estrutura
      desc_length: descricao.length,
      word_count: palavras.length,
      paragraph_count: (descricao.match(/\n/g) || []).length + 1,

      // Símbolos
      emoji_count: this.countEmojis(descricao),
      number_count: (descricao.match(/\d+/g) || []).length,
      currency_count: (descricao.match(/[£$€]/g) || []).length,
      caps_count: this.countCaps(descricao),
      hashtag_count: (descricao.match(/#\w+/g) || []).length,

      // Sentimento e legibilidade
      sentiment_score: this.calculateSentiment(descricao),
      readability_grade: this.calculateFleschKincaid(texto),

      // Perspectiva narrativa
      first_person_count: this.countMatches(texto, /\bi\b|\bme\b|\bmy\b/gi),
      second_person_count: this.countMatches(texto, /\byou\b|\byour\b/gi),
      plural_count: this.countMatches(texto, /\bwe\b|\bus\b|\bour\b/gi),

      // POS Tagging (simplificado)
      adjective_count: this.countAdjectives(texto),
      verb_count: this.countVerbs(texto),

      // Vocabulário
      vocab_diversity: this.calculateVocabDiversity(palavras),

      // Linguagem específica
      exclusivity_mentions: this.countMatches(
        texto,
        /\b(premium|exclusive|luxury|elite|vip|special)\b/gi
      )
    };
  }

  /**
   * Extrai features estruturais do anúncio inteiro
   */
  extractStructuralFeatures(ad) {
    return {
      photo_count: ad.fotos ? ad.fotos.length : 0,
      price_table_completeness: this.calculatePriceCompleteness(ad.precos),
      service_count: ad.servicos ? ad.servicos.length : 0,
      premium_services_count: ad.servicos
        ? ad.servicos.filter(s => s.preco_extra && s.preco_extra > 0).length
        : 0,
      days_since_update: this.daysSince(ad.data_atualizacao),
      days_active: this.daysSince(ad.membro_desde),
      ad_age_days: this.daysSince(ad.data_publicacao)
    };
  }

  // ============ HELPERS ============

  cleanText(texto) {
    return texto
      .replace(/<[^>]*>/g, '') // Remove HTML
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  countEmojis(texto) {
    // Regex para emojis Unicode
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    const matches = texto.match(emojiRegex);
    return matches ? matches.length : 0;
  }

  countCaps(texto) {
    const matches = texto.match(/\b[A-Z]{2,}\b/g);
    return matches ? matches.length : 0;
  }

  countMatches(texto, regex) {
    const matches = texto.match(regex);
    return matches ? matches.length : 0;
  }

  calculateSentiment(texto) {
    const resultado = this.sentiment.analyze(texto);
    // Normaliza para -1 a +1
    return Math.max(-1, Math.min(1, resultado.score / 10));
  }

  /**
   * Flesch-Kincaid Grade Level
   * Fórmula: 0.39(total_words) + 11.8(total_syllables) - 15.59(total_sentences)
   */
  calculateFleschKincaid(texto) {
    const palavras = this.tokenizer.tokenize(texto);
    const sentencas = (texto.match(/[.!?]+/g) || []).length || 1;
    
    let silabas = 0;
    palavras.forEach(palavra => {
      silabas += this.countSyllables(palavra);
    });

    if (palavras.length === 0) return 0;

    const grade =
      0.39 * palavras.length +
      11.8 * silabas -
      15.59 * sentencas;

    return Math.max(0, Math.min(18, grade)); // Clipa entre 0 e 18
  }

  countSyllables(palavra) {
    // Simplificado: conta grupos de vogais
    palavra = palavra.toLowerCase();
    const vogais = /[aeiou]/g;
    const matches = palavra.match(vogais);
    let count = matches ? matches.length : 0;

    // Ajustes simples
    if (palavra.endsWith('e')) count--;
    if (palavra.endsWith('le') && palavra.length > 2) count++;

    return Math.max(1, count);
  }

  countAdjectives(texto) {
    // Simplificado: palavras que terminam em -ful, -less, -able, -ous
    const matches = texto.match(/\w+(ful|less|able|ous|ive)\b/gi);
    return matches ? matches.length : 0;
  }

  countVerbs(texto) {
    // Simplificado: palavras comuns que são verbos
    const verbs = /\b(am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|can|could|may|might|must|shall|should|going|comes|comes|makes|takes|gives|want|like|love|enjoy)\b/gi;
    const matches = texto.match(verbs);
    return matches ? matches.length : 0;
  }

  calculateVocabDiversity(palavras) {
    if (palavras.length === 0) return 0;
    const uniquas = new Set(palavras.map(p => p.toLowerCase()));
    return uniquas.size / palavras.length;
  }

  calculatePriceCompleteness(precos) {
    if (!precos || precos.length === 0) return 0;

    let preenchidas = 0;
    let total = 0;

    precos.forEach(p => {
      if (p.preco_incall) preenchidas++;
      if (p.preco_outcall) preenchidas++;
      total += 2;
    });

    return total > 0 ? preenchidas / total : 0;
  }

  daysSince(date) {
    if (!date) return 0;
    const diff = new Date() - new Date(date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getEmptyFeatures() {
    return {
      desc_length: 0,
      word_count: 0,
      paragraph_count: 0,
      emoji_count: 0,
      number_count: 0,
      currency_count: 0,
      caps_count: 0,
      hashtag_count: 0,
      sentiment_score: 0,
      readability_grade: 0,
      first_person_count: 0,
      second_person_count: 0,
      plural_count: 0,
      adjective_count: 0,
      verb_count: 0,
      vocab_diversity: 0,
      exclusivity_mentions: 0
    };
  }
}

// ============================================
// CÁLCULO DE CORRELAÇÕES
// ============================================

class CorrelationAnalyzer {
  /**
   * Calcula correlação de Pearson entre duas arrays
   */
  static pearson(x, y) {
    if (x.length !== y.length || x.length < 2) {
      return { r: 0, pValue: 1 };
    }

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b) / n;
    const meanY = y.reduce((a, b) => a + b) / n;

    let numerador = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerador += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominador = Math.sqrt(denomX * denomY);
    const r = denominador === 0 ? 0 : numerador / denominador;

    // P-value simplificado (aproximação t-test)
    const t = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
    const pValue = this.tTest(t, n - 2);

    return {
      r: Math.max(-1, Math.min(1, r)),
      pValue: pValue
    };
  }

  /**
   * Calcula p-value a partir de t-statistic (aproximado)
   */
  static tTest(t, df) {
    // Aproximação simples
    const absT = Math.abs(t);
    if (absT > 3) return 0.001;
    if (absT > 2) return 0.05;
    if (absT > 1) return 0.1;
    return 0.5;
  }

  /**
   * Calcula estatísticas descritivas
   */
  static descriptiveStats(data) {
    if (data.length === 0) return null;

    data = data.filter(v => typeof v === 'number' && !isNaN(v));
    data.sort((a, b) => a - b);

    const n = data.length;
    const media = data.reduce((a, b) => a + b) / n;
    const mediana = n % 2 === 0
      ? (data[n / 2 - 1] + data[n / 2]) / 2
      : data[Math.floor(n / 2)];

    const variance = data.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / n;
    const desvio = Math.sqrt(variance);

    return {
      media: parseFloat(media.toFixed(2)),
      mediana: parseFloat(mediana.toFixed(2)),
      desvio_padrao: parseFloat(desvio.toFixed(2)),
      minimo: data[0],
      maximo: data[n - 1],
      count: n
    };
  }

  /**
   * Correlações múltiplas (todas as features vs visitors)
   */
  static multipleCorrelations(ads, featureNames) {
    const correlacoes = [];

    // Extrai arrays de visitors e features
    const visitors = ads.map(ad => ad.visitors_atual || 0);

    featureNames.forEach(featureName => {
      const featureValues = ads.map(ad => {
        const tf = ad.text_features || {};
        const sf = ad.structural_features || {};
        return tf[featureName] !== undefined ? tf[featureName] : sf[featureName] || 0;
      });

      const { r, pValue } = this.pearson(featureValues, visitors);

      correlacoes.push({
        feature_name: featureName,
        correlation_coefficient: parseFloat(r.toFixed(3)),
        p_value: parseFloat(pValue.toFixed(8)),
        sample_size: ads.length,
        statistically_significant: pValue < 0.05
      });
    });

    return correlacoes.sort((a, b) => Math.abs(b.correlation_coefficient) - Math.abs(a.correlation_coefficient));
  }

  /**
   * Comparação top 25% vs bottom 25%
   */
  static compareTopVsBottom(ads, featureNames) {
    const sorted = [...ads].sort((a, b) => (b.visitors_atual || 0) - (a.visitors_atual || 0));
    const quarter = Math.ceil(sorted.length / 4);

    const top = sorted.slice(0, quarter);
    const bottom = sorted.slice(-quarter);

    const comparacao = [];

    featureNames.forEach(featureName => {
      const topValues = top.map(ad => {
        const tf = ad.text_features || {};
        const sf = ad.structural_features || {};
        return tf[featureName] !== undefined ? tf[featureName] : sf[featureName] || 0;
      });

      const bottomValues = bottom.map(ad => {
        const tf = ad.text_features || {};
        const sf = ad.structural_features || {};
        return tf[featureName] !== undefined ? tf[featureName] : sf[featureName] || 0;
      });

      const topStats = this.descriptiveStats(topValues);
      const bottomStats = this.descriptiveStats(bottomValues);

      comparacao.push({
        feature_name: featureName,
        top_25_media: topStats?.media || 0,
        bottom_25_media: bottomStats?.media || 0,
        diferenca: (topStats?.media || 0) - (bottomStats?.media || 0),
        percentual_diferenca: bottomStats?.media
          ? ((topStats?.media - bottomStats?.media) / bottomStats.media * 100).toFixed(1)
          : 0
      });
    });

    return comparacao;
  }
}

module.exports = {
  TextFeatureExtractor,
  CorrelationAnalyzer
};
