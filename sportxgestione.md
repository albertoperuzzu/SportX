# SportX Gestionale — obiettivi e stato

> Documento di riferimento del progetto: va aggiornato a ogni sessione di lavoro.
> Ultimo aggiornamento: 2026-10-05

## Obiettivo

Mini gestionale per **ASD SportX** (corsi di fitness): anagrafica iscritti, iscrizioni ai corsi, pagamenti,
certificati medici e presenze. Deve essere usato online da soci (admin) e istruttori, a costo zero o quasi.

### Ruoli

| Ruolo | Cosa può fare |
|---|---|
| **Admin** | Tutto: iscritti (anagrafica completa), certificati, pagamenti, corsi, orari, lezioni, utenti/istruttori, calendario di tutti i corsi |
| **Istruttore** | Calendario delle lezioni **dei propri corsi**, registrazione presenze, aggiunta rapida di una persona (nome, cognome, email, telefono), note/annullamento lezione |

### Abbonamenti

Ogni iscrizione a un corso ha uno o più abbonamenti (storico, rinnovi):

| Tipo | Validità | Ingressi |
|---|---|---|
| Mensile | 4 settimane dalla data di inizio (inizio + 27 giorni) | illimitati |
| Trimestrale | 12 settimane (inizio + 83 giorni) | illimitati |
| Annuale | fino al primo **30 giugno** successivo all'inizio | illimitati |
| Carnet | fino al primo **28 febbraio** successivo all'inizio | **10** |

- Data di fine e prezzo vengono proposti automaticamente (listino del corso), ma sono modificabili.
- Ogni corso ha un listino con 4 prezzi (mensile, trimestrale, annuale, carnet).
- I **pagamenti sono separati**: registrare l'abbonamento non registra il pagamento.
- Il carnet consuma un ingresso per ogni presenza nel suo periodo; le presenze già coperte da un abbonamento a tempo non consumano il carnet; più carnet si consumano in ordine di acquisto.
- Abbonamento scaduto / carnet esaurito / nessun abbonamento: **solo avviso** all'istruttore (la presenza si può segnare comunque) e voce "Abbonamenti da rinnovare" in dashboard admin. "In scadenza" = mancano ≤ 7 giorni o ≤ 1 ingresso.
- Logica in `src/lib/subscriptions.ts` (pura, condivisa client/server), caricamento stati in `src/lib/subscription-status.ts`.

### Accesso
- Login con **email + password**. Gli account li crea un admin.
- Primo accesso con password **`SportX2026!`**: il cambio password è obbligatorio (min. 8 caratteri, diversa da quella iniziale).
- L'admin può reimpostare la password di un utente (torna a `SportX2026!`) o disattivarne l'accesso.

## Stack e scelte

- **Next.js 15** (App Router, Server Actions) + TypeScript + **Tailwind CSS v4**
- **Prisma 6** + **PostgreSQL** (Neon in produzione)
- Auth fatta in casa: `bcryptjs` + JWT firmato con `jose` in cookie httpOnly (`src/lib/session.ts`, `src/lib/auth.ts`).
  Il middleware fa un controllo veloce sul cookie; ogni pagina/azione ricontrolla utente e ruolo sul DB (`requireUser` / `requireAdmin`).
- Validazione con `zod`. Date "solo giorno" salvate come mezzanotte UTC: usare sempre gli helper di `src/lib/dates.ts`.
- Hosting previsto: **Vercel** (Hobby, gratis) + **Neon** (Free, 0.5 GB).
- Sviluppo locale: Postgres "finto" con **PGlite** (`npm run db:local`), niente Docker né installazioni.
- Certificato medico: si salvano solo tipo e date (rilascio/scadenza), **nessun file** caricato, per ridurre i dati sanitari trattati.

### Palette (dal logo)
Verde `#036B3A` · Viola `#9966FF` · Arancio `#FF6B00` / `#FFA200`. Titoli in *Russo One*, testo in *Inter*.
Il logo "X" è ricreato in SVG in `src/components/Logo.tsx`.

## Modello dati (`prisma/schema.prisma`)

- `User` — admin e istruttori (email, nome, ruolo, hash password, `mustChangePassword`, `active`)
- `Member` — iscritto; `incomplete=true` se aggiunto rapidamente da un istruttore
- `MedicalCertificate` — tipo, data rilascio, data scadenza
- `Course` → `CourseSlot` (orari settimanali ricorrenti) → `Lesson` (singole lezioni generate dagli orari + lezioni extra)
- `Course` ha anche il listino: `priceMonthly`, `priceQuarterly`, `priceYearly`, `priceCarnet`
- `Enrollment` — iscritto ↔ corso, stato ATTIVA/SOSPESA/TERMINATA
- `Subscription` — abbonamento di un'iscrizione: tipo, inizio, fine, ingressi (carnet), prezzo, note
- `Payment` — importo, data, metodo, causale (quota associativa / corso / altro), corso, periodo
- `Attendance` — presenza/assenza per lezione e iscritto

## Mappa delle pagine

| Percorso | Contenuto |
|---|---|
| `/login`, `/cambia-password` | Accesso e cambio password |
| `/admin` | Dashboard: KPI, abbonamenti da rinnovare, certificati da sistemare, anagrafiche da completare, lezioni di oggi, ultimi pagamenti |
| `/admin/iscritti` (+ `/nuovo`, `/[id]`) | Lista con ricerca/filtri; scheda con anagrafica, certificati, corsi, abbonamenti, pagamenti, presenze |
| `/admin/corsi` (+ `/nuovo`, `/[id]`) | Corsi, orari settimanali, lezioni, iscritti al corso |
| `/admin/pagamenti` | Registro con filtri e totale |
| `/admin/utenti` | Utenti/istruttori: crea, modifica, reset password, disattiva |
| `/calendario` (+ `/[id]`) | Calendario settimanale; pagina lezione con presenze e aggiunta rapida (admin + istruttori) |

## Stato

- [x] Setup progetto, stile dal logo, repo GitHub
- [x] Autenticazione (login, primo accesso obbligatorio, logout, reset password)
- [x] Admin: utenti/istruttori
- [x] Admin: corsi, orari ricorrenti, generazione lezioni, lezioni extra, iscrizioni
- [x] Admin: iscritti, certificati, pagamenti, storico presenze
- [x] Istruttore: calendario, presenze, aggiunta rapida, note/annullamento lezione
- [x] Dashboard admin
- [x] Test end-to-end manuale del flusso completo (browser automatizzato), build e lint puliti
- [x] Repo GitHub: https://github.com/albertoperuzzu/SportX (pubblico)
- [x] DB Neon (progetto `red-bread-27503771`, regione eu-central-1 Francoforte, branch `production`)
- [x] Progetto Vercel `sport-x` (team `sport-x-gestione`), collegato al repo: ogni push su `main` = deploy in produzione
- [x] Primo deploy riuscito: migration applicata, admin creato dal seed
- [x] Funzioni Vercel spostate in regione `fra1` (vicino al DB) con `vercel.json`
- [x] "Vercel Authentication" disattivata: app pubblica su https://sport-x-sport-x-gestione.vercel.app
- [x] Abbonamenti (mensile, trimestrale, annuale, carnet) con listino per corso, avvisi istruttore, dashboard rinnovi (2026-10-05)
- [ ] Primo accesso admin in produzione e creazione degli istruttori

## Idee / prossimi passi

- Collegare un pagamento a un abbonamento (oggi sono separati per scelta) e mostrare "abbonamento non pagato"
- Sospensione abbonamento (es. infortunio) che sposta la scadenza

- Esportazione CSV (iscritti, pagamenti, presenze) per la contabilità
- Promemoria scadenza certificati via email
- Statistiche presenze per corso (percentuale di frequenza)
- Stagione sportiva (es. set–ago) per la quota associativa annuale e indicatore "quota pagata"
- Stampa modulo di iscrizione / ricevuta pagamento
- Caricare il logo originale (PDF/PNG) in `public/` al posto dell'SVG ricreato

## Come si avvia in locale

```bash
npm install
cp .env.example .env           # poi imposta SESSION_SECRET e ADMIN_EMAIL
npm run db:local               # terminale 1: Postgres locale (PGlite) su porta 5433
npm run db:migrate             # applica lo schema
npm run db:seed                # crea il primo admin (password SportX2026!)
npm run dev                    # terminale 2: http://localhost:3000
```

Nota PGlite: `prisma migrate dev` non funziona (serve un "shadow database"). Per modificare lo schema:
`npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
in una nuova cartella `prisma/migrations/<timestamp>_<nome>/migration.sql`, poi `npm run db:migrate`.
In alternativa usare un branch Neon di sviluppo come `DATABASE_URL`, dove `migrate dev` funziona normalmente.

## Produzione

- URL: https://sport-x-sport-x-gestione.vercel.app
- Variabili su Vercel (Production + Preview): `DATABASE_URL` (pooled), `DIRECT_URL` (diretta), `SESSION_SECRET`, `ADMIN_EMAIL`
- Nelle stringhe Neon togliere `channel_binding=require` e aggiungere `connect_timeout=15`
- CLI: `vercel ls sport-x --scope sport-x-gestione`, `vercel inspect <url> --logs`

## Deploy (Vercel + Neon)

1. **Neon** (neon.tech): crea un progetto (regione EU, es. Frankfurt). Copia:
   - la connection string **pooled** → `DATABASE_URL`
   - la connection string **diretta** (senza `-pooler`) → `DIRECT_URL`
2. **Vercel** (vercel.com, login con GitHub): "Add New Project" → importa `albertoperuzzu/SportX`.
   Variabili d'ambiente: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (stringa casuale lunga), `ADMIN_EMAIL`.
3. Vercel usa lo script `vercel-build`: genera il client Prisma, applica le migration, esegue il seed (crea l'admin solo se non esiste) e fa la build.
4. Primo accesso con `ADMIN_EMAIL` + `SportX2026!`, poi crea gli istruttori da "Utenti".

### Costi
- Vercel Hobby + Neon Free = **0 €**. Neon va in pausa dopo qualche minuto di inattività e si riattiva in circa 1 s.
  Vercel Hobby è per uso non commerciale: un gestionale interno di un'ASD ci rientra ragionevolmente, altrimenti Pro = 20 $/mese.
- Alternative economiche: VPS Hetzner ~4-5 €/mese, Railway ~5 $/mese, Render Starter 7 $/mese.
