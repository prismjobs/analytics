-- Corrige a view ad_performance, que estava sem a coluna data_ultima_atualizacao.
-- Rode isso no SQL Editor do Supabase (não precisa apagar nada, só substitui a view).

CREATE OR REPLACE VIEW ad_performance AS
SELECT
  a.id,
  a.user_id,
  a.titulo,
  a.localizacao,
  a.genero,
  a.idade,
  a.tipo_anuncio,
  a.visitors_atual,
  (SELECT COUNT(*) FROM ad_snapshots WHERE ad_id = a.id) as snapshots_count,
  (SELECT visitors FROM ad_snapshots WHERE ad_id = a.id ORDER BY data_snapshot DESC LIMIT 1) as visitors_ultimo,
  (SELECT visitors FROM ad_snapshots WHERE ad_id = a.id ORDER BY data_snapshot ASC LIMIT 1) as visitors_primeiro,
  CASE
    WHEN (SELECT COUNT(*) FROM ad_snapshots WHERE ad_id = a.id) > 1
    THEN (
      (SELECT visitors FROM ad_snapshots WHERE ad_id = a.id ORDER BY data_snapshot DESC LIMIT 1) -
      (SELECT visitors FROM ad_snapshots WHERE ad_id = a.id ORDER BY data_snapshot ASC LIMIT 1)
    ) / NULLIF((SELECT COUNT(*) FROM ad_snapshots WHERE ad_id = a.id) - 1, 0)
    ELSE 0
  END as visitors_por_dia,
  (SELECT photo_count FROM ad_structural_features WHERE ad_id = a.id ORDER BY data_calculo DESC LIMIT 1) as photo_count,
  (SELECT service_count FROM ad_structural_features WHERE ad_id = a.id ORDER BY data_calculo DESC LIMIT 1) as service_count,
  (SELECT desc_length FROM ad_text_features WHERE ad_id = a.id ORDER BY data_calculo DESC LIMIT 1) as desc_length,
  (SELECT emoji_count FROM ad_text_features WHERE ad_id = a.id ORDER BY data_calculo DESC LIMIT 1) as emoji_count,
  a.data_publicacao,
  a.data_ultima_atualizacao
FROM ads a;
