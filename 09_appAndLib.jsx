// ============================================
// src/App.jsx
// ============================================

import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Dashboard />;
}

export default App;

// ============================================
// src/pages/LoginPage.jsx
// ============================================

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        setError('Verifique seu email para confirmar a conta');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
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

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition"
            disabled={loading}
          >
            {loading ? 'Processando...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {isSignUp ? 'Já tem conta? ' : 'Não tem conta? '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              {isSignUp ? 'Entrar' : 'Cadastrar'}
            </button>
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Este sistema coleta dados públicos de anúncios para análise estatística.
            Todos os dados são privados e criptografados.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// src/lib/supabase.ts
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltam variáveis de ambiente Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// src/lib/api.ts
// ============================================

export const api = {
  async parseAd(url: string, userId: string) {
    const response = await fetch('/.netlify/functions/parseAd', {
      method: 'POST',
      body: JSON.stringify({ url, userId })
    });
    return response.json();
  },

  async updateSnapshots(userId: string) {
    const response = await fetch('/.netlify/functions/updateSnapshots', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return response.json();
  },

  async getAnalytics(userId: string, segmento = 'all') {
    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      body: JSON.stringify({ userId, segmento })
    });
    return response.json();
  },

  async getAds(userId: string) {
    const response = await fetch('/.netlify/functions/getAds', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    return response.json();
  }
};

// ============================================
// src/hooks/useAuth.ts
// ============================================

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Escuta mudanças de autenticação
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, loading, logout };
}

// ============================================
// src/hooks/useAds.ts
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAds(userId: string) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchAds = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('ad_performance')
          .select('*')
          .eq('user_id', userId)
          .order('data_ultima_atualizacao', { ascending: false });

        if (err) throw err;
        setAds(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();

    // Subscribe a mudanças em tempo real
    const subscription = supabase
      .channel(`ads:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ads',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchAds(); // Recarrega quando houver mudanças
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { ads, loading, error, refetch: () => {} };
}

// ============================================
// src/index.jsx
// ============================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ============================================
// public/index.html
// ============================================

/*
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Sistema de análise de anúncios Vivastreet" />
    <title>Analytics - Anúncios Vivastreet</title>
  </head>
  <body>
    <noscript>Você precisa habilitar JavaScript para usar este sistema.</noscript>
    <div id="root"></div>
  </body>
</html>
*/
