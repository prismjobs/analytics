import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function AdminPanel({ currentUserId, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const lista = await api.listUsers();
      setUsuarios(lista);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const executar = async (acao, usuario, extra) => {
    setBusyId(usuario.id);
    try {
      await api.manageUser(acao, usuario.id, extra);
      await carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleBloquear = (u) => {
    const acao = u.ativo ? 'bloquear' : 'desbloquear';
    if (u.ativo && !window.confirm(`Bloquear o acesso de ${u.email}?`)) return;
    executar(acao, u);
  };

  const handleResetarSenha = (u) => {
    const novaSenha = window.prompt(`Nova senha para ${u.email} (mínimo 6 caracteres):`);
    if (!novaSenha) return;
    if (novaSenha.length < 6) {
      alert('A senha precisa ter ao menos 6 caracteres');
      return;
    }
    executar('resetarSenha', u, { novaSenha });
  };

  const handleRole = (u) => {
    const novoRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Tornar ${u.email} ${novoRole === 'admin' ? 'administrador' : 'usuário comum'}?`)) return;
    executar('definirRole', u, { novoRole });
  };

  const handleExcluir = (u) => {
    if (
      !window.confirm(
        `Excluir definitivamente ${u.email}?\n\nIsso apaga também TODOS os anúncios, monitoramentos e histórico cadastrados por este usuário. Não pode ser desfeito.`
      )
    )
      return;
    executar('excluir', u);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">🛡️ Administração de usuários</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              {usuarios.length} usuário(s) cadastrado(s)
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + Novo usuário
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-center">Role</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-left">Último login</th>
                    <th className="px-3 py-2 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">
                        {u.email}
                        {u.id === currentUserId && (
                          <span className="ml-2 text-xs text-gray-400">(você)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {u.ativo ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-BR') : 'Nunca'}
                      </td>
                      <td className="px-3 py-2">
                        {u.id === currentUserId ? (
                          <span className="text-xs text-gray-400">
                            use o menu do usuário para alterar sua senha
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleBloquear(u)}
                              disabled={busyId === u.id}
                              className="text-xs text-orange-600 hover:underline disabled:opacity-50"
                            >
                              {u.ativo ? 'Bloquear' : 'Desbloquear'}
                            </button>
                            <button
                              onClick={() => handleResetarSenha(u)}
                              disabled={busyId === u.id}
                              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                            >
                              Resetar senha
                            </button>
                            <button
                              onClick={() => handleRole(u)}
                              disabled={busyId === u.id}
                              className="text-xs text-purple-600 hover:underline disabled:opacity-50"
                            >
                              {u.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                            </button>
                            <button
                              onClick={() => handleExcluir(u)}
                              disabled={busyId === u.id}
                              className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.createUser(email, senha);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold mb-4">Novo usuário</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              disabled={loading}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Senha inicial</label>
            <input
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="mínimo 6 caracteres"
              minLength={6}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Compartilhe esta senha com a pessoa por um canal seguro. Ela pode
              trocá-la depois pelo próprio menu de usuário.
            </p>
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
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
