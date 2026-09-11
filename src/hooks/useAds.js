import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Topic exclusivo por subscription: canais são reaproveitados por topic, e
// registrar 'postgres_changes' num canal já inscrito lança erro. Mesmo motivo
// descrito em useMonitoramentos.js.
let proximoCanal = 0;

export function useAds(userId) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAds = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      // Traz num único request: dados do anúncio + histórico de snapshots +
      // fotos + serviços + preços. Isso é o que alimenta tanto a tabela
      // quanto a tela de detalhes/histórico de cada anúncio.
      const { data, error: err } = await supabase
        .from('ads')
        .select(`
          *,
          snapshots:ad_snapshots(visitors, data_snapshot),
          fotos:ad_photos(url_foto, ordem),
          servicos:ad_services(nome_servico, incluido, preco_extra),
          precos:ad_rates(duracao, preco_incall, preco_outcall)
        `)
        .eq('user_id', userId)
        .order('data_ultima_atualizacao', { ascending: false })
        .order('data_snapshot', { foreignTable: 'ad_snapshots', ascending: true })
        .order('ordem', { foreignTable: 'ad_photos', ascending: true });

      if (err) throw err;
      setAds(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // O fetch vive num ref para o efeito depender apenas do userId, sem
  // recriar a subscription a cada nova identidade de fetchAds.
  const fetchRef = useRef(fetchAds);
  useEffect(() => {
    fetchRef.current = fetchAds;
  }, [fetchAds]);

  useEffect(() => {
    if (!userId) return;

    fetchRef.current();

    // Subscribe a mudanças em tempo real
    const canal = supabase
      .channel(`ads:${userId}:${++proximoCanal}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ads',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchRef.current(); // Recarrega quando houver mudanças
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId]);

  return { ads, loading, error, refetch: fetchAds };
}
