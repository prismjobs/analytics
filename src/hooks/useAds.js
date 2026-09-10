import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAds(userId) {
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
