-- ============================================
-- SCHEMA PARA ANÁLISE DE ANÚNCIOS VIVASTREET
-- Supabase PostgreSQL
-- ============================================

-- Users (criado automaticamente pelo Supabase Auth, referenciamos aqui)
-- postgres.auth.users

-- Tabela principal de anúncios
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site VARCHAR(50) NOT NULL DEFAULT 'vivastreet', -- vivastreet, etc
  ad_id_externo VARCHAR(255) NOT NULL, -- ID do site (ex: 348360534)
  url TEXT NOT NULL,
  titulo VARCHAR(500),
  descricao TEXT,
  descricao_plain TEXT, -- sem HTML, só texto
  
  -- Dados estruturados
  localizacao VARCHAR(255),
  regiao VARCHAR(100),
  tipo_anuncio VARCHAR(50), -- Agency, Independent
  genero VARCHAR(50),
  idade INTEGER,
  etnia VARCHAR(100),
  idiomas VARCHAR(255),
  publico_alvo VARCHAR(255), -- Men, Women, Couples, etc
  
  -- Datas
  data_publicacao TIMESTAMP,
  membro_desde TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT NOW(),
  
  -- Visitors atual (última snapshot)
  visitors_atual INTEGER DEFAULT 0,
  data_ultima_atualizacao TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, site, ad_id_externo)
);

CREATE INDEX idx_ads_user_id ON ads(user_id);
CREATE INDEX idx_ads_site ON ads(site);

-- Fotos do anúncio
CREATE TABLE ad_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  url_foto TEXT NOT NULL,
  ordem INTEGER,
  data_adicionada TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_photos_ad_id ON ad_photos(ad_id);

-- Serviços oferecidos
CREATE TABLE ad_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  nome_servico VARCHAR(255) NOT NULL,
  incluido BOOLEAN DEFAULT TRUE,
  preco_extra DECIMAL(10, 2),
  data_adicionada TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_services_ad_id ON ad_services(ad_id);

-- Tabela de preços (incall/outcall por duração)
CREATE TABLE ad_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  duracao VARCHAR(50), -- "1 hour", "30 mins", "2 hours", "overnight", etc
  preco_incall DECIMAL(10, 2),
  preco_outcall DECIMAL(10, 2),
  data_adicionada TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_rates_ad_id ON ad_rates(ad_id);

-- Snapshots de dados históricos (coleta periódica)
CREATE TABLE ad_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  visitors INTEGER,
  data_snapshot TIMESTAMP DEFAULT NOW(),
  last_updated_site TIMESTAMP, -- quando o site diz que foi atualizado pela última vez
  UNIQUE(ad_id, data_snapshot)
);

CREATE INDEX idx_ad_snapshots_ad_id ON ad_snapshots(ad_id);
CREATE INDEX idx_ad_snapshots_data ON ad_snapshots(data_snapshot);

-- Features de texto (cache de características extraídas)
CREATE TABLE ad_text_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  
  -- Tamanho e estrutura
  desc_length INTEGER,
  word_count INTEGER,
  paragraph_count INTEGER,
  
  -- Símbolos e caracteres
  emoji_count INTEGER,
  number_count INTEGER,
  currency_count INTEGER,
  caps_count INTEGER,
  hashtag_count INTEGER,
  
  -- Sentimento e legibilidade
  sentiment_score DECIMAL(3, 2), -- -1 a +1
  readability_grade DECIMAL(4, 2), -- Flesch-Kincaid
  
  -- Perspectiva narrativa
  first_person_count INTEGER,
  second_person_count INTEGER,
  plural_count INTEGER,
  
  -- Partes da fala (POS)
  adjective_count INTEGER,
  verb_count INTEGER,
  
  -- Vocabulário
  vocab_diversity DECIMAL(3, 2), -- unique_words / total_words
  
  -- Linguagem específica
  exclusivity_mentions INTEGER, -- "premium", "exclusive", etc
  
  data_calculo TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_text_features_ad_id ON ad_text_features(ad_id);

-- Features estruturais do anúncio
CREATE TABLE ad_structural_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  
  photo_count INTEGER,
  price_table_completeness DECIMAL(3, 2), -- 0 a 1
  service_count INTEGER,
  premium_services_count INTEGER,
  days_since_update INTEGER,
  days_active INTEGER,
  ad_age_days INTEGER,
  
  data_calculo TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_structural_features_ad_id ON ad_structural_features(ad_id);

-- Correlações calculadas (cache)
CREATE TABLE ad_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  feature_name VARCHAR(255), -- "desc_length", "emoji_count", etc
  correlation_coefficient DECIMAL(4, 3), -- Pearson r
  p_value DECIMAL(10, 8),
  sample_size INTEGER,
  
  -- Para segmentação
  segmento VARCHAR(100), -- "all", "regiao_london", "tipo_independent", etc
  
  data_calculo TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_correlations_user_id ON ad_correlations(user_id);
CREATE INDEX idx_ad_correlations_feature ON ad_correlations(feature_name);

-- Estatísticas descritivas (por feature)
CREATE TABLE ad_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  feature_name VARCHAR(255),
  media DECIMAL(12, 2),
  mediana DECIMAL(12, 2),
  desvio_padrao DECIMAL(12, 2),
  minimo DECIMAL(12, 2),
  maximo DECIMAL(12, 2),
  
  segmento VARCHAR(100),
  
  data_calculo TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_statistics_user_id ON ad_statistics(user_id);

-- Log de tentativas de parse (para debug)
CREATE TABLE parse_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  url TEXT,
  site VARCHAR(50),
  status VARCHAR(50), -- "success", "error", "timeout"
  mensagem_erro TEXT,
  data_tentativa TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parse_logs_user_id ON parse_logs(user_id);
CREATE INDEX idx_parse_logs_data ON parse_logs(data_tentativa);

-- ============================================
-- RLS (Row Level Security) Policies
-- ============================================

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_text_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_structural_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_logs ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem seus próprios ads
CREATE POLICY "Users can view their own ads"
  ON ads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ads"
  ON ads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads"
  ON ads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ads"
  ON ads FOR DELETE
  USING (auth.uid() = user_id);

-- Tabelas filhas herdam a restrição via foreign key
CREATE POLICY "Users can view photos of their ads"
  ON ad_photos FOR SELECT
  USING (ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid()));

CREATE POLICY "Users can view services of their ads"
  ON ad_services FOR SELECT
  USING (ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid()));

CREATE POLICY "Users can view rates of their ads"
  ON ad_rates FOR SELECT
  USING (ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid()));

CREATE POLICY "Users can view snapshots of their ads"
  ON ad_snapshots FOR SELECT
  USING (ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid()));

CREATE POLICY "Users can view features of their ads"
  ON ad_text_features FOR SELECT
  USING (ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid()));

CREATE POLICY "Users can view structural features of their ads"
  ON ad_structural_features FOR SELECT
  USING (ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their correlations"
  ON ad_correlations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their statistics"
  ON ad_statistics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their logs"
  ON parse_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- Views úteis para análise
-- ============================================

CREATE VIEW ad_performance AS
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
