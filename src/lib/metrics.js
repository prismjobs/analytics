/**
 * Calcula o crescimento total de visitantes: da 1ª captura até a última.
 * Retorna null se ainda não há capturas suficientes (precisa de 2+).
 */
export function calcularCrescimento(ad) {
  const snaps = [...(ad.snapshots || [])].sort(
    (a, b) => new Date(a.data_snapshot) - new Date(b.data_snapshot)
  );
  if (snaps.length < 2) return null;

  const primeira = snaps[0];
  const ultima = snaps[snaps.length - 1];
  const absoluto = ultima.visitors - primeira.visitors;
  const percentual = primeira.visitors > 0 ? (absoluto / primeira.visitors) * 100 : null;
  const dias = (new Date(ultima.data_snapshot) - new Date(primeira.data_snapshot)) / (1000 * 60 * 60 * 24);

  return {
    absoluto,
    percentual,
    dataPrimeira: primeira.data_snapshot,
    dataUltima: ultima.data_snapshot,
    dias: dias > 0 ? dias : null,
    porDia: dias > 0 ? absoluto / dias : null
  };
}

/**
 * Extrai o preço outcall de 1 hora de um anúncio, quando existir.
 * Usa "1 hour" como referência por ser a duração mais comum entre os
 * anúncios capturados; se não existir, cai para a primeira linha de preço
 * outcall preenchida.
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

export function numeroDeFotos(ad) {
  return (ad.fotos || []).length;
}
