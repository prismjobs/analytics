-- ============================================
-- MIGRATION 003: Telefone do anúncio + status "fora do ar"
-- Rode este script inteiro no SQL Editor do Supabase
-- ============================================
--
-- CONTEXTO — por que esta migration existe:
--
-- 1. TELEFONE: a página do anúncio expõe o número no atributo
--    data-phone-number (ex: <span class="phone_link" id="phone-button-dt"
--    data-phone-number="+44...">). Agora capturamos esse dado no cadastro e
--    ele também pode ser recapturado em lote pelo botão "Atualizar telefones".
--
-- 2. FORA DO AR: quando um anúncio termina, a página sai do ar (ou volta uma
--    página genérica, sem título/visitantes). Antes, a atualização gravava
--    esse "vazio" em cima do registro e o anúncio perdia título, descrição,
--    fotos, preços e serviços. Agora o sistema detecta a indisponibilidade,
--    NÃO grava nada em cima dos dados já coletados e só marca o anúncio como
--    offline — o histórico de visitantes fica preservado para análise.

ALTER TABLE ads ADD COLUMN IF NOT EXISTS telefone VARCHAR(50);
ALTER TABLE ads ADD COLUMN IF NOT EXISTS telefone_capturado_em TIMESTAMP;

ALTER TABLE ads ADD COLUMN IF NOT EXISTS offline BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS offline_desde TIMESTAMP;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS ultima_verificacao TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_ads_offline ON ads(offline);

-- A view de performance passa a expor telefone e status, para relatórios
-- e para a tela de analytics.
CREATE OR REPLACE VIEW ad_performance AS
SELECT
  a.id,
  a.user_id,
  a.titulo,
  a.localizacao,
  a.regiao,
  a.genero,
  a.idade,
  a.tipo_anuncio,
  a.telefone,
  a.offline,
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
