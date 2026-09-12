import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdDetailModal } from './AdDetailModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { calcularCrescimento } from '../lib/metrics';

function getValorOrdenavel(linha, campo) {
  switch (campo) {
    case 'crescimento':
      return linha.crescimento ? linha.crescimento.absoluto : null;
    case 'snapshotCount':
      return linha.snapshotCount;
    case 'regiao':
      return (linha.regiao || linha.localizacao || '').toLowerCase();
    case 'titulo':
      return (linha.titulo || '').toLowerCase();
    case 'telefone':
      return (linha.telefone || '').toLowerCase();
    case 'tipo_anuncio':
      return (linha.tipo_anuncio || '').toLowerCase();
    case 'visitors_atual':
      return linha.visitors_atual ?? 0;
    case 'data_ultima_atualizacao':
      return linha.data_ultima_atualizacao ? new Date(linha.data_ultima_atualizacao).getTime() : 0;
    default:
      return linha[campo];
  }
}

function SetaOrdenacao({ ativo, direcao }) {
  if (!ativo) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-blue-600 ml-1">{direcao === 'asc' ? '↑' : '↓'}</span>;
}

export function AdTable({ ads }) {
  const { user } = useAuth();
  const [selectedAdId, setSelectedAdId] = useState(null);

  // Ordenação estilo planilha: clique no cabeçalho ordena, clique de novo inverte
  const [ordenacao, setOrdenacao] = useState({ campo: 'data_ultima_atualizacao', direcao: 'desc' });

  // Filtros estilo Excel: texto para título, seletores para região/tipo
  const [filtros, setFiltros] = useState({ titulo: '', regiao: '', tipo_anuncio: '' });

  // Controle de loading por linha (permite atualizar/excluir vários ao mesmo
  // tempo sem travar a tela inteira)
  const [atualizandoIds, setAtualizandoIds] = useState(new Set());
  const [excluindoIds, setExcluindoIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkResumo, setBulkResumo] = useState(null);
  const [recapturandoId, setRecapturandoId] = useState(null);

  const regioesDisponiveis = useMemo(
    () => [...new Set(ads.map((a) => a.regiao || a.localizacao).filter(Boolean))].sort(),
    [ads]
  );
  const tiposDisponiveis = useMemo(
    () => [...new Set(ads.map((a) => a.tipo_anuncio).filter(Boolean))].sort(),
    [ads]
  );

  // Pré-computa os campos derivados (crescimento, nº de capturas) uma vez
  const linhas = useMemo(
    () =>
      ads.map((ad) => ({
        ...ad,
        crescimento: calcularCrescimento(ad),
        snapshotCount: (ad.snapshots || []).length
      })),
    [ads]
  );

  const linhasFiltradasOrdenadas = useMemo(() => {
    let resultado = linhas;

    if (filtros.titulo.trim()) {
      const termo = filtros.titulo.trim().toLowerCase();
      resultado = resultado.filter((l) => (l.titulo || '').toLowerCase().includes(termo));
    }
    if (filtros.regiao) {
      resultado = resultado.filter((l) => (l.regiao || l.localizacao) === filtros.regiao);
    }
    if (filtros.tipo_anuncio) {
      resultado = resultado.filter((l) => l.tipo_anuncio === filtros.tipo_anuncio);
    }

    const { campo, direcao } = ordenacao;
    resultado = [...resultado].sort((a, b) => {
      const va = getValorOrdenavel(a, campo);
      const vb = getValorOrdenavel(b, campo);

      // Valores ausentes (ex: sem crescimento calculável) sempre vão para o
      // final, independentemente da direção da ordenação
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      if (va < vb) return direcao === 'asc' ? -1 : 1;
      if (va > vb) return direcao === 'asc' ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [linhas, filtros, ordenacao]);

  const selectedAd = linhas.find((a) => a.id === selectedAdId) || null;

  const handleOrdenar = (campo) => {
    setOrdenacao((prev) =>
      prev.campo === campo
        ? { campo, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo, direcao: 'asc' }
    );
  };

  // `modo` é sempre explícito: 'visitors' não encosta em nenhum dado
  // coletado (descrição, fotos, preços, serviços) — só lê o contador e grava
  // um novo snapshot. Era justamente a atualização genérica que apagava o
  // registro inteiro quando o anúncio saía do ar.
  const handleAtualizarUm = async (ad, modo = 'visitors') => {
    if (!user?.id) return;
    setAtualizandoIds((prev) => new Set(prev).add(ad.id));
    try {
      const resultado = await api.updateAd(user.id, ad.id, modo);
      // A lista se atualiza sozinha via subscription em tempo real (useAds)
      if (resultado?.status === 'offline') {
        alert(
          `"${ad.titulo}" parece estar fora do ar:\n${resultado.mensagem || ''}\n\n` +
            'Os dados já coletados foram preservados e o anúncio foi marcado como fora do ar.'
        );
      } else if (resultado?.status === 'sem_contador') {
        alert(
          `Não foi possível ler o contador de visitantes de "${ad.titulo}". ` +
            'Nada foi sobrescrito e nenhuma captura falsa foi registrada.'
        );
      } else if (modo === 'telefone' && resultado?.status === 'sem_telefone') {
        alert(`"${ad.titulo}" não expõe telefone na página.`);
      }
      return resultado;
    } catch (e) {
      alert(`Não foi possível atualizar "${ad.titulo}":\n${e.message}`);
      return null;
    } finally {
      setAtualizandoIds((prev) => {
        const next = new Set(prev);
        next.delete(ad.id);
        return next;
      });
    }
  };

  // Percorre os anúncios um de cada vez, aguardando o anterior terminar antes
  // de começar o próximo. Isso evita o timeout que acontecia ao tentar
  // atualizar todos numa única chamada ao servidor.
  const executarEmLote = async (modo, rotulo) => {
    if (!user?.id || linhasFiltradasOrdenadas.length === 0) return;
    setBulkUpdating(true);
    setBulkResumo(null);

    const contagem = { ok: 0, foraDoAr: 0, semDado: 0, falhas: 0 };
    let migracaoPendente = false;

    for (let i = 0; i < linhasFiltradasOrdenadas.length; i++) {
      const ad = linhasFiltradasOrdenadas[i];
      setBulkProgress({
        atual: i + 1,
        total: linhasFiltradasOrdenadas.length,
        titulo: ad.titulo,
        rotulo
      });
      setAtualizandoIds((prev) => new Set(prev).add(ad.id));
      try {
        const resultado = await api.updateAd(user.id, ad.id, modo);
        if (resultado?.migracaoPendente) migracaoPendente = true;
        if (resultado?.status === 'ok') contagem.ok++;
        else if (resultado?.status === 'offline') contagem.foraDoAr++;
        else contagem.semDado++;
      } catch (e) {
        contagem.falhas++;
        console.error(`Falha ao atualizar "${ad.titulo}":`, e.message);
      } finally {
        setAtualizandoIds((prev) => {
          const next = new Set(prev);
          next.delete(ad.id);
          return next;
        });
      }
    }

    setBulkProgress(null);
    setBulkUpdating(false);
    setBulkResumo({ rotulo, ...contagem, migracaoPendente });
  };

  const handleAtualizarVisitantes = () => executarEmLote('visitors', 'visitantes');
  const handleAtualizarTelefones = () => executarEmLote('telefone', 'telefones');

  // Recaptura completa: única ação que sobrescreve conteúdo coletado, e só
  // acontece por pedido explícito dentro do anúncio.
  const handleRecapturar = async (ad) => {
    const confirmado = window.confirm(
      `Recapturar TODOS os dados de "${ad.titulo}"?\n\nDescrição, fotos, preços e serviços serão substituídos pelo que estiver na página agora. Se o anúncio estiver fora do ar, a recaptura é abortada e nada é sobrescrito.`
    );
    if (!confirmado) return;

    setRecapturandoId(ad.id);
    try {
      await handleAtualizarUm(ad, 'completo');
    } finally {
      setRecapturandoId(null);
    }
  };

  const handleExcluir = async (ad) => {
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir "${ad.titulo}"?\n\nIsso apaga também todas as fotos, serviços, preços e todo o histórico de visitantes deste anúncio. Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;

    setExcluindoIds((prev) => new Set(prev).add(ad.id));
    try {
      const { error } = await supabase.from('ads').delete().eq('id', ad.id);
      if (error) throw error;
      if (selectedAdId === ad.id) setSelectedAdId(null);
    } catch (e) {
      alert(`Erro ao excluir "${ad.titulo}":\n${e.message}`);
    } finally {
      setExcluindoIds((prev) => {
        const next = new Set(prev);
        next.delete(ad.id);
        return next;
      });
    }
  };

  const limparFiltros = () => setFiltros({ titulo: '', regiao: '', tipo_anuncio: '' });
  const filtrosAtivos = filtros.titulo || filtros.regiao || filtros.tipo_anuncio;

  const colunas = [
    { campo: 'titulo', label: 'Título', ordenavel: true, align: 'left' },
    { campo: 'regiao', label: 'Região', ordenavel: true, align: 'left' },
    { campo: 'tipo_anuncio', label: 'Tipo', ordenavel: true, align: 'left' },
    { campo: 'telefone', label: 'Telefone', ordenavel: true, align: 'left' },
    { campo: 'visitors_atual', label: 'Visitors', ordenavel: true, align: 'center' },
    { campo: 'crescimento', label: 'Crescimento', ordenavel: true, align: 'center' },
    { campo: 'snapshotCount', label: 'Capturas', ordenavel: true, align: 'center' },
    { campo: 'data_ultima_atualizacao', label: 'Atualizado', ordenavel: true, align: 'left' },
    { campo: 'acoes', label: 'Ações', ordenavel: false, align: 'left' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold">
          Meus anúncios ({linhasFiltradasOrdenadas.length}
          {linhasFiltradasOrdenadas.length !== ads.length ? ` de ${ads.length}` : ''})
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAtualizarVisitantes}
            disabled={bulkUpdating || ads.length === 0}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm whitespace-nowrap"
            title="Lê o contador de visitantes de cada anúncio e grava uma nova captura. Não altera nenhum outro dado."
          >
            {bulkUpdating && bulkProgress?.rotulo === 'visitantes'
              ? `Atualizando ${bulkProgress?.atual}/${bulkProgress?.total}...`
              : '🔄 Atualizar visitantes'}
          </button>
          <button
            onClick={handleAtualizarTelefones}
            disabled={bulkUpdating || ads.length === 0}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap"
            title="Relê a página de cada anúncio e grava o número do atributo data-phone-number. Não altera nenhum outro dado."
          >
            {bulkUpdating && bulkProgress?.rotulo === 'telefones'
              ? `Buscando telefone ${bulkProgress?.atual}/${bulkProgress?.total}...`
              : '📞 Atualizar telefones'}
          </button>
        </div>
      </div>

      {bulkUpdating && bulkProgress && (
        <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-700">
          Atualizando {bulkProgress.rotulo} de{' '}
          <span className="font-medium">{bulkProgress.titulo}</span> — os demais anúncios
          continuam na fila e serão processados um por um.
        </div>
      )}

      {bulkResumo && !bulkUpdating && (
        <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-700 flex justify-between items-start gap-3">
          <div>
            <span className="font-medium">
              {bulkResumo.rotulo === 'telefones'
                ? 'Atualização de telefones concluída:'
                : 'Atualização de visitantes concluída:'}
            </span>{' '}
            {bulkResumo.ok} atualizado{bulkResumo.ok === 1 ? '' : 's'}
            {bulkResumo.foraDoAr > 0 && (
              <>
                {' · '}
                <span className="text-amber-700">
                  {bulkResumo.foraDoAr} fora do ar (dados preservados)
                </span>
              </>
            )}
            {bulkResumo.semDado > 0 && (
              <>
                {' · '}
                {bulkResumo.semDado} sem o dado na página
              </>
            )}
            {bulkResumo.falhas > 0 && (
              <>
                {' · '}
                <span className="text-red-700">{bulkResumo.falhas} com erro</span>
              </>
            )}
            {bulkResumo.migracaoPendente && (
              <p className="text-amber-700 mt-1">
                ⚠ As colunas de telefone e de status "fora do ar" ainda não existem no banco.
                Rode o arquivo <code>migration_003_telefone_e_status_offline.sql</code> no SQL
                Editor do Supabase para passar a gravar esses dados.
              </p>
            )}
          </div>
          <button
            onClick={() => setBulkResumo(null)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Fechar resumo"
          >
            ×
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            {/* Linha 1: cabeçalhos clicáveis para ordenação */}
            <tr>
              {colunas.map((col) => (
                <th
                  key={col.campo}
                  className={`px-4 py-2 font-semibold ${
                    col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.ordenavel ? 'cursor-pointer select-none hover:bg-gray-200' : ''}`}
                  onClick={col.ordenavel ? () => handleOrdenar(col.campo) : undefined}
                  title={col.ordenavel ? 'Clique para ordenar' : ''}
                >
                  {col.label}
                  {col.ordenavel && (
                    <SetaOrdenacao
                      ativo={ordenacao.campo === col.campo}
                      direcao={ordenacao.direcao}
                    />
                  )}
                </th>
              ))}
            </tr>
            {/* Linha 2: filtros, ao estilo de autofiltro de planilha */}
            <tr className="bg-gray-50">
              <th className="px-2 py-2">
                <input
                  type="text"
                  value={filtros.titulo}
                  onChange={(e) => setFiltros((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Filtrar título..."
                  className="w-full px-2 py-1 text-xs border rounded font-normal"
                />
              </th>
              <th className="px-2 py-2">
                <select
                  value={filtros.regiao}
                  onChange={(e) => setFiltros((f) => ({ ...f, regiao: e.target.value }))}
                  className="w-full px-2 py-1 text-xs border rounded font-normal"
                >
                  <option value="">Todas</option>
                  {regioesDisponiveis.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-2 py-2">
                <select
                  value={filtros.tipo_anuncio}
                  onChange={(e) => setFiltros((f) => ({ ...f, tipo_anuncio: e.target.value }))}
                  className="w-full px-2 py-1 text-xs border rounded font-normal"
                >
                  <option value="">Todos</option>
                  {tiposDisponiveis.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </th>
              <th colSpan={5}></th>
              <th className="px-2 py-2 text-right">
                {filtrosAtivos && (
                  <button
                    onClick={limparFiltros}
                    className="text-xs text-blue-600 hover:underline font-normal"
                  >
                    Limpar filtros
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {linhasFiltradasOrdenadas.map((ad) => {
              const atualizando = atualizandoIds.has(ad.id);
              const excluindo = excluindoIds.has(ad.id);
              const cresc = ad.crescimento;

              return (
                <tr key={ad.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium max-w-xs">
                    <span className="block truncate" title={ad.titulo}>
                      {ad.titulo}
                    </span>
                    {ad.offline && (
                      <span
                        className="inline-block mt-1 text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
                        title="A página não respondeu como um anúncio ativo na última verificação. Os dados coletados foram preservados."
                      >
                        ⚠ fora do ar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {ad.regiao || ad.localizacao || (
                      <span className="text-gray-400 text-xs">não capturado</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {ad.tipo_anuncio ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {ad.tipo_anuncio}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {ad.telefone ? (
                      <a
                        href={`tel:${ad.telefone}`}
                        className="text-blue-700 hover:underline whitespace-nowrap"
                        title={
                          ad.telefone_capturado_em
                            ? `Capturado em ${new Date(ad.telefone_capturado_em).toLocaleString('pt-BR')}`
                            : undefined
                        }
                      >
                        {ad.telefone}
                      </a>
                    ) : (
                      <span className="text-gray-400">não capturado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{ad.visitors_atual}</td>
                  <td className="px-4 py-3 text-center">
                    {cresc === null ? (
                      <span className="text-gray-400 text-xs">precisa de 2+ capturas</span>
                    ) : (
                      <span
                        className={`font-bold text-sm px-2 py-1 rounded ${
                          cresc.absoluto > 0
                            ? 'bg-green-100 text-green-700'
                            : cresc.absoluto < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                        title={`De ${cresc.dataPrimeira?.slice(0, 10)} até ${cresc.dataUltima?.slice(0, 10)}`}
                      >
                        {cresc.absoluto > 0 ? '↑ +' : cresc.absoluto < 0 ? '↓ ' : '→ '}
                        {cresc.absoluto}
                        {cresc.percentual !== null && (
                          <span className="font-normal opacity-75">
                            {' '}
                            ({cresc.percentual > 0 ? '+' : ''}
                            {cresc.percentual.toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{ad.snapshotCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {ad.data_ultima_atualizacao
                      ? formatDistanceToNow(new Date(ad.data_ultima_atualizacao), {
                          addSuffix: true,
                          locale: ptBR
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAdId(ad.id)}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => handleAtualizarUm(ad, 'visitors')}
                        disabled={atualizando || bulkUpdating}
                        className="text-green-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:no-underline"
                        title="Lê só o contador de visitantes e grava uma nova captura. Nenhum outro dado é alterado."
                      >
                        {atualizando ? 'Atualizando...' : '🔄 Visitantes'}
                      </button>
                      <button
                        onClick={() => handleAtualizarUm(ad, 'telefone')}
                        disabled={atualizando || bulkUpdating}
                        className="text-blue-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:no-underline"
                        title="Relê a página e grava só o telefone"
                      >
                        📞 Telefone
                      </button>
                      <a
                        href={ad.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:underline text-xs"
                      >
                        Ver original
                      </a>
                      <button
                        onClick={() => handleExcluir(ad)}
                        disabled={excluindo}
                        className="text-red-500 hover:underline text-xs font-medium disabled:opacity-50"
                        title="Parar de monitorar este anúncio"
                      >
                        {excluindo ? 'Excluindo...' : '🗑️ Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ads.length === 0 && (
        <div className="p-8 text-center text-gray-500">Nenhum anúncio cadastrado ainda.</div>
      )}

      {ads.length > 0 && linhasFiltradasOrdenadas.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          Nenhum anúncio corresponde aos filtros atuais.{' '}
          <button onClick={limparFiltros} className="text-blue-600 hover:underline">
            Limpar filtros
          </button>
        </div>
      )}

      <AdDetailModal
        ad={selectedAd}
        isOpen={!!selectedAdId}
        onClose={() => setSelectedAdId(null)}
        onRecapturar={handleRecapturar}
        recapturando={recapturandoId === selectedAdId}
      />
    </div>
  );
}
