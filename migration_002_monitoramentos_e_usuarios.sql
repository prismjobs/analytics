-- ============================================
-- MIGRATION 002: Monitoramentos + Controle de Usuários
-- Rode este script inteiro no SQL Editor do Supabase
-- ============================================

-- ============================================
-- PARTE 1: MONITORAMENTOS (grupos/abas de anúncios)
-- ============================================

CREATE TABLE IF NOT EXISTS monitoramentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cor VARCHAR(20) DEFAULT '#2563eb',
  data_criacao TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, nome)
);

ALTER TABLE monitoramentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem seus proprios monitoramentos"
  ON monitoramentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios criam seus proprios monitoramentos"
  ON monitoramentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios editam seus proprios monitoramentos"
  ON monitoramentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios excluem seus proprios monitoramentos"
  ON monitoramentos FOR DELETE
  USING (auth.uid() = user_id);

-- Liga cada anúncio a um monitoramento (pode ficar nulo = "sem grupo")
ALTER TABLE ads ADD COLUMN IF NOT EXISTS monitoramento_id UUID REFERENCES monitoramentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ads_monitoramento ON ads(monitoramento_id);

-- Backfill: cria um monitoramento "Geral" para cada usuário que já tem
-- anúncios cadastrados, e move os anúncios existentes (sem grupo) para lá,
-- assim nada "desaparece" da tela depois desta migration.
DO $$
DECLARE
  usuario RECORD;
  novo_monitoramento_id UUID;
BEGIN
  FOR usuario IN
    SELECT DISTINCT user_id FROM ads WHERE monitoramento_id IS NULL
  LOOP
    INSERT INTO monitoramentos (user_id, nome, descricao, cor)
    VALUES (usuario.user_id, 'Geral', 'Criado automaticamente para os anúncios já cadastrados', '#6b7280')
    ON CONFLICT (user_id, nome) DO UPDATE SET nome = monitoramentos.nome
    RETURNING id INTO novo_monitoramento_id;

    UPDATE ads
    SET monitoramento_id = novo_monitoramento_id
    WHERE user_id = usuario.user_id AND monitoramento_id IS NULL;
  END LOOP;
END $$;


-- ============================================
-- PARTE 2: PERFIS DE USUÁRIO (role + status de acesso)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuário só pode ler o PRÓPRIO perfil via API pública (anon key).
-- Toda ação sobre OUTROS usuários (listar todos, bloquear, resetar senha,
-- promover a admin) passa por Netlify Functions usando a service role key,
-- que ignora RLS — a validação de "é admin mesmo?" acontece no backend.
CREATE POLICY "Usuario le o proprio perfil"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- IMPORTANTE — Passo manual obrigatório:
-- Troque 'SEU_EMAIL_AQUI' pelo seu e-mail de login ANTES de rodar este
-- script, para virar o usuário mestre (admin) do sistema.
--
-- Qualquer outra conta que já existia no projeto (criada durante o período
-- em que o cadastro estava aberto) entra como 'user' e ATIVA=FALSE — ou
-- seja, fica bloqueada até você (admin) revisar e liberar manualmente pelo
-- painel de administração.
INSERT INTO user_profiles (id, email, role, ativo)
SELECT
  id,
  email,
  CASE WHEN email = 'jcguerino@proton.me' THEN 'admin' ELSE 'user' END,
  CASE WHEN email = 'jcguerino@proton.me' THEN true ELSE false END
FROM auth.users
ON CONFLICT (id) DO NOTHING;
