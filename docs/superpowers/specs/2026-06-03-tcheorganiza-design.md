# TcheOrganiza — Design Document

**Date:** 2026-06-03
**Status:** Design Approved
**Platform:** iOS + Android (React Native + Expo)

---

## 1. Visão Geral

TcheOrganiza é um aplicativo mobile de gestão financeira pessoal com integração ao Open Finance Brasil. O app centraliza transações de múltiplos bancos, categoriza gastos automaticamente com aprendizado contínuo, e oferece atualizações em tempo real via polling inteligente — tudo com segurança como requisito primário.

**MVP (V1):** Conexão com 3 bancos, dashboard consolidado, categorização automática + manual, dark mode padrão, biometria + PIN, exportação CSV/PDF.

**V2:** Mais bancos, gráficos e análises, orçamentos mensais, notificações push.

**V3:** Analytics preditivos com IA, recomendações personalizadas, múltiplos usuários.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Mobile | React Native + Expo (TypeScript) | Um código iOS+Android, tipagem forte, ecossistema de segurança maduro |
| Backend | Supabase | PostgreSQL + Auth + Realtime + Edge Functions, RLS nativo |
| Funções Serverless | Supabase Edge Functions (Deno/TS) | Categorização, polling, agregação — mesmo ecossistema |
| Proxy Open Finance | Node.js + TypeScript (servidor dedicado) | mTLS, certificados ICP-Brasil, FAPI compliance |
| Banco de Dados | PostgreSQL 15 (via Supabase) | Dados relacionais, RLS, índices performáticos |
| Autenticação | Supabase Auth + Biometria local | JWT com refresh rotativo, MFA disponível |
| Testes | Jest, Detox/Maestro | Unit + Integration + E2E |
| Monitoramento | Sentry | Captura de erros com sanitização de dados sensíveis |
| CI/CD | GitHub Actions | Testes obrigatórios antes do build |

---

## 3. Arquitetura Geral

### Abordagem: "Thin Client, Fat Edge"

O app mobile é focado em UI e experiência. Toda lógica de negócio (normalização, categorização, polling, agregação) roda nas Edge Functions do Supabase e no Proxy Server. O app consome dados prontos via Supabase Realtime.

```
┌─────────────────────────────────────────────────────────┐
│                    APP MOBILE (RN + Expo)                │
│                                                         │
│  Screens → Services (hooks) → Supabase JS Client        │
│                   ↓                                     │
│              expo-secure-store                          │
│              (token + PIN hash)                         │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + SSL Pinning
                           ▼
┌──────────────────────────────────────────────────────────┐
│                      SUPABASE                            │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Auth   │  │  PostgreSQL  │  │  Edge Functions  │   │
│  │          │  │  (RLS)       │  │  (Deno/TS)       │   │
│  │ - login  │  │              │  │                  │   │
│  │ - token  │  │ - users      │  │ - openfinance    │   │
│  │ - MFA    │  │ - accounts   │  │ - categorizer    │   │
│  │          │  │ - transact.  │  │ - polling        │   │
│  │          │  │ - categories │  │ - aggregator     │   │
│  └──────────┘  └──────┬───────┘  └────────┬─────────┘   │
│                       │                   │             │
│                 Realtime (WS) ◄────────────┘             │
└───────────────────────┼──────────────────────────────────┘
                        │ mTLS + FAPI
                        ▼
┌──────────────────────────────────────────────────────────┐
│              PROXY SERVER (Node.js + TS)                 │
│                                                          │
│  - Gestão de certificados digitais ICP                   │
│  - mTLS com instituições financeiras                     │
│  - Renovação de tokens de acesso                         │
│  - Normalização dos dados (adapter por banco)            │
└──────────────────────┬───────────────────────────────────┘
                       │ mTLS
                       ▼
┌──────────────────────────────────────────────────────────┐
│          OPEN FINANCE BRASIL (3 bancos)                  │
└──────────────────────────────────────────────────────────┘
```

### Princípios

- **Separação clara:** Proxy ↔ Edge Functions ↔ App são camadas independentes com interfaces bem definidas.
- **Single source of truth:** PostgreSQL é a única fonte de verdade. O app não mantém estado derivado.
- **Least privilege:** RLS garante que cada usuário só acessa seus próprios dados.
- **Tipado ponta a ponta:** TypeScript em todas as camadas.

---

## 4. Estrutura de Diretórios

```
TcheOrganiza/
├── app/                          # Expo Router (file-based)
│   ├── (auth)/                   # Telas não autenticadas
│   │   ├── login.tsx
│   │   ├── setup-pin.tsx
│   │   └── forgot-password.tsx
│   ├── (app)/                    # Telas autenticadas (protegidas)
│   │   ├── (tabs)/               # Tab navigator
│   │   │   ├── dashboard.tsx     # Visão geral + saldo
│   │   │   ├── transactions.tsx  # Lista de transações
│   │   │   ├── categories.tsx    # Categorias e gastos
│   │   │   └── settings.tsx      # Perfil, bancos, segurança
│   │   ├── transaction/[id].tsx  # Detalhe da transação
│   │   ├── connect-bank/         # Fluxo de conectar banco
│   │   │   ├── index.tsx
│   │   │   ├── consent.tsx
│   │   │   └── success.tsx
│   │   ├── export.tsx
│   │   └── profile.tsx
│   └── _layout.tsx               # Root layout (providers)
├── src/
│   ├── components/
│   │   ├── ui/                   # Design system
│   │   └── features/             # Componentes de domínio
│   ├── hooks/                    # Custom hooks
│   ├── services/                 # Supabase client
│   ├── stores/                   # Zustand stores
│   ├── utils/                    # Formatação, constantes
│   └── types/                    # Tipos TypeScript
├── supabase/
│   ├── migrations/               # Schema SQL versionado
│   └── functions/                # Edge Functions
│       ├── polling/              # Agendador de polling
│       ├── categorizer/          # Classificação automática
│       ├── aggregator/           # Consolidação de dados
│       └── openfinance-proxy/    # Orquestrador do proxy
├── proxy-server/                 # Servidor proxy separado
│   ├── src/
│   │   ├── certificates/        # Gestão de mTLS
│   │   ├── institutions/        # Adaptadores por banco
│   │   └── normalizer/          # Normalização de dados
│   └── Dockerfile
└── docs/
    └── superpowers/
        └── specs/
```

---

## 5. Modelo de Dados

### 5.1 Tabelas

```sql
-- profiles: estende auth.users do Supabase
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- institutions: bancos conectados pelo usuário
CREATE TABLE institutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                    -- "Nubank", "Itaú", "Bradesco"
  ispb          TEXT NOT NULL,                    -- código ISPB
  consent_id    TEXT NOT NULL,                    -- ID consentimento Open Finance
  access_token  TEXT NOT NULL,                    -- referência ao Vault (nunca token real)
  token_expires TIMESTAMPTZ,
  status        TEXT DEFAULT 'active',            -- active, expired, revoked
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- accounts: contas dentro de cada banco
CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  name            TEXT NOT NULL,                  -- "Conta Corrente"
  type            TEXT NOT NULL,                  -- corrente, poupança, investimento
  currency        TEXT DEFAULT 'BRL',
  balance         DECIMAL(18,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- categories: categorias do sistema + personalizadas
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = global
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  parent_id     UUID REFERENCES categories(id),
  is_system     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Categorias padrão do sistema:
-- 🚗 Transporte, 🍔 Alimentação, 🏠 Moradia, 💊 Saúde,
-- 🎮 Lazer, 💰 Salário/Receita, 🛒 Compras, 📚 Educação,
-- 💸 Investimentos, ❓ Outros

-- transactions: tabela central
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,         -- positivo=entrada, negativo=saída
  description     TEXT NOT NULL,
  merchant_name   TEXT,
  merchant_cnpj   TEXT,
  category_id     UUID REFERENCES categories(id), -- categorização automática
  user_category_id UUID REFERENCES categories(id),-- correção manual
  date            DATE NOT NULL,
  type            TEXT DEFAULT 'DEBIT',            -- DEBIT, CREDIT, PIX, TED, BOLETO
  status          TEXT DEFAULT 'pending',          -- pending, posted, categorized
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(external_id, account_id)
);

-- categorization_rules: aprendizado por correção
CREATE TABLE categorization_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pattern       TEXT NOT NULL,
  field         TEXT DEFAULT 'description',        -- description, merchant_name, merchant_cnpj
  category_id   UUID NOT NULL REFERENCES categories(id),
  confidence    DECIMAL(3,2) DEFAULT 1.0,
  hit_count     INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, pattern, field)                  -- evita regras duplicadas
);
```

### 5.2 Row Level Security (RLS)

Toda tabela tem RLS ativada com política `USING (auth.uid() = user_id)`. Isso garante que mesmo com bug no código, nenhum usuário acessa dados de outro.

### 5.3 Índices

```sql
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id);
CREATE INDEX idx_transactions_status ON transactions(user_id, status);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_cnpj) WHERE merchant_cnpj IS NOT NULL;
```

### 5.4 Tipos TypeScript (App)

```typescript
interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  externalId: string;
  amount: number;           // positivo = entrada, negativo = saída
  description: string;
  merchantName?: string;
  merchantCnpj?: string;
  categoryId?: string;
  userCategoryId?: string;
  date: string;
  type: 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
  status: 'pending' | 'posted' | 'categorized';
  metadata: Record<string, unknown>;
}

interface Account {
  id: string;
  institutionId: string;
  name: string;
  type: 'corrente' | 'poupança' | 'investimento';
  balance: number;
}

interface Institution {
  id: string;
  name: string;
  status: 'active' | 'expired' | 'revoked';
  lastSyncAt: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string;
  isSystem: boolean;
}
```

---

## 6. Navegação e Telas

### 6.1 Estrutura Expo Router

```
Root Layout (_layout.tsx)
│  Providers: AuthProvider + ThemeProvider + SupabaseProvider
│
├── (auth)/                         # Não autenticado
│   ├── login.tsx                   # Email + senha (Supabase Auth)
│   ├── setup-pin.tsx              # Criar PIN + ativar biometria
│   └── forgot-password.tsx         # Recuperação de senha
│
├── (app)/                          # Autenticado (com guard)
│   ├── _layout.tsx                 # Tab Navigator + Auth Guard
│   │
│   ├── (tabs)/
│   │   ├── dashboard.tsx           # Tab 1: Dashboard
│   │   ├── transactions.tsx        # Tab 2: Transações
│   │   ├── categories.tsx          # Tab 3: Categorias
│   │   └── settings.tsx            # Tab 4: Configurações
│   │
│   ├── transaction/[id].tsx        # Detalhe de transação
│   ├── connect-bank/               # Fluxo conectar banco
│   │   ├── index.tsx               # Lista de bancos
│   │   ├── consent.tsx             # WebView consentimento
│   │   └── success.tsx             # Confirmação
│   ├── export.tsx                  # Exportar extrato
│   └── profile.tsx                 # Perfil
```

### 6.2 Componentes por Tela

**Dashboard:** BalanceCard + AccountCarousel + RecentTransactions + QuickActions

**Transactions:** MonthSummary + TransactionFilters + TransactionList (FlatList otimizada com swipe-to-edit)

**Transaction/[id]:** TransactionHeader + TransactionDetail + CategorySelector (bottom sheet) + MerchantInfo + SimilarTransactions

**Categories:** CategorySummary + CategoryList

**Settings:** ProfileHeader + SecuritySection + InstitutionsSection + AppearanceSection + DataSection

### 6.3 Design System

```
Cores:
  Background:     #0D1117 (dark) / #FFFFFF (light)
  Surface:        #161B22 (dark) / #F6F8FA (light)
  Primary:        #6366F1 (indigo-500)
  Success:        #22C55E (green-500 — entradas)
  Danger:         #EF4444 (red-500 — saídas)
  Text Primary:   #E6EDF3 (dark) / #1F2328 (light)
  Text Secondary: #8B949E

Tipografia:
  Display (saldo):  36px Inter Bold
  Heading:          24px Inter SemiBold
  Body:             16px Inter Regular
  Caption:          13px Inter Regular

Componentes base: Button, Card, Input, BottomSheet, Chip,
                  Badge, EmptyState, Skeleton, Toast
```

---

## 7. Fluxo de Dados

### 7.1 Polling → Realtime

```
1. Edge Function: polling (cron 1-5min)
   ├─ Busca usuários com consentimento ativo
   └─ Para cada usuário:
       ├─ Chama proxy-server: POST /fetch-transactions
       ├─ Proxy usa mTLS + token → Open Finance → dados brutos
       ├─ normalizer: adapter por banco → TransactionNormalized[]
       ├─ categorizer: classifica cada transação
       │   Prioridades: regras do usuário → histórico → CNPJ → palavra-chave
       └─ UPSERT no PostgreSQL (UNIQUE external_id+account_id)
           └─ Supabase Realtime detecta INSERT/UPDATE
               └─ App recebe via WebSocket → atualiza Zustand → UI
```

### 7.2 Correção de Categoria (Aprendizado)

```
1. Usuário reclassifica transação via CategorySelector
2. UPDATE transactions SET user_category_id = <nova>
3. Edge Function categorizer, no próximo ciclo de polling:
   ├─ Detecta transações com user_category_id != category_id
   ├─ Extrai padrão (merchant_cnpj, merchant_name, ou regex da description)
   └─ UPSERT INTO categorization_rules
      ON CONFLICT (user_id, pattern, field): UPDATE hit_count++, confidence++
4. Próxima transação com mesmo padrão → categorizada corretamente
```

### 7.3 Sincronização de Saldo

```
1. Toda transação INSERT/UPDATE → Edge Function aggregator recalcula
   SUM(amount) WHERE account_id = X → accounts.balance
2. Saldo total: SUM(balance) WHERE user_id = ?
3. Cache no app via React Query (staleTime: 30s)
4. App em background: se variação > X% → push notification local
```

### 7.4 Estado no App (Zustand)

Stores separadas por domínio (sem store global monolítico):

- `useAuthStore`: user, session, login(), logout(), biometricUnlock()
- `useTransactionStore`: transactions[], filters, updateCategory()
- `useAccountStore`: accounts[], totalBalance, lastSync
- `useInstitutionStore`: institutions[], addInstitution(), revokeInstitution()

---

## 8. Autenticação e Segurança

### 8.1 Fluxo de Autenticação

```
Primeiro acesso:
  Email + senha (Supabase Auth) → cria PIN de 6 dígitos → ativa biometria

Acessos seguintes:
  Biometria → libera token do Secure Store → app carregado
  Fallback: biometria falha 3x → PIN
  Fallback total: PIN errado 5x → bloqueio 30s
                  PIN errado 10x → logout, refazer login completo
```

### 8.2 Regra de Ouro

> O sistema NUNCA solicita, coleta, armazena, transmite ou processa credenciais bancárias (senha, PIN do cartão, etc.). Toda autenticação com instituições financeiras ocorre EXCLUSIVAMENTE via fluxo OAuth/Open Finance nos domínios oficiais dos bancos. O app apenas recebe tokens de consentimento — e esses tokens residem no Vault (HSM), nunca no banco de dados ou dispositivo.

### 8.3 Camadas de Segurança

| Camada | Medidas |
|--------|---------|
| Dispositivo | Biometria + PIN, Secure Store, bloqueio em background (2min), anti-screenshot |
| Transporte | SSL Pinning, HTTPS obrigatório, device fingerprint |
| Supabase | RLS em todas tabelas, JWT 1h + refresh rotativo, MFA disponível, rate limiting, service role key nunca no app |
| Edge Functions | Ambiente Deno isolado, Zod validation em toda entrada, service role como env var |
| Proxy Server | Certificados ICP-Brasil em Vault/HSM, mTLS obrigatório, segredo FAPI, logs sem dados sensíveis, rate limiting |
| Dados em Repouso | TDE PostgreSQL, backups diários criptografados (retenção 7 dias), access tokens só no Vault |

### 8.4 Checklist de Segurança

| Item | Requirement |
|------|------------|
| OWASP Mobile Top 10 | Todos cobertos |
| RLS em todas tabelas | Obrigatório |
| SSL Pinning | Obrigatório |
| Secure Store | Tokens e PIN |
| Sem logs de dados sensíveis | Obrigatório — nunca token, CPF, valores |
| Bloqueio em background | Obrigatório |
| Anti-screenshot | Obrigatório |
| Input validation (Zod) | Obrigatório |
| Rate limiting | Obrigatório |
| Dependency audit | Bloqueia build se HIGH/CRITICAL |

---

## 9. Tratamento de Erros

### 9.1 Estratégia por Camada

**App Mobile:** Retry 3x com exponential backoff, token refresh automático, biometria → PIN → login (fallback em cascata), React Query com stale data como fallback, ErrorBoundary em tela cheia, Sentry para erros não-tratados.

**Supabase + Edge Functions:** Falha de polling registrada e retentada no próximo ciclo, categorização que falha marca "uncategorized", RLS falha → 403 sem expor dados, timeout 30s com abort + retry, 5 falhas consecutivas → push notification ao usuário.

**Proxy Server:** Erro mTLS → retry 2x → log + alerta, consentimento expirado → notificação para renovar, erro 5xx do banco → retry com backoff, erro 4xx do banco → não retry (registra motivo), timeout por banco 15s, banco fora não bloqueia outros (status "degraded").

### 9.2 Estados de UI

Todo componente que carrega dados implementa 4 estados:

| Estado | UI |
|--------|----|
| Loading | Skeleton (placeholders animados) |
| Data | Conteúdo renderizado |
| Empty | Ilustração + mensagem contextual |
| Error | Mensagem clara + botão de ação "Tentar novamente" |

Estado adicional: **Offline** — banner sutil indicando dados em cache.

### 9.3 Monitoramento (Sentry)

**Captura:** Exceções não-tratadas no app, erros de Edge Function, erros de proxy, falhas consecutivas de polling.

**NUNCA envia:** Dados de transações, tokens, CPF, CNPJ, valores, informações de identificação.

---

## 10. Estratégia de Testes

### 10.1 Pirâmide de Testes

```
         ┌──────────┐
         │   E2E    │  ~5% — Fluxos críticos (login, extrato, categorização)
        ┌┴──────────┴┐
        │ Integration │  ~20% — Edge Functions, API, proxy
       ┌┴────────────┴┐
       │    Unit       │  ~75% — Cálculos, normalização, categorização
       └───────────────┘
```

### 10.2 Testes por Camada

**Unitários (Jest/Vitest):**
- Regras de categorização (100% coverage obrigatório)
- Normalizador de transações (100% coverage obrigatório)
- Agregador de saldo (100% coverage obrigatório)
- Cálculos de saldo com precisão decimal (100% coverage obrigatório)
- Formatação de moeda e limites de categoria

**Integração (Jest):**
- Edge Function → PostgreSQL (insert, update, RLS blocking)
- Proxy → Mock de banco Open Finance
- Supabase Realtime: subscription entrega dados corretos
- Fluxo de polling completo

**E2E (Detox ou Maestro):**
- Login completo → biometria → dashboard carregado
- Transação via polling → aparece na lista → categorizada
- Usuário corrige categoria → sistema aprende

**Segurança:**
- RLS: usuário A não lê dados do usuário B
- Token expirado bloqueia acesso
- PIN errado 5x → bloqueio
- mTLS: proxy rejeita sem certificado válido
- Secure Store: token não vaza para logs

### 10.3 Cobertura

| Camada | Target | Obrigatório |
|--------|--------|-------------|
| Cálculos e normalização | 100% | Sim |
| Categorização | 100% | Sim |
| Edge Functions | ≥ 90% | Sim |
| Proxy server | ≥ 90% | Sim |
| Componentes UI | ≥ 70% | Recomendado |
| E2E fluxos críticos | 3 fluxos | Sim |

### 10.4 CI Pipeline (GitHub Actions)

```
Push → Lint + Type Check → Unit Tests → Integration Tests → E2E (critical) → Build APK
```

Build é bloqueada se testes de cálculos falharem. Sem exceção.

---

## 11. MVP — Escopo

### V1 (agora)

- Conexão com 3 bancos via Open Finance
- Dashboard com saldo consolidado e lista de transações
- Categorização automática + correção manual com aprendizado
- Atualização via polling inteligente (1-5min)
- Dark mode (padrão) + light mode
- Autenticação: biometria + PIN de 6 dígitos
- Exportar extrato em PDF/CSV
- Testes com cobertura completa em cálculos

### V2 (futuro)

- Expansão para mais bancos e instituições
- Gráficos e análises de gastos por categoria/período
- Orçamentos mensais por categoria
- Notificações push de movimentações grandes

### V3 (futuro)

- Analytics preditivos com IA
- Recomendações personalizadas de economia
- Múltiplos usuários e compartilhamento familiar
