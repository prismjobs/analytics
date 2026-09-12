/**
 * Métricas e estatística dos anúncios.
 *
 * Todo cálculo aqui parte de duas fontes:
 *  - `ad.snapshots`  → histórico de visitantes (o que dá "crescimento");
 *  - `ad.features` / `ad.estrutura` → features de texto e estruturais
 *    calculadas no momento da captura (tabelas ad_text_features e
 *    ad_structural_features), sempre usando a linha mais recente.
 */

const DIA_MS = 1000 * 60 * 60 * 24;

// ============================================================
// Base: snapshots e crescimento
// ============================================================

export function snapshotsOrdenados(ad) {
  return [...(ad.snapshots || [])].sort(
    (a, b) => new Date(a.data_snapshot) - new Date(b.data_snapshot)
  );
}

/**
 * Crescimento total de visitantes: da 1ª captura até a última.
 * Retorna null se ainda não há capturas suficientes (precisa de 2+).
 */
export function calcularCrescimento(ad) {
  const snaps = snapshotsOrdenados(ad);
  if (snaps.length < 2) return null;

  const primeira = snaps[0];
  const ultima = snaps[snaps.length - 1];
  const absoluto = ultima.visitors - primeira.visitors;
  const percentual = primeira.visitors > 0 ? (absoluto / primeira.visitors) * 100 : null;
  const dias = (new Date(ultima.data_snapshot) - new Date(primeira.data_snapshot)) / DIA_MS;

  return {
    absoluto,
    percentual,
    dataPrimeira: primeira.data_snapshot,
    dataUltima: ultima.data_snapshot,
    dias: dias > 0 ? dias : null,
    porDia: dias > 0 ? absoluto / dias : null
  };
}

/** Velocidade: visitantes ganhos por dia entre a 1ª e a última captura. */
export function visitantesPorDia(ad) {
  const c = calcularCrescimento(ad);
  return c && c.porDia !== null ? c.porDia : null;
}

/**
 * Aceleração recente: ritmo dos últimos N dias comparado ao ritmo histórico
 * do anúncio. Positivo = está acelerando; negativo = desacelerando.
 * Precisa de pelo menos uma captura dentro da janela e uma antes dela.
 */
export function aceleracaoRecente(ad, janelaDias = 7) {
  const snaps = snapshotsOrdenados(ad);
  if (snaps.length < 3) return null;

  const ultima = snaps[snaps.length - 1];
  const limite = new Date(ultima.data_snapshot).getTime() - janelaDias * DIA_MS;

  // Última captura ANTES da janela (o ponto de partida da fase recente)
  const anteriores = snaps.filter((s) => new Date(s.data_snapshot).getTime() <= limite);
  if (anteriores.length === 0) return null;
  const inicioJanela = anteriores[anteriores.length - 1];

  const diasRecentes =
    (new Date(ultima.data_snapshot) - new Date(inicioJanela.data_snapshot)) / DIA_MS;
  if (diasRecentes <= 0) return null;

  const recentePorDia = (ultima.visitors - inicioJanela.visitors) / diasRecentes;

  const historico = calcularCrescimento(ad);
  if (!historico || historico.porDia === null) return null;

  return {
    recentePorDia,
    historicoPorDia: historico.porDia,
    delta: recentePorDia - historico.porDia,
    razao: historico.porDia !== 0 ? recentePorDia / historico.porDia : null,
    janelaDias,
    diasConsiderados: diasRecentes
  };
}

// ============================================================
// Idade e ciclo de vida
// ============================================================

export function diasDesde(dataIso) {
  if (!dataIso) return null;
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return null;
  const dias = (Date.now() - data.getTime()) / DIA_MS;
  return dias >= 0 ? dias : null;
}

/** Idade do anúncio em dias, a partir da data de publicação. */
export function idadeAnuncioDias(ad) {
  const daPublicacao = diasDesde(ad.data_publicacao);
  if (daPublicacao !== null) return daPublicacao;
  const estrutura = featuresEstrutura(ad);
  return estrutura?.ad_age_days ?? null;
}

/** Visitantes acumulados por dia de vida do anúncio. */
export function visitantesPorDiaDeVida(ad) {
  const idade = idadeAnuncioDias(ad);
  if (!idade || idade <= 0) return null;
  return (ad.visitors_atual || 0) / idade;
}

/** Antiguidade da conta (membro desde), em dias. */
export function antiguidadeContaDias(ad) {
  return diasDesde(ad.membro_desde);
}

/** Dias desde a publicação/renovação do anúncio no site. */
export function diasDesdePublicacao(ad) {
  return diasDesde(ad.data_publicacao);
}

// ============================================================
// Features (texto e estrutura) — sempre a linha mais recente
// ============================================================

function maisRecente(lista) {
  if (!lista || lista.length === 0) return null;
  return [...lista].sort((a, b) => new Date(b.data_calculo) - new Date(a.data_calculo))[0];
}

export function featuresTexto(ad) {
  return maisRecente(ad.features);
}

export function featuresEstrutura(ad) {
  return maisRecente(ad.estrutura);
}

// ============================================================
// Estrutura do anúncio (fotos, preços, serviços)
// ============================================================

export function numeroDeFotos(ad) {
  const fotos = ad.fotos || [];
  if (fotos.length > 0) return fotos.length;
  return featuresEstrutura(ad)?.photo_count ?? 0;
}

/**
 * Preço outcall de 1 hora, quando existir. Usa "1 hour" como referência por
 * ser a duração mais comum; se não existir, cai para a primeira linha de
 * preço outcall preenchida.
 */
export function precoOutcall1Hora(ad) {
  const precos = ad.precos || [];
  if (precos.length === 0) return null;

  const umaHora = precos.find(
    (p) => p.duracao?.toLowerCase().includes('1 hour') && p.preco_outcall != null
  );
  if (umaHora) return umaHora.preco_outcall;

  const qualquerOutcall = precos.find((p) => p.preco_outcall != null);
  return qualquerOutcall ? qualquerOutcall.preco_outcall : null;
}

/**
 * Completude da tabela de preços: fração de células preenchidas (incall e
 * outcall) entre as linhas capturadas. 1 = tabela inteira preenchida.
 */
export function completudePreco(ad) {
  const precos = ad.precos || [];
  if (precos.length === 0) {
    return featuresEstrutura(ad)?.price_table_completeness ?? null;
  }
  const celulas = precos.length * 2;
  const preenchidas = precos.reduce(
    (total, p) => total + (p.preco_incall != null ? 1 : 0) + (p.preco_outcall != null ? 1 : 0),
    0
  );
  return preenchidas / celulas;
}

export function numeroDeServicos(ad) {
  const servicos = ad.servicos || [];
  if (servicos.length > 0) return servicos.length;
  return featuresEstrutura(ad)?.service_count ?? 0;
}

export function servicosComSobretaxa(ad) {
  const servicos = ad.servicos || [];
  if (servicos.length > 0) {
    return servicos.filter((s) => s.preco_extra != null && s.preco_extra > 0).length;
  }
  return featuresEstrutura(ad)?.premium_services_count ?? 0;
}

export function nomesDeServicos(ad) {
  return (ad.servicos || [])
    .filter((s) => s.incluido !== false)
    .map((s) => (s.nome_servico || '').trim())
    .filter(Boolean);
}

export function regiaoDe(ad) {
  return ad.regiao || ad.localizacao || null;
}

// ============================================================
// Estatística descritiva
// ============================================================

function numerosValidos(valores) {
  return valores.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
}

export function media(valores) {
  const v = numerosValidos(valores);
  if (v.length === 0) return null;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

export function percentil(valores, p) {
  const v = numerosValidos(valores).sort((a, b) => a - b);
  if (v.length === 0) return null;
  if (v.length === 1) return v[0];
  const posicao = (v.length - 1) * p;
  const base = Math.floor(posicao);
  const resto = posicao - base;
  if (base + 1 < v.length) return v[base] + resto * (v[base + 1] - v[base]);
  return v[base];
}

export function mediana(valores) {
  return percentil(valores, 0.5);
}

export function desvioPadrao(valores) {
  const v = numerosValidos(valores);
  if (v.length < 2) return null;
  const m = media(v);
  const variancia = v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(variancia);
}

export function resumoBoxPlot(valores) {
  const v = numerosValidos(valores).sort((a, b) => a - b);
  if (v.length === 0) return null;
  return {
    minimo: v[0],
    q1: percentil(v, 0.25),
    mediana: percentil(v, 0.5),
    q3: percentil(v, 0.75),
    maximo: v[v.length - 1],
    n: v.length
  };
}

/** Correlação de Pearson entre dois vetores alinhados (ignora pares incompletos). */
export function pearson(xs, ys) {
  const pares = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i];
    const y = ys[i];
    if (x === null || x === undefined || Number.isNaN(x)) continue;
    if (y === null || y === undefined || Number.isNaN(y)) continue;
    pares.push([x, y]);
  }
  if (pares.length < 3) return { r: null, n: pares.length };

  const mx = media(pares.map((p) => p[0]));
  const my = media(pares.map((p) => p[1]));
  let num = 0;
  let denX = 0;
  let denY = 0;
  pares.forEach(([x, y]) => {
    num += (x - mx) * (y - my);
    denX += (x - mx) ** 2;
    denY += (y - my) ** 2;
  });
  const den = Math.sqrt(denX * denY);
  return { r: den > 0 ? num / den : null, n: pares.length };
}

/** Reta de tendência por mínimos quadrados, para sobrepor a um scatter. */
export function regressaoLinear(pontos) {
  const validos = pontos.filter(
    (p) => p.x !== null && p.x !== undefined && p.y !== null && p.y !== undefined
  );
  if (validos.length < 3) return null;

  const mx = media(validos.map((p) => p.x));
  const my = media(validos.map((p) => p.y));
  let num = 0;
  let den = 0;
  validos.forEach((p) => {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  });
  if (den === 0) return null;

  const inclinacao = num / den;
  const intercepto = my - inclinacao * mx;
  const xs = validos.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  return {
    inclinacao,
    intercepto,
    r: pearson(validos.map((p) => p.x), validos.map((p) => p.y)).r,
    pontos: [
      { x: minX, y: intercepto + inclinacao * minX },
      { x: maxX, y: intercepto + inclinacao * maxX }
    ]
  };
}

/** Normaliza para 0..1 dentro do conjunto (min-max). */
export function normalizar(valores) {
  const v = numerosValidos(valores);
  if (v.length === 0) return valores.map(() => null);
  const min = Math.min(...v);
  const max = Math.max(...v);
  const amplitude = max - min;
  return valores.map((x) => {
    if (x === null || x === undefined || Number.isNaN(x)) return null;
    return amplitude === 0 ? 0.5 : (x - min) / amplitude;
  });
}

/**
 * Divide os anúncios em top 25% / bottom 25% por uma métrica.
 * É a base das comparações "o que os vencedores fazem de diferente".
 */
export function quartisPorMetrica(itens, obterValor) {
  const comValor = itens
    .map((item) => ({ item, valor: obterValor(item) }))
    .filter((x) => x.valor !== null && x.valor !== undefined && !Number.isNaN(x.valor))
    .sort((a, b) => b.valor - a.valor);

  if (comValor.length < 4) return { top: [], bottom: [], todos: comValor };

  const corte = Math.max(1, Math.floor(comValor.length / 4));
  return {
    top: comValor.slice(0, corte).map((x) => x.item),
    bottom: comValor.slice(-corte).map((x) => x.item),
    todos: comValor
  };
}

/** Índice da faixa (quartil) de um valor dentro do conjunto: 0 = pior. */
export function faixaDoValor(valor, valores) {
  if (valor === null || valor === undefined) return 0;
  const q1 = percentil(valores, 0.25);
  const q2 = percentil(valores, 0.5);
  const q3 = percentil(valores, 0.75);
  if (valor <= q1) return 0;
  if (valor <= q2) return 1;
  if (valor <= q3) return 2;
  return 3;
}

/**
 * Score composto: junta "resultado" (crescimento) com "fundamentos"
 * (fotos, completude de preço, descrição, serviços), tudo normalizado de 0 a 1.
 * Serve para ranquear quem tem os melhores fundamentos, não só quem teve sorte.
 */
export const PESOS_SCORE_PADRAO = {
  crescimento: 0.4,
  fotos: 0.2,
  preco: 0.15,
  descricao: 0.15,
  servicos: 0.1
};

export function scoreComposto(ads, pesos = PESOS_SCORE_PADRAO) {
  const base = ads.map((ad) => ({
    ad,
    crescimento: calcularCrescimento(ad)?.absoluto ?? null,
    fotos: numeroDeFotos(ad),
    preco: completudePreco(ad),
    descricao: featuresTexto(ad)?.desc_length ?? null,
    servicos: numeroDeServicos(ad)
  }));

  const normalizados = {
    crescimento: normalizar(base.map((b) => b.crescimento)),
    fotos: normalizar(base.map((b) => b.fotos)),
    preco: normalizar(base.map((b) => b.preco)),
    descricao: normalizar(base.map((b) => b.descricao)),
    servicos: normalizar(base.map((b) => b.servicos))
  };

  return base
    .map((b, i) => {
      const componentes = {
        crescimento: normalizados.crescimento[i],
        fotos: normalizados.fotos[i],
        preco: normalizados.preco[i],
        descricao: normalizados.descricao[i],
        servicos: normalizados.servicos[i]
      };

      // Pesos de componentes ausentes são redistribuídos, para um anúncio sem
      // tabela de preço (por exemplo) não ser punido com zero silencioso.
      let somaPesos = 0;
      let total = 0;
      Object.entries(pesos).forEach(([chave, peso]) => {
        const valor = componentes[chave];
        if (valor === null || valor === undefined) return;
        total += valor * peso;
        somaPesos += peso;
      });

      return {
        ad: b.ad,
        score: somaPesos > 0 ? (total / somaPesos) * 100 : null,
        componentes,
        bruto: b
      };
    })
    .filter((x) => x.score !== null)
    .sort((a, b) => b.score - a.score);
}

// ============================================================
// Features de texto disponíveis para correlação
// ============================================================

export const FEATURES_TEXTO = [
  { chave: 'desc_length', label: 'Comprimento' },
  { chave: 'word_count', label: 'Nº de palavras' },
  { chave: 'paragraph_count', label: 'Parágrafos' },
  { chave: 'emoji_count', label: 'Emojis' },
  { chave: 'number_count', label: 'Números' },
  { chave: 'currency_count', label: 'Símbolos £/$' },
  { chave: 'caps_count', label: 'MAIÚSCULAS' },
  { chave: 'sentiment_score', label: 'Sentimento' },
  { chave: 'readability_grade', label: 'Legibilidade' },
  { chave: 'first_person_count', label: '1ª pessoa' },
  { chave: 'second_person_count', label: '2ª pessoa' },
  { chave: 'adjective_count', label: 'Adjetivos' },
  { chave: 'verb_count', label: 'Verbos' },
  { chave: 'vocab_diversity', label: 'Diversidade vocab.' },
  { chave: 'exclusivity_mentions', label: 'Exclusividade' }
];

export const FEATURES_ESTRUTURA = [
  { chave: 'fotos', label: 'Nº de fotos', obter: numeroDeFotos },
  { chave: 'servicos', label: 'Nº de serviços', obter: numeroDeServicos },
  { chave: 'servicos_extra', label: 'Serviços com sobretaxa', obter: servicosComSobretaxa },
  { chave: 'preco_1h', label: 'Preço outcall 1h', obter: precoOutcall1Hora },
  { chave: 'completude_preco', label: 'Completude de preço', obter: completudePreco },
  { chave: 'idade_dias', label: 'Idade do anúncio (dias)', obter: idadeAnuncioDias }
];

export function valorDeFeatureTexto(ad, chave) {
  const f = featuresTexto(ad);
  if (!f) return null;
  const valor = f[chave];
  return valor === null || valor === undefined ? null : Number(valor);
}
