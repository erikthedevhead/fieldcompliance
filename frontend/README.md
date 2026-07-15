# FieldCompliance Web

Next.js 15 admin dashboard for FieldCompliance. Runs against the NestJS API in the sibling directory.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui primitives
- Zustand for auth state (persisted to localStorage)
- Inter body / JetBrains Mono for regulatory data

## Local setup

Backend must be running on `http://localhost:3001` first.

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Then visit `http://localhost:3000`.

## Sample login

Once the backend is seeded:
- Email: `admin@lonestarep.example.com`
- Password: `Localdev123!`

## Structure

```
frontend/
├── app/
│   ├── (auth)/login/       # public — sign-in page
│   ├── (app)/              # protected — requires auth
│   │   ├── layout.tsx      # shell (topbar + main)
│   │   └── page.tsx        # dashboard home
│   ├── layout.tsx          # root (fonts, metadata)
│   └── globals.css         # Tailwind + design tokens
├── components/
│   ├── ui/                 # button, input, label, card
│   ├── auth/               # login form
│   └── shell/              # topbar, auth guard
└── lib/
    ├── api-client.ts       # typed fetch wrapper
    ├── auth-store.ts       # Zustand session store
    └── utils.ts            # cn, date formatters, etc.
```

## Design system

The FieldCompliance visual identity centers on **regulatory data rendered as source code**.

Regulation codes (`SUBW-PNEUMATIC-CALC`), emission factors (`0.174 scf-CH4/hr`), and audit references render in JetBrains Mono via the `.reg-code` and `.reg-code-strong` utility classes. This is the signature move that distinguishes FieldCompliance from generic B2B SaaS templates.

Palette (Tailwind color families):
- `canvas` — off-white background (cool dust, not warm cream)
- `ink` — near-black foreground
- `overdue` / `warn` / `ok` / `info` — semantic status colors
- `accent` — dark interactive elements
