# SportX Gestionale â€” obiettivi e stato

> Documento di riferimento del progetto: va aggiornato a ogni sessione di lavoro.
> Ultimo aggiornamento: 2026-10-05

## Obiettivo

Mini gestionale per **ASD SportX** (corsi di fitness): anagrafica iscritti, iscrizioni ai corsi, pagamenti,
certificati medici e presenze. Deve essere usato online da soci (admin) e istruttori, a costo zero o quasi.

### Ruoli

| Ruolo | Cosa puÃ² fare |
|---|---|
| **Admin** | Tutto: iscritti (anagrafica completa), certificati, pagamenti, corsi, orari, lezioni, utenti/istruttori, calendario di tutti i corsi |
| **Istruttore** | Calendario delle lezioni **dei propri corsi**, registrazione presenze, aggiunta rapida di una persona (nome, cognome, email, telefono), note/annullamento lezione |

### Abbonamenti

Ogni iscrizione a un corso ha uno o piÃ¹ abbonamenti (storico, rinnovi):

| Tipo | ValiditÃ  | Ingressi |
|---|---|---|
| Mensile | fino a **fine del mese** di inizio (es. 1/10 â†’ 31/10) | illimitati |
| Trimestrale | fino a **fine del terzo mese**, mese di inizio compreso (es. 1/10 â†’ 31/12) | illimitati |
| Annuale | fino al primo **30 giugno** successivo all'inizio | illimitati |
| Carnet | fino al primo **28 febbraio** successivo all'inizio | **10** |

- Data di fine e prezzo vengono proposti automaticamente (listino del corso), ma sono modificabili.
- Ogni corso ha un listino con 4 prezzi (mensile, trimestrale, annuale, carnet).
- I **pagamenti sono separati**: registrare l'abbonamento non registra il pagamento.
- Il carnet consuma un ingresso per ogni presenza nel suo periodo; le presenze giÃ  coperte da un abbonamento a tempo non consumano il carnet; piÃ¹ carnet si consumano in ordine di acquisto.
- Abbonamento scaduto / carnet esaurito / nessun abbonamento: **solo avviso** all'istruttore (la presenza si puÃ² segnare comunque) e voce "Abbonamenti da rinnovare" in dashboard admin. "In scadenza" = mancano â‰¤ 7 giorni o â‰¤ 1 ingresso.
- Logica in `src/lib/subscriptions.ts` (pura, condivisa client/server), caricamento stati in `src/lib/subscription-status.ts`.

> Regola cambiata il 2026-10-05: prima erano 4/12 settimane, ma il foglio usato dall'associazione ragiona a mesi di calendario.

### Stato contatto

Ogni persona ha uno stato: **Da contattare â†’ Contattato â†’ In prova â†’ Iscritto**, piÃ¹ il **referente** (socio che la segue, es. NICO, MARI) e il flag "modulo di tesseramento firmato".
- Chi viene aggiunto al volo dall'istruttore entra come "In prova" (se era giÃ  in lista come contatto, viene riconosciuto da email o telefono e promosso a "In prova").
- Assegnare un abbonamento porta la persona a "Iscritto".
- La dashboard mostra il conteggio per stato; "Abbonamenti da rinnovare" considera solo gli Iscritti.

### Accesso
- Login con **email + password**. Gli account li crea un admin.
- Primo accesso con password **`SportX2026!`**: il cambio password Ã¨ obbligatorio (min. 8 caratteri, diversa da quella iniziale).
- L'admin puÃ² reimpostare la password di un utente (torna a `SportX2026!`) o disattivarne l'accesso.

## Stack e scelte

- **Next.js 15** (App Router, Server Actions) + TypeScript + **Tailwind CSS v4**
- **Prisma 6** + **PostgreSQL** (Neon in produzione)
- Auth fatta in casa: `bcryptjs` + JWT firmato con `jose` in cookie httpOnly (`src/lib/session.ts`, `src/lib/auth.ts`).
  Il middleware fa un controllo veloce sul cookie; ogni pagina/azione ricontrolla utente e ruolo sul DB (`requireUser` / `requireAdmin`).
- Validazione con `zod`. Date "solo giorno" salvate come mezzanotte UTC: usare sempre gli helper di `src/lib/dates.ts`.
- Hosting previsto: **Vercel** (Hobby, gratis) + **Neon** (Free, 0.5 GB).
- Sviluppo locale: Postgres "finto" con **PGlite** (`npm run db:local`), niente Docker nÃ© installazioni.
- Certificato medico: si salvano solo tipo e date (rilascio/scadenza), **nessun file** caricato, per ridurre i dati sanitari trattati.

### Palette (dal logo)
Verde `#036B3A` Â· Viola `#9966FF` Â· Arancio `#FF6B00` / `#FFA200`. Titoli in *Russo One*, testo in *Inter*.
Il logo "X" Ã¨ ricreato in SVG in `src/components/Logo.tsx`.

## Modello dati (`prisma/schema.prisma`)

- `User` â€” admin e istruttori (email, nome, ruolo, hash password, `mustChangePassword`, `active`)
- `Member` â€” persona (contatto o iscritto): `contactStatus`, `referent`, `membershipForm`; `incomplete=true` se l'anagrafica Ã¨ da completare
- `MedicalCertificate` â€” tipo, data rilascio, data scadenza
- `Course` â†’ `CourseSlot` (orari settimanali ricorrenti) â†’ `Lesson` (singole lezioni generate dagli orari + lezioni extra)
- `Course` ha anche il listino: `priceMonthly`, `priceQuarterly`, `priceYearly`, `priceCarnet`
- `Enrollment` â€” iscritto â†” corso, stato ATTIVA/SOSPESA/TERMINATA
- `Subscription` â€” abbonamento di un'iscrizione: tipo, inizio, fine, ingressi (carnet), prezzo, note
- `Payment` â€” importo, data, metodo, causale (quota associativa / corso / altro), corso, periodo
- `Attendance` â€” presenza/assenza per lezione e iscritto

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
- [x] Stato contatto + referente + modulo tesseramento (2026-10-05)
- [x] Eliminazione corso (con conferma che elenca cosa viene cancellato; i pagamenti restano senza corso)
- [x] Script di import del foglio Google "ISCRIZIONE AI CORSI" (`scripts/import-foglio.ts`), provato in locale: 44 righe â†’ 42 persone
- [ ] **Import in produzione** del foglio (lo lancia Alberto con la stringa Neon, vedi sotto)
- [ ] Primo accesso admin in produzione e creazione degli istruttori
- [ ] Dopo l'import: assegnare istruttori e orari ai corsi creati (Tai Chi, Ginnastica Posturale, Mental Squat, Yoga), inserire scadenze certificati

## Idee / prossimi passi

- Collegare un pagamento a un abbonamento (oggi sono separati per scelta) e mostrare "abbonamento non pagato"
- Sospensione abbonamento (es. infortunio) che sposta la scadenza

- Esportazione CSV (iscritti, pagamenti, presenze) per la contabilitÃ 
- Promemoria scadenza certificati via email
- Statistiche presenze per corso (percentuale di frequenza)
- Stagione sportiva (es. setâ€“ago) per la quota associativa annuale e indicatore "quota pagata"
- Stampa modulo di iscrizione / ricevuta pagamento
- Caricare il logo originale (PDF/PNG) in `public/` al posto dell'SVG ricreato

## Import del foglio Google

Il CSV va in `import/` (cartella **esclusa da git**: contiene dati personali e il repo Ã¨ pubblico).

```powershell
cd C:ProgettiSportX
$env:DATABASE_URL="<stringa Neon>"                               # senza: usa il DB locale di .env
npm run import:foglio -- importiscrizioni-2026-09-19.csv              # anteprima, non scrive
npm run import:foglio -- importiscrizioni-2026-09-19.csv --conferma   # importa
```

Regole dello script:
- stato: abbonamento â†’ Iscritto; prova gratuita SI â†’ In prova; colonna "Contattati" compilata â†’ Contattato; altrimenti Da contattare
- stessa persona su piÃ¹ righe (stesso telefono/email/nome) = una sola persona con piÃ¹ corsi
- iscrizione al corso solo per chi Ã¨ In prova o Iscritto; per gli altri il corso finisce nelle note ("Interessato/a a")
- abbonamenti con inizio 1/10/2026 (`--inizio=`), scadenza dal foglio o calcolata
- colonna INCASSATO â†’ un pagamento (metodo "Altro", data dell'import); quota associativa, certificato, open day, note â†’ nelle note
- corsi mancanti creati dal 1/9/2026 al 30/6/2027, senza orari nÃ© istruttore
- persone giÃ  presenti nel DB vengono saltate (si puÃ² rilanciare)
- nomi e cognomi invertiti nel foglio: elencarli in `import/nomi-invertiti.txt` (uno per riga, come scritti nel foglio)

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
   - la connection string **pooled** â†’ `DATABASE_URL`
   - la connection string **diretta** (senza `-pooler`) â†’ `DIRECT_URL`
2. **Vercel** (vercel.com, login con GitHub): "Add New Project" â†’ importa `albertoperuzzu/SportX`.
   Variabili d'ambiente: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (stringa casuale lunga), `ADMIN_EMAIL`.
3. Vercel usa lo script `vercel-build`: genera il client Prisma, applica le migration, esegue il seed (crea l'admin solo se non esiste) e fa la build.
4. Primo accesso con `ADMIN_EMAIL` + `SportX2026!`, poi crea gli istruttori da "Utenti".

### Costi
- Vercel Hobby + Neon Free = **0 â‚¬**. Neon va in pausa dopo qualche minuto di inattivitÃ  e si riattiva in circa 1 s.
  Vercel Hobby Ã¨ per uso non commerciale: un gestionale interno di un'ASD ci rientra ragionevolmente, altrimenti Pro = 20 $/mese.
- Alternative economiche: VPS Hetzner ~4-5 â‚¬/mese, Railway ~5 $/mese, Render Starter 7 $/mese.
