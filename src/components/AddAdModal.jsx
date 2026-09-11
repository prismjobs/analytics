import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMonitoramentos } from '../hooks/useMonitoramentos';

export function AddAdModal({ isOpen, onClose, onAdded, monitoramentoSugeridoId }) {
  const [url, setUrl] = useState('');
  const [monitoramentoId, setMonitoramentoId] = useState('');
  const [novoNomeGrupo, setNovoNomeGrupo] = useState('');
  const [criandoGrupo, setCriandoGrupo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { monitoramentos, criar: criarMonitoramento } = useMonitoramentos(user?.id);

  // Ao abrir o modal, pré-seleciona: o monitoramento da aba em que o usuário
  // estava (se houver) ou o primeiro disponível na lista
  useEffect(() => {
    if (!isOpen) return;
    if (monitoramentoSugeridoId && monitoramentoSugeridoId !== 'todos' && monitoramentoSugeridoId !== 'sem-grupo') {
      setMonitoramentoId(monitoramentoSugeridoId);
    } else if (monitoramentos.length > 0 && !monitoramentoId) {
      setMonitoramentoId(monitoramentos[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, monitoramentoSugeridoId, monitoramentos]);

  if (!isOpen) return null;

  const handleCriarGrupo = async () => {
    if (!novoNomeGrupo.trim()) return;
    try {
      const novo = await criarMonitoramento({ nome: novoNomeGrupo.trim() });
      setMonitoramentoId(novo.id);
      setNovoNomeGrupo('');
      setCriandoGrupo(false);
    } catch (err) {
      setError(err.message.includes('duplicate') ? 'Já existe um monitoramento com esse nome' : err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/parseAd', {
        method: 'POST',
        body: JSON.stringify({
          url: url.trim(),
          userId: user.id,
          monitoramentoId: monitoramentoId || null
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6">Adicionar novo anúncio</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Monitoramento</label>

            {!criandoGrupo ? (
              <div className="flex gap-2">
                <select
                  value={monitoramentoId}
                  onChange={(e) => setMonitoramentoId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Sem grupo</option>
                  {monitoramentos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCriandoGrupo(true)}
                  className="px-3 py-2 border rounded-lg text-sm text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                  disabled={loading}
                >
                  + Novo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoNomeGrupo}
                  onChange={(e) => setNovoNomeGrupo(e.target.value)}
                  placeholder="Nome do novo monitoramento"
                  className="flex-1 px-3 py-2 border rounded-lg"
                  autoFocus
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleCriarGrupo}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  disabled={loading}
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => setCriandoGrupo(false)}
                  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Organize os anúncios em grupos (ex: por região, por concorrente) para
              navegar entre eles depois nas abas do painel.
            </p>
          </div>

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
