# eGuarantee Demo Site — Design Spec
_Date: 2026-06-25_

## Overview

A web app that lets a bank officer create an electronic Banker's Guarantee (eBG) as a signed W3C Verifiable Credential and download it. The downloaded `signed_vc.json` can be verified on trustvc.io / ref.tradetrust.io.

**Two user personas, two separate concerns:**

| Persona | Interaction | Tooling |
|---|---|---|
| Bank officer (end user) | Opens the app, fills the form, previews, downloads `signed_vc.json` | Web UI |
| Bank admin (IT) | One-time identity setup: generate keypair, publish `did.json`, set DNS TXT record | `npm run setup` CLI script |

The end user never sees keys, DIDs, or setup. The app reads a pre-configured `.env` and signs.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS | Brief recommendation; Tailwind fits the modern fintech visual direction |
| Form state | React Hook Form | Performant, great TS support, full layout control |
| Validation | Zod | Pair with RHF; derive schema from the brief's JSON Schema rules |
| Backend | Node.js + Express + TypeScript | Simple signing API; holds private key server-side |
| Signing | `@trustvc/trustvc` (`signW3C`) + `@trustvc/w3c-issuer` | TrustVC SDK, ECDSA-SD-2023 suite, DM 2.0 |
| Dev server | `concurrently` — Vite + `tsx watch` for Express | Single `npm run dev` starts both |

---

## Visual Design

- **Style:** Modern fintech — indigo (`#6366f1`) primary, white/slate background, rounded corners, system-sans font
- **Layout:** Split panel — scrollable form on the left (45%), rendered guarantee + raw VC JSON on the right (55%)
- **Nav bar:** App name left, `did:web:…` identity badge right (green check once configured)

---

## Project Structure

```
/src                        ← Vite React frontend
  /form
    GuaranteeForm.tsx       ← 13-field form (React Hook Form + Zod)
    schema.ts               ← Zod schema derived from brief's JSON Schema
    fields/                 ← individual field components (input, date, etc.)
  /vc
    assembleVC.ts           ← pure fn: FormData → unsigned W3C VC (DM 2.0)
  /renderer
    GuaranteePreview.tsx    ← renders the 4-clause BG template from VC subject
    VcJsonViewer.tsx        ← collapsible raw JSON block
  /sample
    sampleInput.ts          ← pre-filled example values from brief
  App.tsx
  main.tsx

/server
  index.ts                  ← Express app entry
  /routes
    vc.ts                   ← POST /api/vc/sign
  /services
    signVC.ts               ← calls signW3C from @trustvc/trustvc

/scripts
  setup.ts                  ← admin CLI: generate keypair + did.json + print instructions

/keys                       ← gitignored: keypair.json, did.json output
.env                        ← gitignored: DID_WEB, VITE_DID_WEB, PORT
.env.example                ← committed: shows required env var names (no values)
```

---

## Data Fields

Exactly 13 fields, all required. Source: brief Section 2.

| Key | Label | Type | Validation |
|---|---|---|---|
| `bgNumber` | Guarantee Reference Number | text | non-empty |
| `issueDate` | Date of Issue | date | valid YYYY-MM-DD |
| `expiryDate` | Expiry Date | date | valid YYYY-MM-DD, after `issueDate` |
| `issuingBankName` | Issuing Bank (full legal name) | text | non-empty |
| `issuingBankSwift` | Issuing Bank SWIFT/BIC | text | `^[A-Z0-9]{8}([A-Z0-9]{3})?$` |
| `applicantName` | Applicant (full legal name) | text | non-empty |
| `applicantAddress` | Applicant Registered Address | text | non-empty |
| `beneficiaryName` | Beneficiary (full legal name) | text | non-empty |
| `beneficiaryAddress` | Beneficiary Registered Address | text | non-empty |
| `underlyingContract` | Underlying Contract / Tender Reference | text | non-empty |
| `currency` | Currency (ISO 4217) | text | `^[A-Z]{3}$` |
| `amount` | Guarantee Amount | number | > 0 |
| `placeOfPresentation` | Place of Presentation | text | non-empty |

**Cross-field rule (Zod `.superRefine`):** `expiryDate` must be strictly after `issueDate`. This cannot be expressed in JSON Schema alone and is implemented as a custom Zod refinement.

---

## Zod Schema

```typescript
// src/form/schema.ts
import { z } from 'zod';

export const guaranteeSchema = z.object({
  bgNumber: z.string().min(1),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => !isNaN(Date.parse(d))),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => !isNaN(Date.parse(d))),
  issuingBankName: z.string().min(1),
  issuingBankSwift: z.string().regex(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/),
  applicantName: z.string().min(1),
  applicantAddress: z.string().min(1),
  beneficiaryName: z.string().min(1),
  beneficiaryAddress: z.string().min(1),
  underlyingContract: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number().positive(),
  placeOfPresentation: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.issueDate && data.expiryDate && data.expiryDate <= data.issueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expiry date must be after issue date',
      path: ['expiryDate'],
    });
  }
});

export type GuaranteeFormData = z.infer<typeof guaranteeSchema>;
```

---

## VC Assembly

Maps form data to the W3C VC Data Model 2.0 shape. The `issuer` value is read from `VITE_DID_WEB` env var (set by admin, exposed to the Vite frontend). `VITE_RENDERER_URL` sets the `renderMethod.id` URL — it is a placeholder pointing to a future decentralised renderer; for this demo the URL does not need to be live since rendering happens in-app.

```typescript
// src/vc/assembleVC.ts
export function assembleVC(data: GuaranteeFormData, issuerDid: string) {
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://trustvc.io/context/render-method-context-v2.json"
    ],
    "type": ["VerifiableCredential"],
    "issuer": issuerDid,
    "validFrom": `${data.issueDate}T00:00:00Z`,
    "validUntil": `${data.expiryDate}T00:00:00Z`,
    "credentialSubject": {
      "type": ["BankersGuarantee"],
      "bgNumber": data.bgNumber,
      "issueDate": data.issueDate,
      "issuingBank": { "name": data.issuingBankName, "swift": data.issuingBankSwift },
      "applicant": { "name": data.applicantName, "address": data.applicantAddress },
      "beneficiary": { "name": data.beneficiaryName, "address": data.beneficiaryAddress },
      "underlyingContract": data.underlyingContract,
      "currency": data.currency,
      "amount": data.amount,
      "expiryDate": data.expiryDate,
      "placeOfPresentation": data.placeOfPresentation,
      "governingRules": "URDG758"
    },
    "renderMethod": [{
      "id": import.meta.env.VITE_RENDERER_URL ?? "https://eguarantee.fyntech.io/renderer",
      "type": "EMBEDDED_RENDERER",
      "templateName": "EBG"
    }]
  };
}
```

---

## Rendered Guarantee Template

The `GuaranteePreview` component renders the Section 4 template from the brief. It takes `credentialSubject` as props and outputs a styled document-like view.

**Legal text template (four clauses):**

1. We, `{issuingBank.name}` (SWIFT: `{issuingBank.swift}`) (the "Guarantor"), have been informed that `{applicant.name}` of `{applicant.address}` (the "Applicant") has entered into an underlying agreement/obligation under `{underlyingContract}` with you.

2. At the request of the Applicant, we hereby irrevocably and unconditionally undertake to pay you any sum not exceeding `{currency}` `{amount}` upon receipt of your conforming written demand.

3. This Guarantee is subject to the Uniform Rules for Demand Guarantees (URDG) 2010 Revision, ICC Publication No. 758.

4. Any demand must be received on or before `{expiryDate}` at `{placeOfPresentation}`. After the Expiry Date this Guarantee shall become null and void.

_Legal wording is a draft placeholder — must be confirmed by the bank's legal team before production use._

---

## Backend API

Single Express route. The private key and DID:web are loaded from `.env` at server startup.

```
POST /api/vc/sign
Body: { unsignedVC: object }
Response: { signedVC: object }
```

**`server/services/signVC.ts`** calls `signW3C(unsignedVC, keyPair)` from `@trustvc/trustvc`.  
The `keyPair` object is loaded from `keys/keypair.json` at server startup (not from `.env`). It follows the Multikey format: `{ id, type: 'Multikey', controller, publicKeyMultibase, secretKeyMultibase }`. The `id` and `controller` values reference the `did:web` subdomain chosen during setup.

Error handling: if `keys/keypair.json` is missing, the server returns `503` with a clear message directing the admin to run `npm run setup`.

---

## Admin Setup Script

`scripts/setup.ts` — run once by the administrator via `npm run setup`.

**Steps it performs:**
1. Prompts for the fyntech.io subdomain (e.g. `eguarantee.fyntech.io`)
2. Generates an ECDSA-SD-2023 keypair using `generateDidKeyPair(CryptoSuite.EcdsaSd2023)` from `@trustvc/w3c-issuer` — this produces raw key material. The setup script then wraps the public key into a `did:web` DID document (the same transformation that `trustvc did-web` performs via the CLI), setting `id` and `controller` to `did:web:<subdomain>`.
3. Derives the `did:web` identifier: `did:web:<subdomain>` (e.g. `did:web:eguarantee.fyntech.io`)
4. Writes `keys/keypair.json` (Multikey format with `did:web` references) and `keys/did.json` (the DID document to host at `/.well-known/did.json`)
5. Appends `PRIVATE_KEY` and `DID_WEB` to `.env`
6. Prints step-by-step instructions:
   - **Step A:** Upload `keys/did.json` to `https://<subdomain>/.well-known/did.json`
   - **Step B:** Add DNS TXT record: `_did.<subdomain>` → `did=did:web:<subdomain>`
7. Polls both until they resolve, then prints "✓ Identity live — app is ready"

**Key-handling rules:**
- `keys/` is gitignored — private key never commits
- `.env` is gitignored
- Script warns if called a second time (keypair already exists)

---

## Form UX Details

**Field grouping** (left panel, top to bottom):
1. **Guarantee Details** — `bgNumber`, `issueDate`, `expiryDate` (dates side-by-side)
2. **Issuing Bank** — `issuingBankName`, `issuingBankSwift`
3. **Applicant** — `applicantName`, `applicantAddress`
4. **Beneficiary** — `beneficiaryName`, `beneficiaryAddress`
5. **Financial Terms** — `currency` + `amount` (side-by-side), `underlyingContract`, `placeOfPresentation`

**Validation UX:**
- Errors shown inline below each field on blur
- `expiryDate` cross-field error shown on the `expiryDate` field
- "Sign & Download" button disabled while any field has an error
- A "Fill sample data" button pre-fills the brief's example values (useful for demos)

**Right panel:**
- Rendered guarantee updates live as the user types (derived from the current form state, even before signing)
- Below the rendered view: collapsible raw JSON block (unsigned until signed)
- After signing: JSON block updates to the signed VC; "Download signed_vc.json" button appears

---

## Signing Flow (end-to-end)

1. User clicks "Sign & Download"
2. Frontend assembles unsigned VC via `assembleVC(formData, issuerDid)`
3. `POST /api/vc/sign` with the unsigned VC
4. Express calls `signW3C(unsignedVC, keyPair, 'ecdsa-sd-2023')`
5. Returns `signedVC` JSON
6. Frontend updates the raw JSON viewer to show the signed VC
7. Browser triggers download of `signed_vc.json`
8. User takes file to `trustvc.io` or `ref.tradetrust.io` — all three checks pass

---

## Out of Scope

- Decentralised renderer (iframe + postMessage architecture) — in-app rendering is sufficient for the demo
- Credential status / revocation — `credentialStatus` intentionally omitted
- Multi-user auth, user accounts, database
- Milestone B was originally separate — it is now fully integrated as the core signing flow above

---

## Build Order

1. Scaffold Vite + Express monorepo; configure Tailwind, TypeScript, concurrently
2. `schema.ts` + `assembleVC.ts` — data layer, no UI
3. `GuaranteeForm` — all 13 fields, Zod validation, sample data button
4. `GuaranteePreview` + `VcJsonViewer` — renderer and JSON block (right panel)
5. Split panel layout (`App.tsx`)
6. `server/services/signVC.ts` + `POST /api/vc/sign` route
7. Wire "Sign & Download" end-to-end (frontend → API → download)
8. `scripts/setup.ts` admin CLI
9. Polish: loading states, error toasts, disabled button state, "Fill sample data"
