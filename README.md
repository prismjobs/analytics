# Vivastreet Analytics

Sistema de análise de anúncios Vivastreet.

## Configuração (uma vez)

### 1. Banco de dados (Supabase)
1. Abra seu projeto em https://supabase.com
2. Vá em "SQL Editor" → "New query"
3. Cole o conteúdo de `database_schema.sql` e rode (RUN)
4. Vá em "Project Settings" → "API" e copie:
   - Project URL
   - anon public key
   - service_role key (⚠️ nunca coloque essa no frontend, só no Netlify)

### 2. Variáveis de ambiente no Netlify
No painel do Netlify: Site settings → Environment variables → adicione:

| Nome | Valor |
|---|---|
| `REACT_APP_SUPABASE_URL` | a Project URL do Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | a anon public key |
| `SUPABASE_URL` | a Project URL do Supabase (mesma de cima) |
| `SUPABASE_SERVICE_KEY` | a service_role key |

Depois de adicionar, vá em "Deploys" → "Trigger deploy" → "Clear cache and deploy site".

### 3. Rodar localmente (opcional)
```
npm install
cp .env.example .env.local   # preencha com suas chaves REACT_APP_*
npm start
```
