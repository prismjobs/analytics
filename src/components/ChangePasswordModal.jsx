import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function ChangePasswordModal({ isOpen, onClose }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (novaSenha.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (novaSenha !== confirmacao) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setSucesso(true);
      setNovaSenha('');
      setConfirmacao('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSucesso(false);
    setError('');
    setNovaSenha('');
    setConfirmacao('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-6">Alterar minha senha</h2>

        {sucesso ? (
          <div>
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
              Senha alterada com sucesso!
            </div>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                minLength={6}
                required
                disabled={loading}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Confirme a nova senha</label>
              <input
                type="password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                minLength={6}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
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
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
