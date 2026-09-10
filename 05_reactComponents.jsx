// ============================================
// src/components/AddAdModal.jsx
// ============================================

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function AddAdModal({ isOpen, onClose, onAdded }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/parseAd', {
        method: 'POST',
        body: JSON.stringify({
          url: url.trim(),
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao adicionar anúncio');
      }

      onAdded(data);
      setUrl('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6">Adicionar novo anúncio</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              URL do anúncio Vivastreet
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.vivastreet.co.uk/escort/..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Cole a URL completa do anúncio do Vivastreet
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// src/components/AdTable.jsx
// ============================================

import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export function AdTable({ ads, onRefresh, loading }) {
  const getVisitorTrend = (ad) => {
    const snapshots = ad.snapshots || [];
    if (snapshots.length < 2) return '—';
    
    const atual = snapshots[snapshots.length - 1].visitors;
    const anterior = snapshots[snapshots.length - 2].visitors;
    const trend = atual - anterior;
    
    if (trend > 0) return `↑ +${trend}`;
    if (trend < 0) return `↓ ${trend}`;
    return '→ 0';
  };

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
              <th className="px-4 py-3 text-left font-semibold">Atualizado</th>
              <th className="px-4 py-3 text-left font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium truncate max-w-xs">
                  {ad.titulo}
                </td>
                <td className="px-4 py-3">{ad.regiao}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {ad.tipo_anuncio}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-semibold">
                  {ad.visitors_atual}
                </td>
                <td className="px-4 py-3 text-center">
                  {getVisitorTrend(ad)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDistanceToNow(new Date(ad.data_ultima_atualizacao), {
                    addSuffix: true,
                    locale: 'pt-BR'
                  })}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={ad.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Ver
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ads.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          Nenhum anúncio cadastrado ainda.
        </div>
      )}
    </div>
  );
}

// ============================================
// src/components/CorrelationChart.jsx
// ============================================

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';

export function CorrelationChart({ data, featureName, visitors }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Sem dados para exibir
      </div>
    );
  }

  // Prepara dados para scatter chart
  const scatterData = data.map((ad, idx) => ({
    x: ad[featureName] || 0,
    y: visitors[idx] || 0,
    titulo: ad.titulo || 'Sem título'
  }));

  // Calcula correlação
  const meanX = scatterData.reduce((sum, d) => sum + d.x, 0) / scatterData.length;
  const meanY = scatterData.reduce((sum, d) => sum + d.y, 0) / scatterData.length;

  let numerador = 0, denomX = 0, denomY = 0;
  scatterData.forEach(d => {
    const dx = d.x - meanX;
    const dy = d.y - meanY;
    numerador += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  });

  const r = Math.sqrt(denomX * denomY) > 0
    ? (numerador / Math.sqrt(denomX * denomY)).toFixed(3)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-2">{featureName} vs Visitors</h3>
      <p className="text-sm text-gray-600 mb-4">
        Correlação de Pearson: <span className="font-semibold">{r}</span>
      </p>

      <div className="flex justify-center">
        <ScatterChart width={500} height={300} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={featureName} />
          <YAxis type="number" dataKey="y" name="Visitors" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload?.[0]) {
                return (
                  <div className="bg-white p-2 border rounded shadow-lg text-xs">
                    <p>{payload[0].payload.titulo}</p>
                    <p>{featureName}: {payload[0].value}</p>
                    <p>Visitors: {payload[0].payload.y}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter name={featureName} data={scatterData} fill="#8884d8" />
        </ScatterChart>
      </div>
    </div>
  );
}

// ============================================
// src/components/Dashboard.jsx
// ============================================

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AdTable } from './AdTable';
import { AddAdModal } from './AddAdModal';

export function Dashboard() {
  const [ads, setAds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [segmento, setSegmento] = useState('all');

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      const response = await fetch('/.netlify/functions/getAds');
      const data = await response.json();
      setAds(data.ads || []);
    } catch (error) {
      console.error('Erro ao carregar anúncios:', error);
    }
  };

  const handleAdAdded = (newAd) => {
    setAds([...ads, newAd]);
    loadAnalytics();
  };

  const handleUpdateSnapshots = async () => {
    setLoading(true);
    try {
      await fetch('/.netlify/functions/updateSnapshots', {
        method: 'POST',
        body: JSON.stringify({ userId: 'current-user-id' })
      });
      await loadAds();
      await loadAnalytics();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/.netlify/functions/analytics', {
        method: 'POST',
        body: JSON.stringify({ userId: 'current-user-id', segmento })
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
