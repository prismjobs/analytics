import React, { useState, useEffect } from 'react';

const CORES = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#6b7280'];

export function MonitoramentoModal({ isOpen, onClose, onSave, monitoramentoEditando }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (monitoramentoEditando) {
      setNome(monitoramentoEditando.nome);
      setDescricao(monitoramentoEditando.descricao || '');
      setCor(monitoramentoEditando.cor || CORES[0]);
    } else {
      setNome('');
      setDescricao('');
      setCor(CORES[0]);
    }
    setError('');
  }, [monitoramentoEditando, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!nome.trim()) {
      setError('Dê um nome ao monitoramento');
      return;
    }
    setLoading(true);
    try {
      await onSave({ nome: nome.trim(), descricao: descricao.trim(), cor });
      onClose();
    } catch (err) {
      setError(err.message.includes('duplicate') ? 'Já existe um monitoramento com esse nome' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold mb-4">
          {monitoramentoEditando ? 'Editar monitoramento' : 'Novo monitoramento'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Londres - Outcall"
              className="w-full px-3 py-2 border rounded-lg"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: concorrentes diretos na região central"
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Cor da aba</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${cor === c ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
