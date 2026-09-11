import React from 'react';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.id);

  if (authLoading || (user && profileLoading)) {
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

  // Login válido no Supabase Auth não é suficiente — a conta também precisa
  // estar marcada como ativa em user_profiles (aprovada por um admin).
  if (!profile?.ativo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold mb-2">Acesso pendente</h1>
          <p className="text-gray-600 text-sm mb-6">
            Sua conta ({user.email}) ainda não foi liberada por um
            administrador, ou foi desativada. Entre em contato para
            solicitar acesso.
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard profile={profile} onLogout={logout} />;
}

export default App;
