# 📊 Vivastreet Analytics - Guia Completo de Setup

## O que é este sistema?

Sistema web de análise estatística de anúncios do Vivastreet que coleta dados, extrai features de texto, calcula correlações e gera relatórios de performance.

**Funcionalidades:**
- ✅ Cadastro de anúncios via URL
- ✅ Extração automática de dados (título, preço, fotos, serviços, etc)
- ✅ Análise de features de texto (comprimento, emojis, sentimento, legibilidade, etc)
- ✅ Coleta periódica de visitors (snapshots)
- ✅ Cálculo de correlações estatísticas (Pearson)
- ✅ Dashboard com gráficos e tabelas
- ✅ Segmentação por região/tipo
- ✅ Comparação top 25% vs bottom 25%

---

## Pré-requisitos

1. **GitHub** - conta para versionamento
2. **Netlify** - hospedagem (gratuita)
3. **Supabase** - banco de dados PostgreSQL (gratuito)
4. **Node.js 18+** - para desenvolvimento local

---

## Step 1: Preparar Supabase

### 1.1 Criar conta e projeto

1. Acesse https://supabase.com
2. Sign up com email ou GitHub
3. Clique "New project"
4. Selecione região (ex: Europe - Ireland)
5. Defina uma senha forte
6. Aguarde criação (2-3 minutos)

### 1.2 Executar SQL schema

1. No dashboard Supabase, vá para **SQL Editor**
2. Clique **New query**
3. Cole o conteúdo inteiro do arquivo `01_database_schema.sql` (fornecido)
4. Clique **Run**
5. Aguarde criação das tabelas

### 1.3 Copiar credenciais

1. Vá para **Settings > API**
2. Copie:
   - `Project URL` → será `SUPABASE_URL`
   - `anon key` → será `SUPABASE_ANON_KEY`
   - `service_role key` → será `SUPABASE_SERVICE_KEY` (guarde bem)

---

## Step 2: Criar repositório GitHub

### 2.1 Inicializar repo local

```bash
mkdir vivastreet-analytics
cd vivastreet-analytics
git init
git remote add origin https://github.com/SEU_USER/vivastreet-analytics.git
```

### 2.2 Estrutura de arquivos

```
vivastreet-analytics/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── AddAdModal.jsx
│   │   ├── AdTable.jsx
│   │   ├── CorrelationChart.jsx
│   │   └── Dashboard.jsx
│   ├── hooks/
│   │   └── useAuth.ts (criar conforme exemplo)
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── api.ts
│   ├── App.jsx
│   └── index.jsx
├── netlify/
│   └── functions/
│       ├── parseAd.js
│       ├── updateSnapshots.js
│       └── analytics.js
├── lib/
│   ├── vivastreetParser.js
│   ├── textFeaturesAndAnalytics.js
│   └── correlation.js
├── package.json
├── netlify.toml
├── .env.example
├── .gitignore
├── README.md
└── .git/
```

### 2.3 Criar .env.example

```bash
# .env.example
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxxxxxx
SUPABASE_SERVICE_KEY=eyJxxxxxxx
```

### 2.4 Criar .gitignore

```bash
# .gitignore
node_modules/
.env
.env.local
.DS_Store
build/
.netlify/
dist/
```

### 2.5 Push para GitHub

```bash
git add .
git commit -m "Initial commit: analytics system setup"
git push -u origin main
```

---

## Step 3: Deploy no Netlify

### 3.1 Conectar GitHub

1. Acesse https://netlify.com
2. Sign up com GitHub
3. Clique **New site from Git**
4. Selecione seu repo `vivastreet-analytics`
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
   - **Base directory**: (deixe em branco)

### 3.2 Definir variáveis de ambiente

1. No painel Netlify, vá para **Site settings > Build & deploy > Environment**
2. Clique **Edit variables**
3. Adicione:
   ```
   REACT_APP_SUPABASE_URL = https://xxxxx.supabase.co
   REACT_APP_SUPABASE_ANON_KEY = eyJxxxxxxx
   SUPABASE_SERVICE_KEY = eyJxxxxxxx
   ```

### 3.3 Deploy

1. Clique **Deploy site**
2. Aguarde build (5-10 minutos)
3. Seu site estará em `https://seu-site.netlify.app`

---

## Step 4: Desenvolvimento local

### 4.1 Setup

```bash
# Clone o repo
git clone https://github.com/seu-user/vivastreet-analytics.git
cd vivastreet-analytics

# Install dependências
npm install

# Criar .env.local com suas credenciais
cp .env.example .env.local
# Edite .env.local e adicione as credenciais do Supabase
```

### 4.2 Rodar localmente

```bash
# Terminal 1: React frontend
npm start
# Acessará http://localhost:3000

# Terminal 2: Netlify Functions (opcional, para testar)
netlify dev
```

---

## Step 5: Como usar o sistema

### 5.1 Login

1. Acesse seu site Netlify
2. Clique "Sign up" / "Login"
3. Cadastre-se com email (Supabase Auth)

### 5.2 Adicionar anúncios

1. Clique "+ Adicionar anúncio"
2. Cole URL do Vivastreet (ex: `https://www.vivastreet.co.uk/escort/...`)
3. Sistema extrai automaticamente:
   - Título, descrição, fotos
   - Preços, serviços, informações
   - Features de texto (comprimento, emojis, sentimento, etc)

### 5.3 Atualizar visitors

1. Clique "Atualizar visitors"
2. Sistema coleta dados atualizados de cada anúncio
3. Cria snapshots para histórico

### 5.4 Analisar dados

1. Veja tabela de anúncios (título, região, visitors, trend)
2. Observe gráficos de correlação (quais features correlacionam com mais visitors)
3. Estude tabela de comparação (top 25% vs bottom 25%)
4. Analise estatísticas descritivas de cada feature

### 5.5 Filtrar por segmento

1. Selecione "Filtrar por" (região ou tipo)
2. Gráficos atualizam para aquele segmento

---

## Troubleshooting

### "Erro: SUPABASE_URL não está definido"
→ Verifique se as variáveis de ambiente estão definidas no Netlify

### "Erro ao parsear anúncio"
→ Verifique se a URL é do Vivastreet Reino Unido (vivastreet.co.uk)
→ O site pode ter mudado a estrutura HTML — atualize os seletores em `vivastreetParser.js`

### "Timeout ao parsear"
→ Aumentar `TIMEOUT_MS` em `netlify.toml`

### "Sem dados no gráfico de correlação"
→ Você precisa de pelo menos 2 anúncios para calcular correlação
→ Clique "Atualizar visitors" após adicionar anúncios

---

## Próximos passos sugeridos

1. **Coletar dados**: cadastre 10+ anúncios do Vivastreet
2. **Estudar padrões**: rode "Atualizar visitors" 2-3 vezes (dias diferentes)
3. **Analisar correlações**: quais features correlacionam positivamente com visitors?
4. **Validar achados**: compare top vs bottom, procure padrões consistentes
5. **Documentar insights**: crie um spreadsheet com seus achados

---

## Estrutura técnica rápida

```
Frontend (React) ← → Backend (Netlify Functions)
                           ↓
                    Supabase (PostgreSQL)
                           ↓
                    Web Scraper (Cheerio)
                    (Vivastreet)
```

1. **Frontend**: React com Dashboard, tabelas, gráficos
2. **Backend**: Node.js functions que rodam sob demanda
3. **Banco**: Supabase armazena ads, snapshots, features, correlações
4. **Scraper**: Cheerio extrai HTML do Vivastreet

---

## Custos

- **Netlify**: Gratuito (até 125k requisições/mês)
- **Supabase**: Gratuito (até 500MB, 50MB/mês egress)
- **GitHub**: Gratuito

**Custo total: R$ 0**

---

## Dúvidas frequentes

**P: Posso adicionar outros sites (não só Vivastreet)?**
A: Sim! Crie um novo parser em `lib/` e adicione detecção no `parseAd.js`

**P: Como automatizar coleta de visitors diariamente?**
A: Use Netlify Scheduled Functions (pago) ou cron externo (como EasyCron)

**P: Posso exportar os dados?**
A: Sim, Supabase permite export via SQL ou API

**P: Quantos anúncios posso adicionar?**
A: Ilimitado com Supabase gratuito (até 500MB)

---

Pronto para começar! 🚀
