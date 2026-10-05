/**
 * Import una tantum del foglio Google "ISCRIZIONE AI CORSI" (esportato in CSV).
 *
 *   npm run import:foglio -- import/file.csv              -> solo anteprima, non scrive nulla
 *   npm run import:foglio -- import/file.csv --conferma   -> scrive nel database
 *
 * Opzioni: --inizio=2026-10-01 (inizio abbonamenti), --corsi-dal=2026-09-01 --corsi-al=2027-06-30 (date dei corsi creati)
 * Il database è quello di DATABASE_URL (variabile d'ambiente o .env).
 * Le persone già presenti (stesso telefono, email o nome e cognome) vengono saltate: lo script si può rilanciare.
 */
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient, type ContactStatus, type SubscriptionType } from "@prisma/client";
import { formatDate, parseDay, todayString } from "../src/lib/dates";
import { CARNET_ENTRIES, computeEndDate } from "../src/lib/subscriptions";

const EXPECTED_HEADER = ["NOME", "COGNOME", "TELEFONO", "EMAIL", "", "PROVA OPEN DAY", "REFERENTE", "CONTATTATI", "PROVA GRATUITA",
  "MODULO DI TESSERAMENTO", "PAGAMENTO QUOTA ASSOCIATIVA", "ABBONAMENTO", "PAGAMENTO ABBONAMENTO", "CERTIFICATO MEDICO",
  "PROSSIMA SCADENZA", "INCASSATO"];

/**
 * Righe con nome e cognome invertiti nel foglio: una per riga in import/nomi-invertiti.txt,
 * scritte come nel foglio ("NOME COGNOME"). Il file sta in import/ (fuori da git) perché contiene nomi di persone.
 */
const SWAPPED_FILE = "import/nomi-invertiti.txt";
const SWAPPED = new Set(
  existsSync(SWAPPED_FILE)
    ? readFileSync(SWAPPED_FILE, "utf8")
        .split(/\r?\n/)
        .map((l) => l.trim().replace(/\s+/g, " ").toLowerCase())
        .filter(Boolean)
    : [],
);

const COURSE_NAMES: Record<string, string> = {
  "TAI CHI": "Tai Chi",
  "GINNASTICA POSTURALE": "Ginnastica Posturale",
  "MENTAL SQUAT": "Mental Squat",
  YOGA: "Yoga",
};

const SUB_TYPES: Record<string, SubscriptionType> = {
  MENSILE: "MENSILE",
  TRIMESTRALE: "TRIMESTRALE",
  ANNUALE: "ANNUALE",
  CARNET: "CARNET",
};

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const STATUS_ORDER: ContactStatus[] = ["DA_CONTATTARE", "CONTATTATO", "PROVA", "ISCRITTO"];

// ---------- parametri ----------
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const confirm = args.includes("--conferma");
const opt = (name: string, def: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const SUB_START = parseDay(opt("inizio", "2026-10-01"));
const COURSE_FROM = parseDay(opt("corsi-dal", "2026-09-01"));
const COURSE_TO = parseDay(opt("corsi-al", "2027-06-30"));
if (!file) {
  console.error("Uso: npm run import:foglio -- <file.csv> [--conferma]");
  process.exit(1);
}

// ---------- CSV ----------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const clean = (s = "") => s.trim().replace(/\s+/g, " ");
const yes = (s = "") => /^s[iì]\b/i.test(clean(s));
const capitalize = (s: string) =>
  clean(s)
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
const phoneKey = (s = "") => s.replace(/\D/g, "");

function parseExpiry(value: string, start: Date): Date | null {
  const m = clean(value).toLowerCase().match(/^(\d{1,2})\s+([a-z]+)$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  const year = start.getUTCFullYear();
  const d = new Date(Date.UTC(year, month, Number(m[1])));
  return d >= start ? d : new Date(Date.UTC(year + 1, month, Number(m[1])));
}

// ---------- lettura e normalizzazione ----------
type Row = {
  line: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  course: string;
  status: ContactStatus;
  referent: string | null;
  notes: string[];
  membershipForm: boolean;
  feePaid: boolean;
  certificate: boolean;
  sub: { type: SubscriptionType; start: Date; end: Date; endFromSheet: boolean } | null;
  amount: number | null;
};

const raw = parseCsv(readFileSync(file, "utf8"));
const header = raw[0].map((h) => clean(h).toUpperCase());
if (EXPECTED_HEADER.some((h, i) => header[i] !== h)) {
  console.error("Intestazione del CSV diversa da quella attesa:\n ", header.join(" | "));
  process.exit(1);
}

const warnings: string[] = [];
const rows: Row[] = raw.slice(1).map((r, idx) => {
  const line = idx + 2;
  let [firstName, lastName] = [capitalize(r[0]), capitalize(r[1])];
  if (SWAPPED.has(`${clean(r[0])} ${clean(r[1])}`.toLowerCase())) {
    [firstName, lastName] = [lastName, firstName];
    warnings.push(`riga ${line}: nome e cognome invertiti nel foglio → ${firstName} ${lastName}`);
  }
  const courseKey = clean(r[4]).toUpperCase();
  const course = COURSE_NAMES[courseKey] ?? capitalize(r[4]);
  const subKey = clean(r[11]).toUpperCase();
  const subType = SUB_TYPES[subKey];
  const contacted = clean(r[7]);

  const status: ContactStatus = subType ? "ISCRITTO" : yes(r[8]) ? "PROVA" : contacted ? "CONTATTATO" : "DA_CONTATTARE";

  const notes: string[] = [];
  if (contacted && !yes(contacted)) notes.push(`[${course}] ${contacted}`);
  if (yes(r[5])) notes.push(`[${course}] Ha partecipato all'open day`);
  const modulo = clean(r[9]);
  if (modulo && !yes(modulo) && modulo.toUpperCase() !== "NO") notes.push(`[${course}] Modulo di tesseramento: ${modulo}`);
  if (yes(r[10])) notes.push("Quota associativa pagata (importo non indicato nel foglio)");
  if (yes(r[13])) notes.push("Certificato medico consegnato: inserire la data di scadenza");
  if (subType && !yes(r[12])) notes.push(`[${course}] Abbonamento ${subKey.toLowerCase()} NON ancora pagato`);

  let sub: Row["sub"] = null;
  if (subType) {
    const fromSheet = parseExpiry(r[14], SUB_START);
    const computed = computeEndDate(subType, SUB_START);
    if (fromSheet && fromSheet.getTime() !== computed.getTime()) {
      warnings.push(`riga ${line}: scadenza nel foglio ${formatDate(fromSheet)} ≠ calcolata ${formatDate(computed)} (uso quella del foglio)`);
    }
    sub = { type: subType, start: SUB_START, end: fromSheet ?? computed, endFromSheet: !!fromSheet };
  }

  const amount = clean(r[15]) ? Number(clean(r[15]).replace(",", ".")) : null;
  if (amount !== null && Number.isNaN(amount)) warnings.push(`riga ${line}: importo "${r[15]}" non valido, ignorato`);

  return {
    line,
    firstName,
    lastName,
    phone: phoneKey(r[2]) || null,
    email: clean(r[3]).toLowerCase() || null,
    course,
    status,
    referent: clean(r[6]) || null,
    notes,
    membershipForm: yes(modulo),
    feePaid: yes(r[10]),
    certificate: yes(r[13]),
    sub,
    amount: amount !== null && !Number.isNaN(amount) ? amount : null,
  };
});

// ---------- raggruppamento per persona ----------
type Person = { rows: Row[]; firstName: string; lastName: string; phone: string | null; email: string | null };
const nameKey = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.toLowerCase();
const people: Person[] = [];
for (const row of rows) {
  const p = people.find(
    (x) => (row.phone && x.phone === row.phone) || (row.email && x.email === row.email) || nameKey(x) === nameKey(row),
  );
  if (p) {
    p.rows.push(row);
    p.phone ??= row.phone;
    p.email ??= row.email;
    warnings.push(`riga ${row.line}: ${row.firstName} ${row.lastName} unita alla riga ${p.rows[0].line} (stessa persona, più corsi)`);
  } else people.push({ rows: [row], firstName: row.firstName, lastName: row.lastName, phone: row.phone, email: row.email });
}

// ---------- scrittura ----------
const prisma = new PrismaClient();

async function main() {
  const dbHost = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/[/?].*$/, "");
  console.log(`\nDatabase: ${dbHost || "(DATABASE_URL non impostato)"}`);
  console.log(`Righe nel foglio: ${rows.length} → persone: ${people.length}`);
  console.log(`Inizio abbonamenti: ${formatDate(SUB_START)} · data pagamenti: ${formatDate(parseDay(todayString()))}\n`);

  const existingCourses = await prisma.course.findMany();
  const courseNames = [...new Set(rows.map((r) => r.course))];
  const missingCourses = courseNames.filter((n) => !existingCourses.some((c) => c.name.toLowerCase() === n.toLowerCase()));

  let skipped = 0;
  const plan: { person: Person; status: ContactStatus }[] = [];
  for (const person of people) {
    const or = [
      person.phone && { phone: person.phone },
      person.email && { email: person.email },
      { firstName: { equals: person.firstName, mode: "insensitive" as const }, lastName: { equals: person.lastName, mode: "insensitive" as const } },
    ].filter(Boolean) as object[];
    if (await prisma.member.findFirst({ where: { OR: or } })) {
      console.log(`  = già presente, salto: ${person.lastName} ${person.firstName}`);
      skipped++;
      continue;
    }
    const status = person.rows.map((r) => r.status).reduce((a, b) => (STATUS_ORDER.indexOf(b) > STATUS_ORDER.indexOf(a) ? b : a));
    plan.push({ person, status });
  }

  const label: Record<ContactStatus, string> = { DA_CONTATTARE: "da contattare", CONTATTATO: "contattato", PROVA: "in prova", ISCRITTO: "iscritto" };
  for (const { person, status } of plan) {
    const parts = person.rows.map((r) => {
      const bits = [r.course];
      if (r.status === "ISCRITTO" || r.status === "PROVA") bits.push("iscrizione al corso");
      else bits.push("solo interesse");
      if (r.sub) bits.push(`${r.sub.type.toLowerCase()} ${formatDate(r.sub.start)}→${formatDate(r.sub.end)}`);
      if (r.amount) bits.push(`pagamento ${r.amount} €`);
      return bits.join(", ");
    });
    console.log(`  + ${`${person.lastName} ${person.firstName}`.padEnd(26)} ${label[status].padEnd(14)} ${parts.join(" | ")}`);
  }

  const counts = STATUS_ORDER.map((s) => `${label[s]}: ${plan.filter((p) => p.status === s).length}`).join(", ");
  const enroll = plan.flatMap((p) => p.person.rows).filter((r) => r.status === "PROVA" || r.status === "ISCRITTO").length;
  const subs = plan.flatMap((p) => p.person.rows).filter((r) => r.sub).length;
  const pays = plan.flatMap((p) => p.person.rows).filter((r) => r.amount).length;
  console.log(`\nRiepilogo: ${plan.length} persone da creare (${counts}), ${skipped} già presenti`);
  console.log(`           ${enroll} iscrizioni ai corsi, ${subs} abbonamenti, ${pays} pagamenti`);
  if (missingCourses.length) console.log(`           corsi da creare: ${missingCourses.join(", ")} (${formatDate(COURSE_FROM)} → ${formatDate(COURSE_TO)}, senza orari né istruttore)`);
  if (warnings.length) console.log(`\nNote:\n${warnings.map((w) => `  - ${w}`).join("\n")}`);

  if (!confirm) {
    console.log("\nANTEPRIMA: nessun dato scritto. Rilancia con --conferma per importare.\n");
    return;
  }

  const courses = new Map(existingCourses.map((c) => [c.name.toLowerCase(), c.id]));
  for (const name of missingCourses) {
    const c = await prisma.course.create({ data: { name, startDate: COURSE_FROM, endDate: COURSE_TO } });
    courses.set(name.toLowerCase(), c.id);
  }

  const paymentDate = parseDay(todayString());
  for (const { person, status } of plan) {
    const rs = person.rows;
    const interest = rs.filter((r) => r.status === "DA_CONTATTARE" || r.status === "CONTATTATO").map((r) => r.course);
    const notes = [
      `Importato dal foglio iscrizioni (${todayString()}).`,
      interest.length ? `Interessato/a a: ${interest.join(", ")}` : null,
      ...new Set(rs.flatMap((r) => r.notes)),
    ].filter(Boolean);

    await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          firstName: person.firstName,
          lastName: person.lastName,
          phone: person.phone,
          email: person.email,
          contactStatus: status,
          referent: [...new Set(rs.map((r) => r.referent).filter(Boolean))].join(" / ") || null,
          membershipForm: rs.some((r) => r.membershipForm),
          incomplete: status === "PROVA" || status === "ISCRITTO",
          notes: notes.join("\n"),
        },
      });
      for (const r of rs) {
        if (r.status !== "PROVA" && r.status !== "ISCRITTO") continue;
        const courseId = courses.get(r.course.toLowerCase())!;
        const enrollment = await tx.enrollment.upsert({
          where: { memberId_courseId: { memberId: member.id, courseId } },
          create: { memberId: member.id, courseId },
          update: {},
        });
        if (r.sub) {
          await tx.subscription.create({
            data: {
              enrollmentId: enrollment.id,
              type: r.sub.type,
              startDate: r.sub.start,
              endDate: r.sub.end,
              entries: r.sub.type === "CARNET" ? CARNET_ENTRIES : null,
              notes: "Importato dal foglio",
            },
          });
        }
        if (r.amount) {
          await tx.payment.create({
            data: {
              memberId: member.id,
              courseId,
              amount: r.amount,
              date: paymentDate,
              method: "ALTRO",
              reason: "CORSO",
              notes: `Importato dal foglio (colonna INCASSATO${r.feePaid ? ", può includere la quota associativa" : ""})`,
            },
          });
        }
      }
    });
  }
  console.log(`\nIMPORT COMPLETATO: ${plan.length} persone create.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
