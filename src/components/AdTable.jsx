import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdDetailModal } from './AdDetailModal';

export function AdTable({ ads, onRefresh, loading }) {
  const [selectedAdId, setSelectedAdId] = useState(null);

  // Recalcula a partir de `ads` sempre que a lista mudar, para que o modal
  // reflita imediatamente dados novos após um "Atualizar visitors"
  const selectedAd = ads.find((a) => a.id === selectedAdId) || null;

  const getVisitorTrend = (ad) => {
    const snapshots = [...(ad.snapshots || [])].sort(
      (a, b) => new Date(a.data_snapshot) - new Date(b.data_snapshot)
    );
    if (snapshots.length < 2) return { label: '—', className: 'text-gray-400' };

    const atual = snapshots[snapshots.length - 1].visitors;
    const anterior = snapshots[snapshots.length - 2].visitors;
    const trend = atual - anterior;

    if (trend > 0) return { label: `↑ +${trend}`, className: 'text-green-600 font-medium' };
    if (trend < 0) return { label: `↓ ${trend}`, className: 'text-red-600 font-medium' };
    return { label: '→ 0', className: 'text-gray-500' };
  };

  const getSnapshotCount = (ad) => (ad.snapshots || []).length;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Meus anúncios ({ads.length})</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Atualizando...' : 'Atualizar visitors'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Título</th>
              <th className="px-4 py-3 text-left font-semibold">Região</th>
              <th className="px-4 py-3 text-left font-semibold">Tipo</th>
              <th className="px-4 py-3 text-center font-semibold">Visitors</th>
              <th className="px-4 py-3 text-center font-semibold">Trend</th>
              <th className="px-4 py-3 text-center font-semibold">Capturas</th>
              <th className="px-4 py-3 text-left font-semibold">Atualizado</th>
              <th className="px-4 py-3 text-left font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => {
              const trend = getVisitorTrend(ad);
              return (
                <tr key={ad.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium truncate max-w-xs">
                    {ad.titulo}
                  </td>
                  <td className="px-4 py-3">
                    {ad.regiao || ad.localizacao || (
                      <span className="text-gray-400 text-xs">
                        não capturado — clique em "Atualizar visitors"
                      </span>
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
                  <td className="px-4 py-3 text-center font-semibold">
                    {ad.visitors_atual}
                  </td>
                  <td className={`px-4 py-3 text-center ${trend.className}`}>
                    {trend.label}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {getSnapshotCount(ad)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {ad.data_ultima_atualizacao
                      ? formatDistanceToNow(new Date(ad.data_ultima_atualizacao), {
                          addSuffix: true,
                          locale: ptBR
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedAdId(ad.id)}
                      className="text-blue-600 hover:underline text-xs font-medium mr-3"
                    >
                      Detalhes
                    </button>
                    <a
                      href={ad.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:underline text-xs"
                    >
                      Ver original
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ads.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          Nenhum anúncio cadastrado ainda.
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
