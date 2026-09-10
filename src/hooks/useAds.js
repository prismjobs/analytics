import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    if (!userId) return;

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
  }, [userId, fetchAds]);

  return { ads, loading, error, refetch: fetchAds };
}
