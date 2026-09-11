import React, { useState } from 'react';
import { AdTable } from './AdTable';
import { AddAdModal } from './AddAdModal';
import { useAuth } from '../hooks/useAuth';
import { useAds } from '../hooks/useAds';

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { ads, error: adsError, refetch: refetchAds } = useAds(userId);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">📊 Anúncio Analytics</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Adicionar anúncio
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4">
        {adsError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            Erro ao carregar anúncios: {adsError}
          </div>
        )}

        {/* Tabela de anúncios: ordenação, filtros, crescimento, atualizar/excluir */}
        <AdTable ads={ads} />

        {/*
          Os gráficos de correlação/estatísticas que existiam aqui foram
          removidos por não estarem entregando análises úteis. Quando
          tivermos volume suficiente de dados capturados (histórico real de
          vários anúncios ao longo de várias semanas), construímos gráficos
          novos que façam sentido para o que você precisa decidir.
        */}
      </div>

      <AddAdModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdded={refetchAds}
      />
    </div>
  );
}
