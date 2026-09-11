const { TextFeatureExtractor } = require('./textFeaturesAndAnalytics');

const textExtractor = new TextFeatureExtractor();

/**
 * Converte a descrição em HTML para texto plano preservando quebras de
 * parágrafo. Antes o sistema usava um replace simples que removia todas
 * as tags sem inserir "\n" no lugar, então "<p>A</p><p>B</p>" virava "AB"
 * grudado, sem separação nenhuma.
 */
function htmlParaTexto(html) {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Atualiza um único anúncio: busca a página atual no Vivastreet, grava os
 * dados principais, substitui fotos/serviços/preços pelo estado atual, e
 * insere um novo registro em ad_snapshots (histórico, nunca é apagado).
 *
 * Extraído como função compartilhada para que tanto o endpoint de
 * "atualizar 1 anúncio" quanto o de "atualizar todos" (usado por cron,
 * se um dia for automatizado) usem exatamente a mesma lógica.
 */
async function updateSingleAd(supabase, parser, ad) {
  const agora = new Date().toISOString();
  const dados = await parser.parse(ad.url);

  // 1. Atualiza os dados principais do anúncio (inclui região!)
  const { error: updateError } = await supabase
    .from('ads')
    .update({
      titulo: dados.titulo,
      descricao: dados.descricao,
      descricao_plain: htmlParaTexto(dados.descricao),
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

  // 2. Substitui fotos/serviços/preços pelo estado atual do anúncio
  //    (representam "o anúncio agora", não histórico — por isso apaga e
  //    recria, ao contrário de ad_snapshots que sempre acumula)
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

  // 3. Recalcula features de texto/estrutura com os dados mais recentes
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

  // 4. Snapshot histórico — ESTE é o registro que alimenta o "histórico de
  //    visualizações" e o cálculo de crescimento (1ª captura x última).
  //    Nunca é apagado; cada atualização acrescenta uma linha nova.
  const { error: snapshotError } = await supabase.from('ad_snapshots').insert([
    {
      ad_id: ad.id,
      visitors: dados.visitors,
      data_snapshot: agora,
      last_updated_site: dados.data_publicacao
    }
  ]);

  if (snapshotError) throw snapshotError;

  return {
    ad_id: ad.id,
    titulo: dados.titulo,
    visitors: dados.visitors,
    status: 'ok'
  };
}

module.exports = { updateSingleAd, htmlParaTexto };
