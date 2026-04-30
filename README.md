# Customers MVP

Et simpelt MVP i Next.js (React) + TypeScript med Prisma (SQLite) og et grundlæggende login-system.

## Hvad findes der?

- Opret bruger (`/signup`)
- Log ind (`/login`)
- Efter login:
  - Opret kunder (navn, email, telefon)
  - Se kundeliste
  - Slet kunder

## Kør lokalt

### 1) Installer afhængigheder
```bash
npm install
```

### 2) Opret `.env.local`
Kopiér `.env.example` til `.env.local`:
```bash
cp .env.example .env.local
```

### 3) Prisma migration + klient
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4) Start dev-server
```bash
npm run dev
```

Åbn derefter:
- `http://localhost:3000`

## Note om senere e-conomic integration

Kundedata ligger i `Customer`-tabellen pr. bruger. Når vi senere tilføjer e-conomic API-integration, kan vi udvide kundemodellen og lave synk-/eksport-funktioner uden at ændre login/customer flowet.

## e-conomic (løbende synk - kunder)

Der er nu en simpel sync, som henter kunder og upserter dem i jeres lokale DB.

### Krav: env vars
Sørg for at `.env.local` indeholder:
- `ECONOMIC_BASE_URL`
- `ECONOMIC_CUSTOMERS_API_VERSION`
- `ECONOMIC_APP_SECRET_TOKEN`
- `ECONOMIC_AGREEMENT_GRANT_TOKEN`

### Sync endpoint (kræver login)
- `POST /api/economic/sync/customers`

Returnerer JSON med `created` / `updated` / `archived`.

### Synk via UI-knap
På `http://localhost:3000/customers` findes knappen:
- “Synk fra e-conomic”

