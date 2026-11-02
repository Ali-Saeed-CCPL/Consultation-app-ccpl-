# Crescent Care — Digital Consultation (frontend, iteration 1)

Partner app for the CCPL ERP: patient video consultations, the doctor portal,
and AI-drafted prescriptions approved by the consulting doctor, following the "Patient journey" flow.

Same stack and design system as `CCPL-ERP-Frontend`: Vite 8, React 19,
TanStack Router (file routes) + Query, Tailwind 4, zustand, lucide, sonner.
`src/styles/tokens.css` is copied verbatim from the ERP; `src/index.css` is the
ERP's base layer plus a few additions at the end (Urdu font, call animations).

```bash
npm install
npm run dev        # http://localhost:5175
```

## Routes

| Path | What |
| --- | --- |
| `/login` | Shared sign-in for patients and doctors (`/` redirects here) |
| `/patient/choose` … `/patient/records` | Choose patient → consent → symptoms + red flags → queue → video consult → Rx & records. English / Urdu (RTL). |
| `/portal/dashboard` | KPIs, consultation pipeline, live queue, needs attention, doctors on duty |
| `/portal/consultations/$id` | Consult room: video, live transcript, AI assist; after the call, check the AI-drafted notes & prescription and approve & release |
| `/portal/audit` | Audit log |

## Prototype notes

- No backend yet. `src/store/consult-store.ts` stands in for ccpl-api: queueing,
  GP assignment, call state, the AI draft, the doctor's approval and the audit log. It persists
  to localStorage and re-reads on other tabs' writes, so a patient tab and a
  doctor tab ring each other like the real WebSocket push.
- Demo sign-in (`src/data/seed.ts` DEMO_ACCOUNTS): `patient` / `123` opens the
  patient app, `doctor` / `123` opens the portal as Dr. Ayesha Khan. There's no cover
  check for now — everyone on the policy is eligible.
- Video (LiveKit), the transcript service and AI assist are simulated; the call
  plays a scripted Urdu–English consult.
- One doctor per consultation: when the call ends AI assist drafts the notes &
  prescription, and the same doctor edits and approves them, which releases the
  prescription to the patient. "Reset demo data" is in the account menu.
