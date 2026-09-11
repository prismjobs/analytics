import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setInfo('Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">📊 Analytics</h1>
          <p className="text-gray-600 text-sm mt-2">Análise de anúncios Vivastreet</p>
        </div>

        <form onSubmit={modoRecuperar ? handleRecuperarSenha : handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          {!modoRecuperar && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          {info && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{info}</div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition"
            disabled={loading}
          >
            {loading ? 'Processando...' : modoRecuperar ? 'Enviar link de recuperação' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setModoRecuperar(!modoRecuperar);
              setError('');
              setInfo('');
            }}
            className="text-blue-600 hover:underline text-sm"
          >
            {modoRecuperar ? '← Voltar para login' : 'Esqueci minha senha'}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            O acesso a este sistema é apenas por convite. Se você precisa de
            uma conta, entre em contato com o administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
