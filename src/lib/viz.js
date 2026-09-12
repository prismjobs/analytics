/**
 * Tokens visuais dos gráficos.
 *
 * A paleta foi validada para daltonismo (deuteranopia/protanopia/tritanopia)
 * sobre a superfície clara dos cartões: a ordem dos slots categóricos é fixa e
 * nunca é ciclada — quando um gráfico precisaria de um 4º/9º slot, ele vira
 * pequenos múltiplos (um gráfico por item) em vez de inventar cor nova.
 *
 * Regras que os gráficos deste projeto seguem:
 *  - Magnitude (ranking, média por região): UMA cor só, nunca degradê por valor.
 *  - Polaridade (crescimento/queda, aceleração): par divergente/estado +
 *    símbolo (▲/▼) no rótulo, para a cor nunca ser a única pista.
 *  - Correlação: rampa divergente azul↔vermelho com cinza neutro no zero.
 *  - Desempenho em faixas (quartis): rampa ordinal de um único tom de azul.
 */

// Slots categóricos (ordem fixa)
export const SERIE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

// Estado / polaridade — sempre acompanhados de símbolo ou rótulo
export const POSITIVO = '#0ca30c';
export const NEGATIVO = '#d03b3b';
export const NEUTRO = '#898781';

// Rampa ordinal (faixas de desempenho): um único tom, claro → escuro
export const RAMPA_ORDINAL = ['#86b6ef', '#3987e5', '#256abf', '#0d366b'];

// Rampa divergente para correlações: vermelho (negativa) ↔ cinza (zero) ↔ azul (positiva)
export const DIVERGENTE_NEGATIVO = ['#f7d3d3', '#e9a0a0', '#d96b6b', '#c43a3a'];
export const DIVERGENTE_POSITIVO = ['#cde2fb', '#9ec5f4', '#5598e7', '#256abf'];
export const DIVERGENTE_ZERO = '#f0efec';

// Cromo do gráfico
export const GRID = '#e1e0d9';
export const EIXO = '#c3c2b7';
export const TINTA_MUTED = '#898781';
export const TINTA_SECUNDARIA = '#52514e';

export const EIXO_TICK = { fontSize: 11, fill: TINTA_MUTED };
export const EIXO_LABEL = { fontSize: 11, fill: TINTA_SECUNDARIA };

/** Cor de estado a partir do sinal de um número (com símbolo no rótulo). */
export function corPorSinal(valor) {
  if (valor > 0) return POSITIVO;
  if (valor < 0) return NEGATIVO;
  return NEUTRO;
}

export function simboloPorSinal(valor) {
  if (valor > 0) return '▲';
  if (valor < 0) return '▼';
  return '■';
}

/**
 * Cor divergente para um coeficiente de correlação (-1 a 1).
 * Zero fica cinza neutro; a intensidade cresce com a força da correlação.
 */
export function corCorrelacao(r) {
  if (r === null || r === undefined || Number.isNaN(r)) return '#f4f4f2';
  const forca = Math.min(Math.abs(r), 1);
  if (forca < 0.1) return DIVERGENTE_ZERO;
  const indice = Math.min(3, Math.floor(forca / 0.25));
  return r > 0 ? DIVERGENTE_POSITIVO[indice] : DIVERGENTE_NEGATIVO[indice];
}

/** Cor da faixa (quartil) de desempenho: 0 = pior, 3 = melhor. */
export function corPorFaixa(indice) {
  return RAMPA_ORDINAL[Math.max(0, Math.min(RAMPA_ORDINAL.length - 1, indice))];
}

export function formatarNumero(valor, decimais = 0) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais
  });
}

export function encurtar(texto, limite = 26) {
  if (!texto) return '—';
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}
