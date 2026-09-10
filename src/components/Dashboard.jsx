import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdTable } from './AdTable';
import { AddAdModal } from './AddAdModal';
import { useAuth } from '../hooks/useAuth';
import { useAds } from '../hooks/useAds';

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { ads, error: adsError, refetch: refetchAds } = useAds(userId);
  const [analytics, setAnalytics] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [segmento, setSegmento] = useState('all');

  useEffect(() => {
    if (userId) loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAdAdded = () => {
    refetchAds();
    loadAnalytics();
  };

  const handleUpdateSnapshots = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await fetch('/.netlify/functions/updateSnapshots', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      await refetchAds();
      await loadAnalytics();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!userId) return;
    try {
      const response = await fetch('/.netlify/functions/analytics', {
        method: 'POST',
        body: JSON.stringify({ userId, segmento })
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  };

  // Prepara dados para gráfico de correlações
  const correlationChartData = analytics?.correlacoes
    ?.sort((a, b) => Math.abs(b.correlation_coefficient) - Math.abs(a.correlation_coefficient))
    .slice(0, 10)
    .map(c => ({
      feature: c.feature_name.replace(/_/g, ' '),
      r: parseFloat(c.correlation_coefficient.toFixed(2)),
      pValue: c.p_value
    })) || [];

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
        {/* Tabela de anúncios */}
        <div className="mb-8">
          <AdTable ads={ads} onRefresh={handleUpdateSnapshots} loading={loading} />
        </div>

        {/* Filtro de segmento */}
        {ads.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-4">
            <label className="block text-sm font-medium mb-2">Filtrar por:</label>
            <select
              value={segmento}
              onChange={(e) => {
                setSegmento(e.target.value);
                loadAnalytics();
              }}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">Todos os anúncios</option>
              {[...new Set(ads.map(a => a.regiao))].map(regiao => (
                <option key={regiao} value={`regiao_${regiao}`}>
                  {regiao}
                </option>
              ))}
              {[...new Set(ads.map(a => a.tipo_anuncio))].map(tipo => (
                <option key={tipo} value={`tipo_${tipo}`}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Gráficos de análise */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Correlações */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4">Top 10 Correlações com Visitors</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={correlationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="r" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparação Top vs Bottom */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4">Top 25% vs Bottom 25%</h3>
              <div className="text-sm space-y-2 max-h-96 overflow-y-auto">
                {analytics.comparacao_top_vs_bottom?.slice(0, 8).map(comp => (
                  <div key={comp.feature_name} className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">{comp.feature_name}</span>
                    <span className="font-semibold">
                      +{comp.percentual_diferenca}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Estatísticas descritivas */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4">Estatísticas Descritivas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Feature</th>
                      <th className="px-3 py-2 text-center">Média</th>
                      <th className="px-3 py-2 text-center">Mediana</th>
                      <th className="px-3 py-2 text-center">Desvio</th>
                      <th className="px-3 py-2 text-center">Mín</th>
                      <th className="px-3 py-2 text-center">Máx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics.estatisticas || {}).map(([name, stats]) => (
                      <tr key={name} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{name}</td>
                        <td className="px-3 py-2 text-center">{stats?.media.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{stats?.mediana.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{stats?.desvio_padrao.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{stats?.minimo}</td>
                        <td className="px-3 py-2 text-center">{stats?.maximo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <AddAdModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdded={handleAdAdded}
      />
    </div>
  );
}
