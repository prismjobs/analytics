import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// `supabase.channel(topic)` devolve um canal já existente quando o topic
// repete, e chamar `.on('postgres_changes', ...)` num canal que já passou pelo
// `subscribe()` lança erro. Este hook roda em mais de um componente ao mesmo
// tempo (Dashboard e AddAdModal), então o topic precisa ser exclusivo de cada
// subscription — inclusive entre remontagens, porque o canal antigo só sai do
// registro do client quando o servidor confirma a saída, de forma assíncrona.
let proximoCanal = 0;

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

  // Mantém o fetch atual num ref para que o efeito abaixo dependa só do
  // userId — assim uma nova identidade de fetchMonitoramentos não derruba e
  // recria a subscription.
  const fetchRef = useRef(fetchMonitoramentos);
  useEffect(() => {
    fetchRef.current = fetchMonitoramentos;
  }, [fetchMonitoramentos]);

  useEffect(() => {
    if (!userId) return;
    fetchRef.current();

    const canal = supabase
      .channel(`monitoramentos:${userId}:${++proximoCanal}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monitoramentos', filter: `user_id=eq.${userId}` },
        () => fetchRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId]);

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
