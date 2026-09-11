import React, { useState, useMemo } from 'react';
import { AdTable } from './AdTable';
import { AddAdModal } from './AddAdModal';
import { ChartsPanel } from './ChartsPanel';
import { MonitoramentoTabs } from './MonitoramentoTabs';
import { UserMenu } from './UserMenu';
import { AdminPanel } from './AdminPanel';
import { useAuth } from '../hooks/useAuth';
import { useAds } from '../hooks/useAds';
import { useMonitoramentos } from '../hooks/useMonitoramentos';

export function Dashboard({ profile, onLogout }) {
  const { user } = useAuth();
  const userId = user?.id;

  const { ads, error: adsError, refetch: refetchAds } = useAds(userId);
  const {
    monitoramentos,
    criar: criarMonitoramento,
    editar: editarMonitoramento,
    excluir: excluirMonitoramento
  } = useMonitoramentos(userId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [monitoramentoAtivoId, setMonitoramentoAtivoId] = useState('todos');

  const contagemPorMonitoramento = useMemo(() => {
    const contagem = {};
    ads.forEach((ad) => {
      if (ad.monitoramento_id) {
        contagem[ad.monitoramento_id] = (contagem[ad.monitoramento_id] || 0) + 1;
      }
    });
    return contagem;
  }, [ads]);

  const adsDaAbaAtiva = useMemo(() => {
    if (monitoramentoAtivoId === 'todos') return ads;
    if (monitoramentoAtivoId === 'sem-grupo') return ads.filter((a) => !a.monitoramento_id);
    return ads.filter((a) => a.monitoramento_id === monitoramentoAtivoId);
  }, [ads, monitoramentoAtivoId]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">📊 Anúncio Analytics</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Adicionar anúncio
            </button>
            <UserMenu
              email={profile?.email || user?.email}
              isAdmin={profile?.role === 'admin'}
              onLogout={onLogout}
              onOpenAdmin={() => setShowAdminPanel(true)}
            />
          </div>
        </div>
      </nav>

      <MonitoramentoTabs
        monitoramentos={monitoramentos}
        monitoramentoAtivoId={monitoramentoAtivoId}
        onSelecionar={setMonitoramentoAtivoId}
        onCriar={criarMonitoramento}
        onEditar={editarMonitoramento}
        onExcluir={excluirMonitoramento}
        contagemPorMonitoramento={contagemPorMonitoramento}
      />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {adsError && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            Erro ao carregar anúncios: {adsError}
          </div>
        )}

        <AdTable ads={adsDaAbaAtiva} />

        <ChartsPanel ads={adsDaAbaAtiva} />
      </div>

      <AddAdModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={refetchAds}
        monitoramentoSugeridoId={monitoramentoAtivoId}
      />

      {showAdminPanel && (
        <AdminPanel currentUserId={userId} onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}
