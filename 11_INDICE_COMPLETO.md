# 📁 Índice Completo - Estrutura de Projeto

## Arquivos entregues e onde colocá-los

### 1️⃣ Banco de dados

**Arquivo:** `01_database_schema.sql`
**Destino:** Rodar no Supabase SQL Editor
**Descrição:** Schema completo com 10 tabelas, índices e RLS policies

```
Tabelas criadas:
├── ads (anúncios cadastrados)
├── ad_photos (URLs das fotos)
├── ad_services (serviços oferecidos)
├── ad_rates (tabelas de preços)
├── ad_snapshots (histórico de visitors)
├── ad_text_features (features de texto)
├── ad_structural_features (features estruturais)
├── ad_correlations (correlações calculadas)
├── ad_statistics (estatísticas)
├── parse_logs (logs de debug)
└── Views: ad_performance (para analytics)
```

---

### 2️⃣ Backend - Parser Vivastreet

**Arquivo:** `02_vivastreetParser.js`
**Destino:** `lib/vivastreetParser.js` (na raiz do projeto, ou em netlify/lib/)
**Descrição:** Classe que faz scraping e parsing do HTML Vivastreet

```javascript
// Como usar:
const parser = new VivastreetParser();
const dados = await parser.parse('https://www.vivastreet.co.uk/escort/...');
// Retorna: { titulo, descricao, fotos, servicos, precos, visitors, ... }
```

**Métodos principais:**
- `parse(url)` - extrai dados do anúncio
- `extractTitulo()`, `extractFotos()`, `extractPrecos()`, etc

---

### 3️⃣ Backend - Features e Correlações

**Arquivo:** `03_textFeaturesAndAnalytics.js`
**Destino:** `lib/textFeaturesAndAnalytics.js`
**Descrição:** Extrai features de texto e calcula correlações

```javascript
// Como usar:
const extractor = new TextFeatureExtractor();
const features = extractor.extractFeatures(descricao);
// Retorna: { desc_length, word_count, emoji_count, sentiment_score, ... }

// Correlações:
const corr = CorrelationAnalyzer.pearson(arrayX, arrayY);
// Retorna: { r: 0.34, pValue: 0.019 }
```

**Features extraídas:**
- 16 features de texto (comprimento, emojis, sentimento, etc)
- 7 features estruturais (fotos, preços, serviços)

---

### 4️⃣ Backend - Netlify Functions

**Arquivo:** `04_netlifyFunctions.js`
**Destino:** 
```
netlify/functions/parseAd.js
netlify/functions/updateSnapshots.js
netlify/functions/analytics.js
```
**Descrição:** 3 funções serverless que rodam Node.js

**Função 1: parseAd.js**
```
POST /.netlify/functions/parseAd
{
  "url": "https://www.vivastreet.co.uk/escort/...",
  "userId": "uuid-do-usuario"
}
Response: { ad_id, titulo, visitors, fotos, servicos, precos }
```

**Função 2: updateSnapshots.js**
```
POST /.netlify/functions/updateSnapshots
{
  "userId": "uuid-do-usuario"
}
Faz: Para cada ad do usuário, coleta visitors atuais e insere snapshot
```

**Função 3: analytics.js**
```
POST /.netlify/functions/analytics
{
  "userId": "uuid",
  "segmento": "all" ou "regiao_london" ou "tipo_independent"
}
Response: { correlacoes, estatisticas, comparacao_top_vs_bottom }
```

---

### 5️⃣ Frontend - Componentes React

**Arquivo:** `05_reactComponents.jsx`
**Destino:** 
```
src/components/AddAdModal.jsx
src/components/AdTable.jsx
src/components/CorrelationChart.jsx
src/components/Dashboard.jsx
```
**Descrição:** 4 componentes React principais

```
AddAdModal.jsx
├── Modal para adicionar anúncio
├── Campo de URL
└── Submissão para parseAd function

AdTable.jsx
├── Tabela de anúncios
├── Título, região, tipo, visitors
├── Trend (↑/↓)
└── Botão "Atualizar visitors"

CorrelationChart.jsx
├── Scatter chart de dispersão
├── Feature vs Visitors
└── Mostra correlação (r) e p-value

Dashboard.jsx
├── Layout principal
├── Gráficos de análise
├── Bar chart de correlações
├── Tabela de comparação top vs bottom
└── Filtros por segmento
```

---

### 6️⃣ Configuração NPM

**Arquivo:** `06_package.json`
**Destino:** Raiz do projeto
**Descrição:** Dependências e scripts

```bash
# Dependências principais:
npm install react react-dom recharts @supabase/supabase-js
npm install cheerio axios sentiment natural
npm install tailwindcss date-fns

# Scripts:
npm start        # roda em localhost:3000
npm run build    # build para produção
npm test         # roda testes
```

---

### 7️⃣ Configuração Netlify

**Arquivo:** `07_netlify.toml`
**Destino:** Raiz do projeto
**Descrição:** Configuração de deploy e build

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "build"

[env]
  SUPABASE_URL = "..."
  SUPABASE_SERVICE_KEY = "..."
```

---

### 8️⃣ Guia de Setup

**Arquivo:** `08_SETUP_COMPLETO.md`
**Destino:** Raiz do projeto (README principal)
**Descrição:** Instruções passo-a-passo de setup completo

**Cobre:**
- Step 1: Preparar Supabase (criar conta, executar SQL)
- Step 2: Criar repositório GitHub
- Step 3: Deploy no Netlify
- Step 4: Desenvolvimento local
- Step 5: Como usar o sistema
- Troubleshooting

---

### 9️⃣ App Principal e Bibliotecas

**Arquivo:** `09_appAndLib.jsx`
**Destino:**
```
src/App.jsx
src/pages/LoginPage.jsx
src/lib/supabase.ts
src/lib/api.ts
src/hooks/useAuth.ts
src/hooks/useAds.ts
src/index.jsx
public/index.html
```
**Descrição:** Estrutura core da aplicação React

```
App.jsx
├── Componente raiz
├── Lógica de login
└── Renderiza Dashboard ou LoginPage

LoginPage.jsx
├── Tela de login/signup
├── Autenticação com Supabase
└── Redirecionamento

lib/supabase.ts
├── Inicializa cliente Supabase
└── Conecta com banco de dados

lib/api.ts
├── Funções auxiliares para chamar netlify functions
├── api.parseAd()
├── api.updateSnapshots()
├── api.getAnalytics()
└── api.getAds()

hooks/useAuth.ts
├── Hook para gerenciar auth
├── Detecta mudanças de sessão
└── Retorna { user, loading, logout }

hooks/useAds.ts
├── Hook para buscar ads do usuário
├── Inscreve-se em atualizações em tempo real
└── Retorna { ads, loading, error }
```

---

### 🔟 Sumário Executivo

**Arquivo:** `10_SUMARIO_EXECUTIVO.md`
**Destino:** Raiz do projeto (documento de referência)
**Descrição:** Visão geral completa do sistema

**Contém:**
- Arquitetura geral
- Como começar (5 passos rápidos)
- Funcionalidades principais
- O que o sistema calcula
- Casos de uso
- Limitações
- Checklist de deployment

---

### 1️⃣1️⃣ Análise de Funil (documento anterior)

**Arquivo:** `Analise_Funil_Anuncio_Vivastreet.md`
**Destino:** Documentação/referência
**Descrição:** Análise detalhada das 12 conversas e funil de vendas

---

## Estrutura de pastas recomendada

```
vivastreet-analytics/
│
├── README.md (copie 08_SETUP_COMPLETO.md como README)
├── package.json (use 06_package.json)
├── netlify.toml (use 07_netlify.toml)
│
├── public/
│   └── index.html (tem em 09_appAndLib.jsx)
│
├── src/
│   ├── App.jsx (use de 09_appAndLib.jsx)
│   ├── index.jsx (use de 09_appAndLib.jsx)
│   ├── index.css (Tailwind CSS)
│   │
│   ├── components/
│   │   ├── AddAdModal.jsx (use de 05_reactComponents.jsx)
│   │   ├── AdTable.jsx (use de 05_reactComponents.jsx)
│   │   ├── CorrelationChart.jsx (use de 05_reactComponents.jsx)
│   │   └── Dashboard.jsx (use de 05_reactComponents.jsx)
│   │
│   ├── pages/
│   │   └── LoginPage.jsx (use de 09_appAndLib.jsx)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts (use de 09_appAndLib.jsx)
│   │   └── useAds.ts (use de 09_appAndLib.jsx)
│   │
│   └── lib/
│       ├── supabase.ts (use de 09_appAndLib.jsx)
│       ├── api.ts (use de 09_appAndLib.jsx)
│       ├── vivastreetParser.js (use 02_vivastreetParser.js)
│       └── textFeaturesAndAnalytics.js (use 03_textFeaturesAndAnalytics.js)
│
├── netlify/
│   └── functions/
│       ├── parseAd.js (separe de 04_netlifyFunctions.js)
│       ├── updateSnapshots.js (separe de 04_netlifyFunctions.js)
│       └── analytics.js (separe de 04_netlifyFunctions.js)
│
├── database/
│   └── schema.sql (use 01_database_schema.sql)
│
├── docs/
│   ├── SETUP_COMPLETO.md (08_SETUP_COMPLETO.md)
│   ├── SUMARIO_EXECUTIVO.md (10_SUMARIO_EXECUTIVO.md)
│   └── Analise_Funil.md (Analise_Funil_Anuncio_Vivastreet.md)
│
├── .env.example
├── .gitignore
└── .git/
```

---

## Checklist de instalação

### Preparação
- [ ] Baixar/copiar todos os 11 arquivos
- [ ] Criar estrutura de pastas acima
- [ ] Criar .env.example com variáveis

### Dependências
- [ ] Rodar `npm install` (usa package.json)
- [ ] Verificar Node.js 18+

### Supabase
- [ ] Criar conta Supabase
- [ ] Criar projeto
- [ ] Executar SQL schema (01_database_schema.sql)
- [ ] Copiar URL e chaves
- [ ] Adicionar em .env.local

### GitHub
- [ ] Criar repo
- [ ] Fazer primeiro commit
- [ ] Push para GitHub

### Netlify
- [ ] Conectar GitHub
- [ ] Definir variáveis de ambiente
- [ ] Deploy
- [ ] Testar login
- [ ] Testar adicionar anúncio

### Validação
- [ ] Site acessível em https://seu-site.netlify.app
- [ ] Login funcionando
- [ ] Modal de anúncio abrindo
- [ ] Parser extraindo dados
- [ ] Gráficos renderizando

---

## Arquivo .env.example (criar)

```
# Frontend
REACT_APP_SUPABASE_URL=https://seu-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend (Netlify env)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Arquivo .gitignore (criar)

```
node_modules/
.env
.env.local
.env*.local
.DS_Store
build/
dist/
.netlify/
*.log
.cache/
coverage/
.idea/
.vscode/settings.json
```

---

## Resumo de arquivos

| # | Arquivo | Linhas | Tipo | Prioridade |
|---|---------|--------|------|-----------|
| 1 | 01_database_schema.sql | 300+ | SQL | 🔴 Crítica |
| 2 | 02_vivastreetParser.js | 400+ | JavaScript | 🔴 Crítica |
| 3 | 03_textFeaturesAndAnalytics.js | 500+ | JavaScript | 🔴 Crítica |
| 4 | 04_netlifyFunctions.js | 350+ | JavaScript | 🔴 Crítica |
| 5 | 05_reactComponents.jsx | 450+ | React/JSX | 🔴 Crítica |
| 6 | 06_package.json | 50+ | JSON | 🔴 Crítica |
| 7 | 07_netlify.toml | 30+ | TOML | 🟡 Importante |
| 8 | 08_SETUP_COMPLETO.md | 400+ | Markdown | 🟡 Importante |
| 9 | 09_appAndLib.jsx | 350+ | React/JSX | 🔴 Crítica |
| 10 | 10_SUMARIO_EXECUTIVO.md | 400+ | Markdown | 🟢 Referência |
| 11 | Analise_Funil.md | 200+ | Markdown | 🟢 Referência |

---

## Como usar este índice

1. **Leia este arquivo primeiro** - você está aqui ✓
2. **Siga 10_SUMARIO_EXECUTIVO.md** - entenda a arquitetura
3. **Siga 08_SETUP_COMPLETO.md** - setup passo-a-passo
4. **Coloque os arquivos nas pastas** - confira estrutura acima
5. **Rode `npm install`** - instale dependências
6. **Rode `npm start`** - teste localmente
7. **Deploy no Netlify** - siga instruções em SETUP

---

**Está tudo aqui. Você tem um projeto profissional, pronto para usar. 🚀**
