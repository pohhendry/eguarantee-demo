# YORK Realism Pass — Design Spec
_Date: 2026-07-03_

## Overview

A "realism pass" on the eGuarantee demo to produce **YORK — Your Online LetterOfGuarantee Kit**: a demo that renders UOB's actual approved Banker's Guarantee format, carries a deliberate signature-block provocation, surfaces issuer identity on the verification screen, and is rebranded for Phase 1 conversations with UOB (initiated by Daniel Lin, IMDA).

**No changes to signing architecture** — still TrustVC W3C VC 2.0, Verifiable Document only, existing `did:web:eguarantee.hendrypoh.com` issuer, no token registry.

---

## Deployment Architecture (unchanged)

Two auto-deploy pipelines, both triggered by merge to `main`:

| Pipeline | Trigger | Serves |
|---|---|---|
| GitHub Actions → GitHub Pages | Push to `main` | Static frontend + decentralised renderer at `eguarantee.hendrypoh.com/renderer` |
| Render.com (`render.yaml`) | PR merged (Render GitHub integration) | Express signing API at `eguarantee-demo.onrender.com` |

Merging `feature/eguarantee-build` → `main` triggers both automatically. No manual deploy step needed.

The decentralised renderer at `https://eguarantee.hendrypoh.com/renderer` is an iframe loaded by trustvc.io / ref.tradetrust.io when a `.tt` file is verified. Any change to `GuaranteePreview.tsx` becomes live at the renderer URL after deploy — this is how the new UOB template appears when someone verifies the document on an external verifier.

---

## 1. Rebrand to YORK

- **App title / `<title>`:** "YORK — Your Online LetterOfGuarantee Kit"
- **Header:** Replace "⚡ eGuarantee Creator" with "YORK — Your Online LetterOfGuarantee Kit"
- **Tagline** (below header or in footer area):
  > "Built on TradeTrust — decentralised and open-source, so YORK can be deployed inside a bank's own environment beyond Phase 1."
- URLs, repo name, and domain names are **not** changed — cosmetic rebrand only.

---

## 2. Schema (full replacement — Option A)

The current flat 13-field schema is entirely replaced. New Zod schema shape:

```typescript
{
  guaranteeNumber: string          // "BG-UOB-2026-00123"
  issuanceDate: string             // YYYY-MM-DD — "Dated ___"
  agreementDate: string            // YYYY-MM-DD — "WHEREAS an agreement dated ___"
  effectiveDate: string            // YYYY-MM-DD — clause 2 "effective from ___"
  expiryDate: string               // YYYY-MM-DD — clause 2(i) specific date

  applicant:  { name: string; address: string }
  beneficiary: { name: string; address: string }
  bank: { name: string; registrationNumber: string; address: string }

  contractNature: string           // "[state nature of contract]"

  guaranteedSum: {
    currency: string               // ISO 4217, e.g. "SGD"
    figures: number                // 750000
    words: string                  // "Seven Hundred and Fifty Thousand" (operator-supplied)
  }

  signatory: {
    name: string                   // default "Alexandra Teo"
    title: string                  // default "Vice President, Trade Finance Operations"
    // signatureImage: static base64 SVG embedded in assembleVC — not a form field
  }
}
```

**`signatory.signatureImage`** is a static fictitious handwriting SVG embedded as a constant in `assembleVC.ts` and written into `credentialSubject.signatory.signatureImage`. It is not exposed as a form field. The form pre-fills `signatory.name` and `signatory.title` from the sample data.

**Validation rules:**
- All dates: `YYYY-MM-DD`, must be valid calendar dates
- `expiryDate` must be after `issuanceDate`
- `effectiveDate` must be ≤ `expiryDate`
- `guaranteedSum.currency`: 3 uppercase letters (ISO 4217)
- `guaranteedSum.figures`: positive number
- `bank.registrationNumber`: free-form string (e.g. "193500026Z")

---

## 3. Form (`GuaranteeForm.tsx`)

Full replacement. Sections and fields:

| Section | Fields |
|---|---|
| Guarantee Details | `guaranteeNumber`, `issuanceDate`, `agreementDate`, `effectiveDate`, `expiryDate` |
| Issuing Bank | `bank.name`, `bank.registrationNumber`, `bank.address` |
| Applicant | `applicant.name`, `applicant.address` |
| Beneficiary | `beneficiary.name`, `beneficiary.address` |
| Contract | `contractNature` |
| Guaranteed Sum | `guaranteedSum.currency`, `guaranteedSum.figures`, `guaranteedSum.words` |
| Signatory | `signatory.name`, `signatory.title` (pre-filled; user can change for demo) |

"Fill sample data" button remains, wired to the new sample payload.

---

## 4. `assembleVC.ts` (full replacement)

Maps new form data to W3C VC 2.0 shape. Key changes:
- `validFrom` ← `issuanceDate`
- `validUntil` ← `expiryDate`
- `credentialSubject` uses new nested schema
- `credentialSubject.signatory.signatureImage` is injected as a hardcoded base64 SVG constant (`ALEXANDRA_TEO_SIGNATURE_SVG`)
- `renderMethod[0].templateName` stays `'EBG'`

---

## 5. Renderer — UOB Formal Letter (`GuaranteePreview.tsx`)

Full replacement. Visual layout:

```
[top-right: UOB logo PNG, embedded as base64 data URI]

Guarantee No.: [guaranteeNumber]

To: [beneficiary.name]
[beneficiary.address]
(hereafter referred to as "you")

WHEREAS an agreement dated [agreementDate] was made between you
and [applicant.name] of [applicant.address] (the "Applicant") for
[contractNature] (the "Contract").

1.  Now we, [bank.name] (company registration number
    [bank.registrationNumber]) of [bank.address] ... guarantee
    payment of [guaranteedSum.words] only
    ([guaranteedSum.currency] [guaranteedSum.figures formatted])
    ...

    PROVIDED ALWAYS THAT ...

2.  This Guarantee shall be effective from [effectiveDate] and shall
    expire on the earliest of the following dates (the "Expiry Date"):—
    (i) [expiryDate] provided that if such date is not a business day...
    (ii)–(iv) [verbatim]

    PROVIDED ALWAYS THAT ...

3.  All demands ... on or before 4 p.m. of the Expiry Date
    (Singapore time) ...

4–8. [verbatim clauses]

Dated [issuanceDate]

┌──────────────────────────┐  ┌──────────────────────────┐
│ [SVG signature image]    │  │                          │
│ Alexandra Teo            │  │ [Beneficiary of          │
│ VP, Trade Finance Ops    │  │  Guarantee — to sign]    │
│ United Overseas Bank     │  │                          │
└──────────────────────────┘  └──────────────────────────┘

── SPECIMEN — issued for demonstration under the IMDA TradeTrust eBG pilot. Not a valid instrument. ──
```

**Typography:** `font-serif` (Georgia / Times New Roman), black on white, generous margins — looks like a printed bank letter.

**Amounts:** `figures` displayed with thousands separators (e.g. `750,000`).

**Clauses 1–8:** Rendered verbatim from UOB's approved format. Merge fields injected inline. "PROVIDED ALWAYS THAT" paragraphs indented as sub-paragraphs. Clause 4's "original copy" paper-era language rendered as-is.

**Signature block (deliberate provocation):** A fictitious stylised SVG handwriting signature above "Alexandra Teo / Vice President, Trade Finance Operations". Intentional bait — no explanatory copy added.

**Beneficiary execution block:** Labelled empty block ("Beneficiary of Guarantee — customer to sign on a copy of the BG").

**Specimen footer:** `SPECIMEN — issued for demonstration under the IMDA TradeTrust eBG pilot. Not a valid instrument.` — small, muted grey, present on screen and `@media print`.

---

## 6. Renderer App (`RendererApp.tsx`) and `App.tsx`

`GuaranteePreview` gains an `issuerDid?: string` prop for the identity section. Two callers:

- **`RendererApp.tsx`** — also extract `doc.issuer` from the Penpal `RENDER_DOCUMENT` payload and pass it as `issuerDid`. This is the path used when verified on trustvc.io / ref.tradetrust.io.
- **`App.tsx`** — pass `ISSUER_DID` (already read from `import.meta.env.VITE_DID_WEB`) as `issuerDid` to the in-app preview. The identity section therefore also appears in the live preview pane.

If `issuerDid` is undefined or empty the identity section is simply not rendered.

---

## 7. Issuer Identity Section (in renderer, below the BG letter)

Rendered inside `GuaranteePreview` below the SPECIMEN footer. Visible when the document is verified on trustvc.io / ref.tradetrust.io.

```
┌───────────────────────────────────────────────────┐
│  Issued by: eguarantee.hendrypoh.com  ✓           │
│  ▼ How do I know this is really from the bank?    │
│    1. The document carries a digital signature    │
│       created with the issuer's private key.      │
│    2. The matching public key is published in a   │
│       DID document at the issuer's own web domain │
│       (did:web). Only someone who controls that   │
│       domain's web server can publish it — the    │
│       trust anchor is domain control, same as the │
│       padlock in your browser.                    │
│    3. Verification = signature checks out against │
│       the key at that domain, and the document    │
│       hasn't been altered since signing.          │
│    4. In this demo the issuer is a placeholder    │
│       domain. In a live pilot, the bank publishes │
│       one small file on its own domain (e.g.      │
│       uob.com.sg) — that is the entire identity   │
│       integration. A future step is an IMDA/MAS-  │
│       maintained trusted-issuer list on top.      │
└───────────────────────────────────────────────────┘
```

Domain is extracted from the `issuerDid` prop: `did:web:eguarantee.hendrypoh.com` → `eguarantee.hendrypoh.com`. The explainer is collapsed by default, expanded on click (native `<details>/<summary>`).

---

## 8. Sample Payload (`sampleInput.ts`)

New realistic SGD sample matching the new schema:

```json
{
  "guaranteeNumber": "BG-UOB-2026-00123",
  "issuanceDate": "2026-07-03",
  "agreementDate": "2026-05-15",
  "effectiveDate": "2026-07-03",
  "expiryDate": "2027-07-02",
  "applicant": {
    "name": "Tan Chong Construction Pte Ltd",
    "address": "10 Tuas South Street 2, Singapore 637542"
  },
  "beneficiary": {
    "name": "Housing & Development Board",
    "address": "HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480"
  },
  "bank": {
    "name": "United Overseas Bank Limited",
    "registrationNumber": "193500026Z",
    "address": "80 Raffles Place, UOB Plaza, Singapore 048624"
  },
  "contractNature": "supply and installation of precast structural components under HDB Tender Ref HDB-CONST-2026-0441",
  "guaranteedSum": {
    "currency": "SGD",
    "figures": 750000,
    "words": "Seven Hundred and Fifty Thousand"
  },
  "signatory": {
    "name": "Alexandra Teo",
    "title": "Vice President, Trade Finance Operations"
  }
}
```

---

## 9. Schema Documentation (`docs/schema.md`)

New file. Documents every `credentialSubject` field: name, type, description, example, which UOB clause it maps to. Target audience: Excel front-end re-templating team.

---

## Out of Scope

- No token registry / blockchain commitment
- No amendment/extension/claims/cancellation flows
- No changes to signing server location
- No Excel changes
- No changes to `did:web` keys or DID document
- No changes to Render.com env vars

---

## Branch

All work on `feature/eguarantee-build`. Merge to `main` triggers both auto-deploy pipelines.
