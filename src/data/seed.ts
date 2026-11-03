/* Demo data. Stands in for ccpl-api + Centegy HIS until the backend lands:
   one household that signs in by phone, three doctors, a morning's worth of
   consultations so the portal has something in every column, and six weeks of
   finished ones (SEED_HISTORY) for the admin's performance charts. */

import type { AuditEvent, Consultation, Doctor, HealthProfile, Household, Member, TranscriptLine } from "@/lib/types";

/** Prototype sign-in (features/auth/login-screen.tsx) until ccpl-api auth is wired in.
    The patient account opens the demo household; the doctor account is Dr. Ayesha Khan;
    the admin account oversees the clinic (every doctor, schedule and the audit log). */
export const DEMO_ACCOUNTS = [
  { username: "patient", password: "123", role: "patient", label: "Patient view" },
  { username: "doctor", password: "123", role: "doctor", doctorId: "d-ayesha", label: "Doctor view" },
  { username: "admin", password: "123", role: "admin", label: "Admin view" },
] as const;

export const HOUSEHOLD: Household = {
  phone: "03001234567",
  policy: "SEHAT-JZ-2026-004812",
  partner: "Jazz · Sehat+",
  members: [
    { id: "m-hamza", name: "Hamza Iqbal", nameUr: "حمزہ اقبال", relation: "self", age: 34, gender: "M", mrn: "CTG-100482", coverage: "active" },
    { id: "m-sadia", name: "Sadia Hamza", nameUr: "سعدیہ حمزہ", relation: "spouse", age: 31, gender: "F", mrn: "CTG-100483", coverage: "active" },
    { id: "m-zara", name: "Zara Hamza", nameUr: "زارا حمزہ", relation: "child", age: 6, gender: "F", mrn: "CTG-100484", coverage: "active" },
    { id: "m-iqbal", name: "Muhammad Iqbal", nameUr: "محمد اقبال", relation: "parent", age: 68, gender: "M", mrn: "CTG-100485", coverage: "active" },
  ],
};

/** Health profiles the household already filled in. Sadia hasn't yet, so her first
    consultation asks for it; the doctor's safety check flags Hamza's penicillin allergy. */
export const SEED_PROFILES: Record<string, HealthProfile> = {
  "m-hamza": {
    bloodGroup: "B+", heightCm: "175", weightKg: "78", conditions: [],
    allergies: [{ kind: "medicine", name: "Penicillin", reaction: "Rash and itching" }],
    medicines: [], history: "", smoking: "never", family: ["diabetes"], updatedAt: Date.UTC(2026, 9, 12, 7),
  },
  "m-zara": {
    bloodGroup: "B+", heightCm: "116", weightKg: "20", conditions: [{ key: "asthma", since: "2023" }],
    allergies: [{ kind: "food", name: "Peanuts", reaction: "Swollen lips" }],
    medicines: [{ name: "Salbutamol inhaler", dose: "2 puffs when wheezy" }], history: "", smoking: "", family: ["asthma"], updatedAt: Date.UTC(2026, 9, 12, 7),
  },
  "m-iqbal": {
    bloodGroup: "O+", heightCm: "168", weightKg: "82",
    conditions: [{ key: "diabetes", since: "2015" }, { key: "hypertension", since: "2012" }],
    allergies: [],
    medicines: [{ name: "Metformin 500 mg", dose: "twice a day" }, { name: "Amlodipine 5 mg", dose: "once a day" }],
    history: "Cataract operation, left eye (2021)", smoking: "former", family: ["heart", "diabetes"], updatedAt: Date.UTC(2026, 9, 12, 7),
  },
};

export const DOCTORS: Doctor[] = [
  { id: "d-ayesha", name: "Dr. Ayesha Khan", initials: "AK", pmdc: "PMDC 48211-P", role: "gp", available: true },
  { id: "d-bilal", name: "Dr. Bilal Ahmed", initials: "BA", pmdc: "PMDC 51907-P", role: "gp", available: true },
  { id: "d-sana", name: "Dr. Sana Mirza", initials: "SM", pmdc: "PMDC 39554-P", role: "gp", available: false },
];

export const COMPLAINTS = [
  { key: "fever", en: "Fever", ur: "بخار" },
  { key: "cough", en: "Cough or cold", ur: "کھانسی یا نزلہ" },
  { key: "stomach", en: "Stomach upset", ur: "پیٹ کی خرابی" },
  { key: "skin", en: "Skin rash", ur: "جلد پر دانے" },
  { key: "headache", en: "Headache", ur: "سر درد" },
  { key: "other", en: "Something else", ur: "کچھ اور" },
] as const;

export const DURATIONS = [
  { key: "today", en: "Since today", ur: "آج سے" },
  { key: "1-3d", en: "1–3 days", ur: "1 سے 3 دن" },
  { key: "4-7d", en: "4–7 days", ur: "4 سے 7 دن" },
  { key: "1w+", en: "More than a week", ur: "ایک ہفتے سے زیادہ" },
] as const;

/** Any one of these sends the patient to emergency guidance, never the queue. */
export const RED_FLAGS = [
  { key: "chest", en: "Chest pain or pressure", ur: "سینے میں درد یا دباؤ" },
  { key: "breath", en: "Struggling to breathe", ur: "سانس لینے میں شدید دشواری" },
  { key: "faint", en: "Fainting or confusion", ur: "بے ہوشی یا الجھن" },
  { key: "stroke", en: "Face drooping, weak arm, slurred speech", ur: "چہرہ ٹیڑھا، بازو کمزور، بولنے میں دقت" },
  { key: "bleed", en: "Heavy bleeding", ur: "شدید خون بہنا" },
  { key: "seizure", en: "Seizure / fit", ur: "دورہ پڑنا" },
] as const;

/** The scripted call the prototype "transcribes" — Urdu/English code-switching,
    as a Karachi GP consult actually sounds. Played a line at a time. */
export const TRANSCRIPT_SCRIPT: Omit<TranscriptLine, "id" | "at">[] = [
  { speaker: "doctor", lang: "en", text: "Assalam-o-alaikum, I'm Dr. Ayesha. Can you hear me clearly?" },
  { speaker: "patient", lang: "ur", text: "وعلیکم السلام، جی آواز آ رہی ہے۔", gloss: "Wa-alaikum-salam, yes, I can hear you." },
  { speaker: "doctor", lang: "ur", text: "بتائیں، کیا مسئلہ ہے؟ بخار کب سے ہے؟", gloss: "Tell me, what's the problem? Since when have you had fever?" },
  { speaker: "patient", lang: "ur", text: "تین دن سے بخار ہے، رات کو زیادہ ہو جاتا ہے، اور گلا بھی خراب ہے۔", gloss: "Fever for three days, worse at night, and a sore throat too." },
  { speaker: "doctor", lang: "en", text: "Have you checked the temperature? How high has it gone?" },
  { speaker: "patient", lang: "en", text: "Yesterday it was 101, today morning 100." },
  { speaker: "doctor", lang: "ur", text: "کھانسی ہے؟ سانس لینے میں کوئی تکلیف؟", gloss: "Any cough? Any difficulty breathing?" },
  { speaker: "patient", lang: "ur", text: "ہلکی سی کھانسی ہے، سانس ٹھیک ہے۔", gloss: "A mild cough, breathing is fine." },
  { speaker: "doctor", lang: "en", text: "Any allergies to medicines? Penicillin?" },
  { speaker: "patient", lang: "en", text: "No allergies that I know of." },
  { speaker: "doctor", lang: "ur", text: "ٹھیک ہے، ذرا کیمرے کے سامنے منہ کھولیں، گلا دیکھنا ہے۔", gloss: "Okay, open your mouth in front of the camera, I want to see your throat." },
  { speaker: "doctor", lang: "en", text: "Throat looks red, no white patches. This looks viral." },
  { speaker: "doctor", lang: "ur", text: "پانی زیادہ پئیں، آرام کریں، دوائی میں لکھ رہی ہوں۔", gloss: "Drink plenty of water, rest — I'm writing the medicine." },
  { speaker: "patient", lang: "ur", text: "اگر بخار نہ اترے تو؟", gloss: "What if the fever doesn't come down?" },
  { speaker: "doctor", lang: "en", text: "If it's still there after three more days, or you feel breathless, book a follow-up or go to the ER." },
];

/** What "AI assist" offers as the transcript fills up — a draft, never a decision. */
export const AI_DRAFT = {
  summary: [
    "3 days of fever, worse at night (max 101°F yesterday, 100°F today).",
    "Sore throat and mild dry cough; no breathlessness.",
    "No known drug allergies.",
    "On camera: pharyngeal erythema, no exudate.",
  ],
  nextQuestions: [
    "Any body aches, rash or ear pain?",
    "Anyone else at home unwell?",
    "Already taken any medicine for the fever?",
  ],
  notes: {
    diagnosis: "Acute viral pharyngitis (J02.9)",
    plan: "Symptomatic care: antipyretic, fluids, rest, warm saline gargles. No antibiotic indicated — no exudate, no high fever.",
    followUp: "Review in 3 days if fever persists; ER sooner for breathlessness or inability to swallow.",
  },
  rx: [
    { drug: "Paracetamol 500 mg tablet", dose: "2 tablets", frequency: "Every 6 hours as needed", duration: "3 days", instructions: "Max 8 tablets in 24 hours. After food." },
    { drug: "Benzydamine 0.15% gargle", dose: "15 ml", frequency: "3 times a day", duration: "5 days", instructions: "Gargle and spit — do not swallow." },
  ],
};

const MIN = 60_000;
const now = Date.now();
const ago = (m: number) => now - m * MIN;

/** Other patients already in the system this morning (not from the demo household). */
function other(id: string, name: string, nameUr: string, age: number, gender: "M" | "F", mrn: string): Member {
  return { id, name, nameUr, relation: "self", age, gender, mrn, coverage: "active" };
}

const emptyNotes = { diagnosis: "", plan: "", followUp: "" };

export const SEED_CONSULTATIONS: Consultation[] = [
  {
    id: "DC-24109",
    householdPhone: "03007778888",
    member: other("x-faisal", "Faisal Qureshi", "فیصل قریشی", 52, "M", "CTG-118734"),
    lang: "en",
    status: "approved",
    createdAt: ago(64),
    consentAt: ago(63),
    symptoms: { complaint: "headache", duration: "4-7d", severity: 6, details: "Morning headaches, BP 150/95 at home.", redFlags: [] },
    prescriberId: "d-bilal",
    declinedBy: [],
    callStartedAt: ago(55),
    callEndedAt: ago(44),
    transcript: [
      { id: "t1", at: ago(55), speaker: "doctor", lang: "en", text: "Your home readings are consistently above 140 over 90." },
      { id: "t2", at: ago(54), speaker: "patient", lang: "ur", text: "جی، صبح سر بھی بھاری رہتا ہے۔", gloss: "Yes, and my head feels heavy in the mornings." },
      { id: "t3", at: ago(52), speaker: "doctor", lang: "en", text: "No chest pain, no vision changes? Good. We'll start a low dose and recheck in two weeks." },
    ],
    notes: {
      diagnosis: "Essential hypertension, newly diagnosed (I10)",
      plan: "Start amlodipine 5 mg OD. Low-salt diet, 30 min walk daily. Home BP log twice daily.",
      followUp: "Teleconsult in 2 weeks with BP log; baseline renal profile and lipids before then.",
    },
    rx: [
      { id: "rx1", drug: "Amlodipine 5 mg tablet", dose: "1 tablet", frequency: "Once daily, morning", duration: "30 days", instructions: "Do not stop without advice." },
    ],
    rxVersion: 1,
    approvedAt: ago(50),
  },
  {
    id: "DC-24112",
    householdPhone: "03451239876",
    member: other("x-hira", "Hira Siddiqui", "حرا صدیقی", 24, "F", "CTG-402215"),
    lang: "ur",
    status: "approved",
    createdAt: ago(41),
    consentAt: ago(40),
    symptoms: { complaint: "other", duration: "1-3d", severity: 4, details: "Burning when passing urine.", redFlags: [] },
    prescriberId: "d-ayesha",
    declinedBy: [],
    callStartedAt: ago(33),
    callEndedAt: ago(25),
    transcript: [
      { id: "t1", at: ago(33), speaker: "patient", lang: "ur", text: "پیشاب میں جلن ہے دو دن سے۔", gloss: "Burning while urinating for two days." },
      { id: "t2", at: ago(32), speaker: "doctor", lang: "en", text: "Any fever or back pain? Are you pregnant or could you be?" },
      { id: "t3", at: ago(31), speaker: "patient", lang: "ur", text: "نہیں، بخار نہیں ہے۔", gloss: "No, no fever." },
    ],
    notes: {
      diagnosis: "Uncomplicated lower UTI (N39.0)",
      plan: "Nitrofurantoin 5 days. Urine R/E and culture before first dose if possible. Fluids 2–3 L/day.",
      followUp: "Follow up in 5 days or earlier if fever, flank pain or vomiting.",
    },
    rx: [
      { id: "rx1", drug: "Nitrofurantoin 100 mg capsule", dose: "1 capsule", frequency: "Twice daily", duration: "5 days", instructions: "With food." },
    ],
    rxVersion: 1,
    approvedAt: ago(28),
  },
  {
    id: "DC-24101",
    householdPhone: "03009990000",
    member: other("x-ahmed", "Ahmed Raza", "احمد رضا", 38, "M", "CTG-117650"),
    lang: "en",
    status: "approved",
    createdAt: ago(150),
    consentAt: ago(149),
    symptoms: { complaint: "cough", duration: "4-7d", severity: 4, details: "Dry cough, worse at night.", redFlags: [] },
    prescriberId: "d-ayesha",
    declinedBy: [],
    callStartedAt: ago(140),
    callEndedAt: ago(128),
    approvedAt: ago(110),
    transcript: [],
    notes: { diagnosis: "Post-viral cough (R05)", plan: "Honey, steam inhalation, antihistamine at night.", followUp: "Review if cough lasts beyond 3 weeks." },
    rx: [{ id: "rx1", drug: "Cetirizine 10 mg tablet", dose: "1 tablet", frequency: "At night", duration: "7 days", instructions: "May cause drowsiness." }],
    rxVersion: 1,
  },
  {
    id: "DC-24096",
    householdPhone: "03125556666",
    member: other("x-maria", "Maria Fernandes", "ماریہ فرنینڈس", 45, "F", "CTG-309871"),
    lang: "en",
    status: "closed",
    createdAt: ago(240),
    consentAt: ago(239),
    symptoms: { complaint: "stomach", duration: "today", severity: 5, details: "Acidity after meals.", redFlags: [] },
    prescriberId: "d-bilal",
    declinedBy: [],
    callStartedAt: ago(230),
    callEndedAt: ago(221),
    approvedAt: ago(205),
    closedAt: ago(200),
    transcript: [],
    notes: { diagnosis: "Dyspepsia (K30)", plan: "PPI for 2 weeks, avoid late meals.", followUp: "None unless symptoms recur." },
    rx: [{ id: "rx1", drug: "Omeprazole 20 mg capsule", dose: "1 capsule", frequency: "Before breakfast", duration: "14 days", instructions: "" }],
    rxVersion: 1,
  },
  {
    id: "DC-24104",
    householdPhone: "03017773333",
    member: other("x-kamran", "Kamran Ali", "کامران علی", 59, "M", "CTG-120044"),
    lang: "ur",
    status: "emergency",
    createdAt: ago(95),
    consentAt: ago(94),
    symptoms: { complaint: "other", duration: "today", severity: 9, details: "", redFlags: ["chest"] },
    declinedBy: [],
    transcript: [],
    notes: emptyNotes,
    rx: [],
    rxVersion: 0,
  },
];

/** Six weeks of finished consultations before today, so the admin's doctor
    performance charts have a history. Deterministic (seeded random): weekdays
    only, inside clinic hours, each doctor at their own pace. Ids start "DC-H". */
export const SEED_HISTORY: Consultation[] = (() => {
  let seedN = 20261103;
  const rand = () => {
    seedN = (seedN * 1664525 + 1013904223) % 4294967296;
    return seedN / 4294967296;
  };
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const PATIENTS: [string, string, "M" | "F"][] = [
    ["Ali Raza", "علی رضا", "M"], ["Fatima Noor", "فاطمہ نور", "F"], ["Hassan Javed", "حسن جاوید", "M"], ["Ayesha Siddiqa", "عائشہ صدیقہ", "F"],
    ["Bilal Hussain", "بلال حسین", "M"], ["Mariam Khalid", "مریم خالد", "F"], ["Usman Ghani", "عثمان غنی", "M"], ["Sana Tariq", "ثنا طارق", "F"],
    ["Imran Shah", "عمران شاہ", "M"], ["Zainab Akhtar", "زینب اختر", "F"], ["Kashif Mehmood", "کاشف محمود", "M"], ["Nida Farooq", "ندا فاروق", "F"],
  ];
  const CASES = [
    { complaint: "fever", dx: "Viral upper respiratory infection (J06.9)", drug: "Paracetamol 500 mg tablet" },
    { complaint: "cough", dx: "Acute bronchitis (J20.9)", drug: "Dextromethorphan syrup" },
    { complaint: "stomach", dx: "Acute gastroenteritis (A09)", drug: "ORS sachets" },
    { complaint: "skin", dx: "Contact dermatitis (L25.9)", drug: "Hydrocortisone 1% cream" },
    { complaint: "headache", dx: "Tension-type headache (G44.2)", drug: "Ibuprofen 400 mg tablet" },
  ];
  // Consultations per weekday: Ayesha busiest, Bilal steady, Sana part-time.
  const PACE: [string, number][] = [["d-ayesha", 3.2], ["d-bilal", 2.4], ["d-sana", 1.1]];
  const DAY = 86_400_000;
  const out: Consultation[] = [];
  let n = 0;
  for (let d = 42; d >= 1; d--) {
    // Clinic day in Pakistan time (UTC+5): 9 AM there is 04:00 UTC.
    const day = new Date(now - d * DAY);
    const start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 4, 0);
    const weekday = new Date(start + 5 * 3_600_000).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    for (const [doctorId, pace] of PACE) {
      const count = Math.max(0, Math.round(pace + (rand() - 0.5) * 2.4));
      for (let i = 0; i < count; i++) {
        n += 1;
        const [name, nameUr, gender] = pick(PATIENTS);
        const c = pick(CASES);
        const createdAt = start + Math.floor(rand() * 8.5 * 60) * MIN;
        const wait = (2 + Math.floor(rand() * (doctorId === "d-sana" ? 18 : 10))) * MIN;
        const callStartedAt = createdAt + MIN + wait;
        const callEndedAt = callStartedAt + (6 + Math.floor(rand() * 13)) * MIN;
        const prescribed = rand() > (doctorId === "d-bilal" ? 0.18 : 0.08);
        out.push({
          id: `DC-H${String(n).padStart(4, "0")}`,
          householdPhone: `0300${String(1000000 + n).slice(-7)}`,
          member: other(`x-h${n}`, name, nameUr, 22 + Math.floor(rand() * 50), gender, `CTG-${String(500000 + n)}`),
          lang: rand() > 0.5 ? "ur" : "en",
          // Every one is finished; some ended with advice only (no prescription).
          status: "closed",
          createdAt,
          consentAt: createdAt + MIN,
          symptoms: { complaint: c.complaint, duration: "1-3d", severity: 3 + Math.floor(rand() * 5), details: "", redFlags: [] },
          prescriberId: doctorId,
          declinedBy: [],
          callStartedAt,
          callEndedAt,
          approvedAt: callEndedAt,
          closedAt: callEndedAt,
          transcript: [],
          notes: prescribed ? { diagnosis: c.dx, plan: "As discussed on the call.", followUp: "If no better in 3 days." } : emptyNotes,
          rx: prescribed ? [{ id: "rx1", drug: c.drug, dose: "As directed", frequency: "As directed", duration: "5 days", instructions: "" }] : [],
          rxVersion: prescribed ? 1 : 0,
        });
      }
    }
  }
  return out;
})();

export const SEED_AUDIT: AuditEvent[] = [
  { id: "a1", at: ago(240), consultId: "DC-24096", actor: "Maria Fernandes", actorRole: "patient", action: "Signed in", detail: "Phone OTP verified" },
  { id: "a2", at: ago(205), consultId: "DC-24096", actor: "Dr. Bilal Ahmed", actorRole: "doctor", action: "Approved prescription v1", detail: "AI draft checked by the doctor" },
  { id: "a3", at: ago(200), consultId: "DC-24096", actor: "Dr. Bilal Ahmed", actorRole: "doctor", action: "Closed consultation" },
  { id: "a4", at: ago(110), consultId: "DC-24101", actor: "Dr. Ayesha Khan", actorRole: "doctor", action: "Approved prescription v1", detail: "AI draft checked by the doctor" },
  { id: "a5", at: ago(94), consultId: "DC-24104", actor: "Platform", actorRole: "platform", action: "Red flag — emergency guidance shown", detail: "Chest pain or pressure" },
  { id: "a6", at: ago(44), consultId: "DC-24109", actor: "AI assist", actorRole: "ai", action: "Drafted notes & prescription", detail: "From the call transcript — for the doctor to check" },
  { id: "a7", at: ago(25), consultId: "DC-24112", actor: "AI assist", actorRole: "ai", action: "Drafted notes & prescription", detail: "From the call transcript — for the doctor to check" },
];


