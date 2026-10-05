# SportX Gestionale

Gestionale per **ASD SportX** — *porta in orbita lo sport*: iscritti, corsi, certificati medici, pagamenti e presenze.

- **Admin**: anagrafica iscritti, certificati, pagamenti, corsi e orari, utenti/istruttori, dashboard scadenze
- **Istruttori**: calendario delle proprie lezioni, presenze, aggiunta rapida di nuove persone

Stack: Next.js 15 · TypeScript · Tailwind CSS · Prisma · PostgreSQL (Neon) · Vercel.

## Avvio in locale

```bash
npm install
cp .env.example .env     # imposta SESSION_SECRET e ADMIN_EMAIL
npm run db:local         # Postgres locale (PGlite) — lascialo aperto
npm run db:migrate
npm run db:seed          # crea il primo admin, password iniziale SportX2026!
npm run dev              # http://localhost:3000
```

Obiettivi, stato del progetto, decisioni e istruzioni di deploy: vedi [sportxgestione.md](sportxgestione.md).
