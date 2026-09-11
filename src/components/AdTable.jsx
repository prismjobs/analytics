import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdDetailModal } from './AdDetailModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

/**
 * Calcula o crescimento total de visitantes: da 1ª captura até a última.
 * É diferente de "trend" (que compararia só as duas últimas capturas) —
 * aqui é o crescimento acumulado desde que o anúncio começou a ser
 * monitorado, que é o número que realmente importa para saber quais
 * anúncios estão performando melhor ao longo do tempo.
 */
function calcularCrescimento(ad) {
  const snaps = [...(ad.snapshots || [])].sort(
    (a, b) => new Date(a.data_snapshot) - new Date(b.data_snapshot)
  );
  if (snaps.length < 2) return null;

  const primeira = snaps[0];
  const ultima = snaps[snaps.length - 1];
  const absoluto = ultima.visitors - primeira.visitors;
  const percentual = primeira.visitors > 0 ? (absoluto / primeira.visitors) * 100 : null;

  return {
    absoluto,
    percentual,
    dataPrimeira: primeira.data_snapshot,
    dataUltima: ultima.data_snapshot
  };
}

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

  const handleAtualizarUm = async (ad) => {
    if (!user?.id) return;
    setAtualizandoIds((prev) => new Set(prev).add(ad.id));
    try {
      await api.updateAd(user.id, ad.id);
      // A lista se atualiza sozinha via subscription em tempo real (useAds)
    } catch (e) {
      alert(`Não foi possível atualizar "${ad.titulo}":\n${e.message}`);
    } finally {
      setAtualizandoIds((prev) => {
        const next = new Set(prev);
        next.delete(ad.id);
        return next;
      });
    }
  };

  // Atualiza todos os anúncios um de cada vez, aguardando o anterior
  // terminar antes de começar o próximo. Isso evita o timeout que
  // acontecia ao tentar atualizar todos numa única chamada ao servidor.
  const handleAtualizarTodos = async () => {
    if (!user?.id || linhasFiltradasOrdenadas.length === 0) return;
    setBulkUpdating(true);

    for (let i = 0; i < linhasFiltradasOrdenadas.length; i++) {
      const ad = linhasFiltradasOrdenadas[i];
      setBulkProgress({ atual: i + 1, total: linhasFiltradasOrdenadas.length, titulo: ad.titulo });
      setAtualizandoIds((prev) => new Set(prev).add(ad.id));
      try {
        await api.updateAd(user.id, ad.id);
      } catch (e) {
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
        <button
          onClick={handleAtualizarTodos}
          disabled={bulkUpdating || ads.length === 0}
          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm whitespace-nowrap"
        >
          {bulkUpdating
            ? `Atualizando ${bulkProgress?.atual}/${bulkProgress?.total}...`
            : 'Atualizar todos'}
        </button>
      </div>

      {bulkUpdating && bulkProgress && (
        <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-700">
          Atualizando agora: <span className="font-medium">{bulkProgress.titulo}</span> — os
          demais anúncios continuam na fila e serão atualizados um por um.
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
              <th colSpan={4}></th>
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
                  <td className="px-4 py-3 font-medium truncate max-w-xs">{ad.titulo}</td>
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
                        onClick={() => handleAtualizarUm(ad)}
                        disabled={atualizando || bulkUpdating}
                        className="text-green-600 hover:underline text-xs font-medium disabled:opacity-50 disabled:no-underline"
                        title="Atualizar apenas este anúncio"
                      >
                        {atualizando ? 'Atualizando...' : '🔄 Atualizar'}
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
      />
    </div>
  );
}
