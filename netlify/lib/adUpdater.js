const { TextFeatureExtractor } = require('./textFeaturesAndAnalytics');

const textExtractor = new TextFeatureExtractor();

// Colunas criadas pela migration_003. Enquanto a migration não for aplicada no
// Supabase, o Postgres rejeita qualquer update que as mencione — então todo
// write que as usa passa por `atualizarAd()`, que repete a gravação só com as
// colunas antigas e avisa que a migration está pendente.
const COLUNAS_MIGRATION_003 = [
  'telefone',
  'telefone_capturado_em',
  'offline',
  'offline_desde',
  'ultima_verificacao'
];

const MODOS = ['visitors', 'telefone', 'completo'];

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

function ehErroDeColunaInexistente(error) {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const mensagem = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return mensagem.includes('column') && (mensagem.includes('does not exist') || mensagem.includes('could not find'));
}

function semColunasNovas(campos) {
  return Object.fromEntries(
    Object.entries(campos).filter(([campo]) => !COLUNAS_MIGRATION_003.includes(campo))
  );
}

/**
 * Grava campos em `ads` tolerando a ausência das colunas da migration 003.
 * Devolve { migracaoPendente } para a interface poder avisar o usuário.
 */
async function atualizarAd(supabase, adId, campos) {
  const { error } = await supabase.from('ads').update(campos).eq('id', adId);
  if (!error) return { migracaoPendente: false };
  if (!ehErroDeColunaInexistente(error)) throw error;

  const basicos = semColunasNovas(campos);
  if (Object.keys(basicos).length > 0) {
    const { error: erroRetry } = await supabase.from('ads').update(basicos).eq('id', adId);
    if (erroRetry) throw erroRetry;
  }
  return { migracaoPendente: true };
}

/**
 * Marca o anúncio como fora do ar sem encostar em nenhum dado coletado.
 * O histórico de visitantes continua intacto — um anúncio que terminou ainda
 * é (e talvez principalmente seja) material de análise.
 */
async function marcarOffline(supabase, ad, agora) {
  const campos = {
    offline: true,
    ultima_verificacao: agora
  };
  // `offline_desde` guarda a PRIMEIRA vez em que o anúncio apareceu fora do
  // ar; se já estava marcado, a data original é preservada.
  if (!ad.offline_desde) campos.offline_desde = agora;

  return atualizarAd(supabase, ad.id, campos);
}

/**
 * MODO PADRÃO — atualiza apenas o contador de visitantes.
 *
 * Regra de ouro deste projeto: uma atualização de rotina NÃO reescreve os
 * dados do anúncio. Título, descrição, fotos, preços, serviços e features de
 * texto ficam exatamente como foram coletados. Isso evita o problema em que
 * anúncios encerrados (página fora do ar, ou página genérica sem conteúdo)
 * tinham seu registro sobrescrito com dados vazios e perdiam tudo.
 *
 * Se a página estiver indisponível ou o contador não puder ser lido, nada é
 * gravado e NENHUM snapshot é criado — um snapshot com 0 visitantes seria
 * interpretado como queda real e contaminaria todo o cálculo de crescimento.
 */
async function atualizarVisitors(supabase, parser, ad, { capturarTelefone = true } = {}) {
  const agora = new Date().toISOString();
  const leve = await parser.parseLeve(ad.url);

  if (!leve.disponivel) {
    const { migracaoPendente } = await marcarOffline(supabase, ad, agora);
    return {
      ad_id: ad.id,
      titulo: ad.titulo,
      status: 'offline',
      mensagem: leve.motivoIndisponivel,
      dados_preservados: true,
      migracaoPendente
    };
  }

  if (leve.visitors === null || leve.visitors === undefined) {
    const { migracaoPendente } = await atualizarAd(supabase, ad.id, { ultima_verificacao: agora });
    return {
      ad_id: ad.id,
      titulo: ad.titulo,
      status: 'sem_contador',
      mensagem: 'A página respondeu, mas o contador de visitantes não foi encontrado — nenhuma captura foi registrada.',
      dados_preservados: true,
      migracaoPendente
    };
  }

  const campos = {
    visitors_atual: leve.visitors,
    data_ultima_atualizacao: agora,
    offline: false,
    ultima_verificacao: agora
  };

  // O telefone é só preenchido quando ainda está vazio: é um dado que faltava
  // no cadastro antigo, e completá-lo é acréscimo, não sobrescrita. Para
  // recapturar números já salvos existe o modo 'telefone'.
  if (capturarTelefone && leve.telefone && !ad.telefone) {
    campos.telefone = leve.telefone;
    campos.telefone_capturado_em = agora;
  }

  const { migracaoPendente } = await atualizarAd(supabase, ad.id, campos);

  const { error: snapshotError } = await supabase.from('ad_snapshots').insert([
    {
      ad_id: ad.id,
      visitors: leve.visitors,
      data_snapshot: agora
    }
  ]);
  if (snapshotError) throw snapshotError;

  return {
    ad_id: ad.id,
    titulo: ad.titulo,
    visitors: leve.visitors,
    telefone: campos.telefone || ad.telefone || null,
    status: 'ok',
    migracaoPendente
  };
}

/**
 * MODO TELEFONE — recaptura só o número de telefone (botão "Atualizar
 * telefones"). Não cria snapshot e não altera visitantes.
 */
async function atualizarTelefone(supabase, parser, ad) {
  const agora = new Date().toISOString();
  const leve = await parser.parseLeve(ad.url);

  if (!leve.disponivel) {
    const { migracaoPendente } = await marcarOffline(supabase, ad, agora);
    return {
      ad_id: ad.id,
      titulo: ad.titulo,
      status: 'offline',
      mensagem: leve.motivoIndisponivel,
      telefone: ad.telefone || null,
      dados_preservados: true,
      migracaoPendente
    };
  }

  if (!leve.telefone) {
    const { migracaoPendente } = await atualizarAd(supabase, ad.id, { ultima_verificacao: agora });
    return {
      ad_id: ad.id,
      titulo: ad.titulo,
      status: 'sem_telefone',
      mensagem: 'Nenhum número exposto na página (atributo data-phone-number ausente).',
      telefone: ad.telefone || null,
      migracaoPendente
    };
  }

  const { migracaoPendente } = await atualizarAd(supabase, ad.id, {
    telefone: leve.telefone,
    telefone_capturado_em: agora,
    offline: false,
    ultima_verificacao: agora
  });

  return {
    ad_id: ad.id,
    titulo: ad.titulo,
    telefone: leve.telefone,
    status: 'ok',
    migracaoPendente
  };
}

// Só substitui o valor salvo quando o novo vem preenchido — nunca troca um
// dado existente por vazio/nulo, nem na recaptura completa.
function preferirNovo(novo, atual) {
  if (novo === null || novo === undefined) return atual;
  if (typeof novo === 'string' && novo.trim() === '') return atual;
  return novo;
}

/**
 * MODO COMPLETO — recaptura todo o conteúdo do anúncio. É uma ação explícita
 * do usuário (botão "Recapturar dados completos" na tela de detalhes), nunca
 * a rotina automática.
 *
 * Mesmo aqui há proteção: campos que voltarem vazios preservam o valor
 * antigo, e fotos/serviços/preços só são substituídos quando a nova captura
 * traz conteúdo — se voltar lista vazia, o que já estava salvo é mantido.
 */
async function recapturarCompleto(supabase, parser, ad) {
  const agora = new Date().toISOString();

  let dados;
  try {
    dados = await parser.parse(ad.url);
  } catch (error) {
    if (error.indisponivel) {
      const { migracaoPendente } = await marcarOffline(supabase, ad, agora);
      return {
        ad_id: ad.id,
        titulo: ad.titulo,
        status: 'offline',
        mensagem: error.message,
        dados_preservados: true,
        migracaoPendente
      };
    }
    throw error;
  }

  const campos = {
    titulo: preferirNovo(dados.titulo, ad.titulo),
    localizacao: preferirNovo(dados.localizacao, ad.localizacao),
    regiao: preferirNovo(dados.regiao, ad.regiao),
    tipo_anuncio: preferirNovo(dados.tipo_anuncio, ad.tipo_anuncio),
    genero: preferirNovo(dados.genero, ad.genero),
    idade: preferirNovo(dados.idade, ad.idade),
    etnia: preferirNovo(dados.etnia, ad.etnia),
    idiomas: preferirNovo(dados.idiomas, ad.idiomas),
    publico_alvo: preferirNovo(dados.publico_alvo, ad.publico_alvo),
    data_publicacao: preferirNovo(dados.data_publicacao, ad.data_publicacao),
    membro_desde: preferirNovo(dados.membro_desde, ad.membro_desde),
    data_ultima_atualizacao: agora,
    offline: false,
    ultima_verificacao: agora
  };

  if (dados.descricao && dados.descricao.trim()) {
    campos.descricao = dados.descricao;
    campos.descricao_plain = htmlParaTexto(dados.descricao);
  }
  if (dados.telefone) {
    campos.telefone = dados.telefone;
    campos.telefone_capturado_em = agora;
  }
  if (dados.visitors !== null && dados.visitors !== undefined) {
    campos.visitors_atual = dados.visitors;
  }

  const { migracaoPendente } = await atualizarAd(supabase, ad.id, campos);

  if (dados.fotos && dados.fotos.length > 0) {
    await supabase.from('ad_photos').delete().eq('ad_id', ad.id);
    await supabase.from('ad_photos').insert(
      dados.fotos.map((f) => ({ ad_id: ad.id, url_foto: f.url, ordem: f.ordem }))
    );
  }

  if (dados.servicos && dados.servicos.length > 0) {
    await supabase.from('ad_services').delete().eq('ad_id', ad.id);
    await supabase.from('ad_services').insert(
      dados.servicos.map((s) => ({
        ad_id: ad.id,
        nome_servico: s.nome,
        incluido: s.incluido,
        preco_extra: s.preco_extra
      }))
    );
  }

  if (dados.precos && dados.precos.length > 0) {
    await supabase.from('ad_rates').delete().eq('ad_id', ad.id);
    await supabase.from('ad_rates').insert(
      dados.precos.map((p) => ({
        ad_id: ad.id,
        duracao: p.duracao,
        preco_incall: p.preco_incall,
        preco_outcall: p.preco_outcall
      }))
    );
  }

  // Features de texto/estrutura só são recalculadas quando há descrição nova
  // para analisar — caso contrário o cálculo anterior continua valendo.
  if (dados.descricao && dados.descricao.trim()) {
    const textFeatures = textExtractor.extractFeatures(dados.descricao);
    await supabase.from('ad_text_features').insert([{ ad_id: ad.id, ...textFeatures }]);
  }

  if (dados.fotos && dados.fotos.length > 0) {
    const structuralFeatures = textExtractor.extractStructuralFeatures({
      fotos: dados.fotos,
      precos: dados.precos,
      servicos: dados.servicos,
      data_atualizacao: agora,
      membro_desde: dados.membro_desde || ad.membro_desde,
      data_publicacao: dados.data_publicacao || ad.data_publicacao
    });
    await supabase.from('ad_structural_features').insert([{ ad_id: ad.id, ...structuralFeatures }]);
  }

  // Snapshot histórico — nunca apagado; cada captura válida acrescenta linha.
  if (dados.visitors !== null && dados.visitors !== undefined) {
    const { error: snapshotError } = await supabase.from('ad_snapshots').insert([
      { ad_id: ad.id, visitors: dados.visitors, data_snapshot: agora }
    ]);
    if (snapshotError) throw snapshotError;
  }

  return {
    ad_id: ad.id,
    titulo: campos.titulo,
    visitors: campos.visitors_atual ?? ad.visitors_atual,
    telefone: campos.telefone || ad.telefone || null,
    status: 'ok',
    migracaoPendente
  };
}

/**
 * Ponto de entrada único usado pelas functions. O modo padrão é o conservador
 * ('visitors'): atualiza só o contador de visitantes.
 */
async function updateSingleAd(supabase, parser, ad, modo = 'visitors') {
  const modoEfetivo = MODOS.includes(modo) ? modo : 'visitors';

  if (modoEfetivo === 'telefone') return atualizarTelefone(supabase, parser, ad);
  if (modoEfetivo === 'completo') return recapturarCompleto(supabase, parser, ad);
  return atualizarVisitors(supabase, parser, ad);
}

module.exports = {
  updateSingleAd,
  atualizarVisitors,
  atualizarTelefone,
  recapturarCompleto,
  htmlParaTexto,
  atualizarAd,
  ehErroDeColunaInexistente,
  semColunasNovas,
  MODOS
};
