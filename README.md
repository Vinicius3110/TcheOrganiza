# TcheOrganiza

Aplicativo mobile de gestão financeira pessoal com integração ao Open Finance Brasil.

Centralize suas transações de múltiplos bancos, categorize gastos automaticamente e tenha controle total sobre suas finanças — com segurança em primeiro lugar.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native + Expo SDK 56 (TypeScript) |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Edge Functions) |
| Proxy Open Finance | Node.js + Express + TypeScript |
| Autenticação | Supabase Auth + Biometria + PIN 6 dígitos |
| Testes | Jest (42 testes, 3 suites) |
| CI/CD | GitHub Actions |

## Funcionalidades — MVP

- 📊 **Dashboard** com saldo consolidado e transações recentes
- 🔗 **Conexão com 3 bancos** via Open Finance (com proxy seguro mTLS)
- 🏷️ **Categorização automática** com aprendizado por correção do usuário
- 🔄 **Atualização em tempo real** via polling inteligente + Supabase Realtime
- 🔐 **Segurança máxima**: RLS, SSL Pinning, Secure Store, anti-screenshot
- 🔑 **Autenticação**: Email + senha + PIN de 6 dígitos + biometria (Face ID / digital)
- 🌙 **Dark mode padrão** com suporte a light mode
- 📤 **Exportar extrato** em CSV
- 🧠 **Edge Functions**: polling, categorizer (4 níveis de prioridade), aggregator

## Arquitetura

```
App Mobile (RN + Expo)  →  Supabase (Auth + PostgreSQL + Realtime)
                                  ↑
                          Edge Functions (polling, categorizer, aggregator)
                                  ↑
                     Proxy Server (Node.js + mTLS)
                                  ↑
                    Open Finance Brasil (3 bancos)
```

## Estrutura do Projeto

```
TcheOrganiza/
├── app/                           # Expo Router (file-based routing)
│   ├── (auth)/                    # Telas de autenticação
│   └── (app)/                     # Telas do app (protegidas)
│       ├── (tabs)/                # Tab navigator (4 abas)
│       ├── transaction/[id].tsx   # Detalhe da transação
│       ├── connect-bank/          # Conexão com bancos
│       └── export.tsx             # Exportação de extrato
├── src/
│   ├── components/ui/             # Design system (Button, Card, Skeleton)
│   ├── components/features/       # Componentes de domínio
│   ├── hooks/                     # React Query hooks
│   ├── services/                  # Supabase client + SSL pinning
│   ├── stores/                    # Zustand stores
│   ├── theme/                     # Colors, typography, ThemeProvider
│   ├── types/                     # TypeScript types
│   └── utils/                     # Formatação (BRL, datas)
├── supabase/
│   ├── migrations/                # Schema SQL versionado
│   └── functions/                 # Edge Functions (Deno/TS)
├── proxy-server/                  # Servidor proxy Open Finance
│   └── src/
│       ├── institutions/          # Adaptadores por banco
│       └── normalizer/            # Normalização + testes
├── .github/workflows/ci.yml       # CI/CD pipeline
└── docs/superpowers/
    ├── specs/                     # Design spec
    └── plans/                     # Plano de implementação
```

## Pré-requisitos

- **Node.js** 20+
- **npm** 9+
- **Expo CLI** (`npm install -g expo-cli`)
- **EAS CLI** (`npm install -g eas-cli`) — para builds
- **Supabase CLI** (`npm install -g supabase`) — para o backend local
- **Conta Supabase** — para Auth, DB e Edge Functions
- **Expo Go** no celular — para testes com live reload

## Setup

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/Vinicius3110/TcheOrganiza.git
cd TcheOrganiza
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais do Supabase:

```bash
cp .env.example .env
```

Edite `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 3. Rodar o app em desenvolvimento

```bash
npx expo start
```

Escaneie o QR code com o Expo Go no celular, ou pressione `a` para emulador Android / `i` para iOS.

### 4. Rodar os testes

```bash
npm test                    # Todos os testes
npm run test:coverage       # Com cobertura
```

### 5. Rodar o proxy server (local)

```bash
cd proxy-server
npm install
npm run dev
```

O proxy roda em `http://localhost:3001`.

## Gerar APK

```bash
# Instalar EAS CLI (se ainda não tiver)
npm install -g eas-cli

# Login na Expo
eas login

# Configurar build
eas build:configure

# Gerar APK (development)
eas build --platform android --profile preview
```

O APK fica disponível para download no dashboard da Expo em ~15 minutos.

## Deploy das Edge Functions

```bash
npx supabase link --project-ref seu-projeto-ref
npx supabase functions deploy polling
npx supabase functions deploy categorizer
npx supabase functions deploy aggregator
```

## Segurança

- **Row Level Security (RLS)** em todas as tabelas — cada usuário só acessa seus dados
- **Secure Store** — tokens nunca tocam AsyncStorage
- **SSL Pinning** — previne ataques MITM
- **Anti-screenshot** — bloqueia captura de tela em todo o app
- **PIN com brute-force protection** — 5 tentativas = bloqueio de 30s (persiste entre restarts)
- **Bloqueio automático** — app bloqueia após 2 minutos em background
- **Credenciais bancárias NUNCA coletadas** — autenticação via OAuth/Open Finance nos domínios oficiais dos bancos

## Testes

```
42 testes em 3 suites:

📁 src/utils/__tests__/format.test.ts        17 testes (formatação BRL, datas, categorias)
📁 src/stores/__tests__/auth.store.test.ts   20 testes (auth, PIN, brute-force, persistência)
📁 proxy-server/src/normalizer/__tests__/normalizer.test.ts  5 testes (normalização)
```

## Branch Strategy

```
main          ← produção (protegida)
  └── development  ← integração principal
      ├── feat/scaffolding
      ├── feat/database-schema
      ├── feat/auth-security
      ├── feat/dashboard
      ├── feat/transactions-categories
      ├── feat/proxy-server
      ├── feat/edge-functions
      ├── feat/settings-export
      └── feat/ci-cd
```

## Próximos passos (V2)

- Gráficos e análises de gastos por período
- Orçamentos mensais por categoria
- Notificações push de movimentações
- Mais bancos (Itaú, Bradesco, etc.)
- Exportação PDF com resumo por categoria

## Licença

Projeto privado — uso pessoal.
