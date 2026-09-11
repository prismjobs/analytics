import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMonitoramentos(userId) {
  const [monitoramentos, setMonitoramentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitoramentos = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('monitoramentos')
      .select('*')
      .eq('user_id', userId)
      .order('data_criacao', { ascending: true });

    if (!error) setMonitoramentos(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchMonitoramentos();

    const subscription = supabase
      .channel(`monitoramentos:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monitoramentos', filter: `user_id=eq.${userId}` },
        () => fetchMonitoramentos()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [userId, fetchMonitoramentos]);

  const criar = async ({ nome, descricao, cor }) => {
    const { data, error } = await supabase
      .from('monitoramentos')
      .insert([{ user_id: userId, nome, descricao, cor: cor || '#2563eb' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const editar = async (id, campos) => {
    const { error } = await supabase.from('monitoramentos').update(campos).eq('id', id);
    if (error) throw error;
  };

  const excluir = async (id) => {
    // Os anúncios deste monitoramento não são apagados — ficam com
    // monitoramento_id = null (ON DELETE SET NULL), reaparecendo na aba
    // "Sem grupo" em vez de sumirem.
    const { error } = await supabase.from('monitoramentos').delete().eq('id', id);
    if (error) throw error;
  };

  return { monitoramentos, loading, criar, editar, excluir, refetch: fetchMonitoramentos };
}
