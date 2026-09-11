import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, ativo, email')
      .eq('id', userId)
      .single();

    // Se não existe user_profiles para este usuário (ex: conta muito antiga,
    // criada antes da migration 002), trata como não-ativo por segurança —
    // é melhor pedir pro admin liberar do que deixar passar sem controle.
    if (error || !data) {
      setProfile({ role: 'user', ativo: false, email: null, semPerfil: true });
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, refetch: fetchProfile };
}
