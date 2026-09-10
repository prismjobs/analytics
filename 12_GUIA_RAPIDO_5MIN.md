# ⚡ Guia Rápido - 5 Minutos para Começar

## O que você tem

✅ Sistema web completo de análise de anúncios Vivastreet
✅ Pronto para deploy gratuito (Netlify + Supabase)
✅ 11 arquivos + documentação completa

---

## Antes de começar

Você precisa de:
- Conta GitHub (gratuita)
- Conta Netlify (gratuita)
- Conta Supabase (gratuita)
- Node.js 18+ instalado

Todas grátis. Cria em 2 minutos cada.

---

## 5 passos rápidos

### ⏱️ Passo 1 (1 min): Preparar Supabase

```
1. Acesse https://supabase.com
2. Sign up com GitHub
3. Create project (qualquer região)
4. Aguarde 2 minutos
5. Copie: Project URL + anon key + service key
```

Agora você tem um banco de dados PostgreSQL gratuito.

### ⏱️ Passo 2 (2 min): Executar SQL

```
1. No Supabase, vá para SQL Editor
2. New query
3. Cola TUDO do arquivo: 01_database_schema.sql
4. Clique Run
```

Pronto! 10 tabelas criadas.

### ⏱️ Passo 3 (1 min): Criar projeto GitHub

```bash
# No seu computador:
mkdir vivastreet-analytics
cd vivastreet-analytics
git init

# Copie TODOS os 11 arquivos para esta pasta

git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USER/vivastreet-analytics
git push -u origin main
```

### ⏱️ Passo 4 (1 min): Deploy Netlify

```
1. Acesse https://netlify.com
2. Sign up com GitHub
3. New site from Git
4. Selecione seu repo
5. Settings > Environment > Add variables:
   - REACT_APP_SUPABASE_URL = [Cole aqui]
   - REACT_APP_SUPABASE_ANON_KEY = [Cole aqui]
   - SUPABASE_SERVICE_KEY = [Cole aqui]
6. Deploy
```

Seu site estará em: `https://seu-site.netlify.app`

Aguarde 5 minutos do build.

### ⏱️ Passo 5 (0 min): Usar

```
1. Acesse seu site (https://seu-site.netlify.app)
2. Crie conta (email + senha)
3. Clique "+ Adicionar anúncio"
4. Cole URL: https://www.vivastreet.co.uk/escort/...
5. Sistema extrai dados automaticamente
6. Clique "Atualizar visitors"
7. Veja gráficos aparecerem
```

---

## Pronto! ✅

Você tem um sistema web funcional analisando anúncios Vivastreet em 5 minutos.

---

## Próximos passos

**Básico:**
- Adicione 5+ anúncios
- Clique "Atualizar visitors"
- Estude os gráficos

**Intermediário:**
- Leia `10_SUMARIO_EXECUTIVO.md` (15 min)
- Entenda as correlações
- Compare top 25% vs bottom 25%

**Avançado:**
- Leia `08_SETUP_COMPLETO.md` (30 min)
- Entenda a arquitetura
- Customize componentes React

---

## Troubleshooting rápido

### "Erro de variáveis de ambiente"
→ Verifique se copiou corretamente em Netlify Settings > Environment

### "SQL não rodou"
→ Tente linha por linha, copie um bloco de cada vez

### "Build falhou no Netlify"
→ Verifique se `package.json` está na raiz

### "Sem dados no gráfico"
→ Adicione mais anúncios e clique "Atualizar visitors"

---

## Precisa de mais detalhes?

Leia estes arquivos **nesta ordem**:
1. `11_INDICE_COMPLETO.md` - estrutura de arquivos
2. `10_SUMARIO_EXECUTIVO.md` - visão geral
3. `08_SETUP_COMPLETO.md` - passo-a-passo detalhado
4. `Analise_Funil_Anuncio_Vivastreet.md` - para estudo

---

## Resumo final

| Etapa | Tempo | O que acontece |
|-------|-------|---|
| Supabase | 1 min | Banco de dados criado |
| SQL | 2 min | Tabelas criadas |
| GitHub | 1 min | Código versionado |
| Netlify | 1 min | Deploy automático |
| **Total** | **5 min** | **Sistema online** |

Agora seu sistema está:
✅ Hospedado (Netlify)
✅ Com banco de dados (Supabase)
✅ Versionado (GitHub)
✅ Com HTTPS automático
✅ Gratuito para sempre

---

**Qualquer dúvida, consulte `08_SETUP_COMPLETO.md` → Seção "Troubleshooting"**

🚀 **Boa sorte!**
