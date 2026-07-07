# Excel Upload Flow — Design Spec

**Date:** 2026-07-07
**Repo:** pohhendry/eguarantee-demo (branch: feature/eguarantee-build)
**Status:** Approved

---

## 1. Goal

Add an Excel-based entry path to the existing eguarantee-demo web app so that bank users who are familiar with spreadsheets can fill in a provided `.xlsx` template instead of the web form. Both paths converge at the same DID:WEB signing and YORK renderer — no backend changes required.

---

## 2. User Flow

```
Landing Page
├── [Fill in Form]   →  existing GuaranteeForm.tsx (unchanged)
└── [Upload Excel]   →  new ExcelUpload.tsx
                              │
                              ▼
                        SheetJS parses .xlsx (client-side)
                        mapToSchema() normalises values
                        zod validates (same schema.ts)
                              │
                        ┌─────┴──────┐
                     errors?       valid ✓
                        │             │
                  inline error    sign → render → .tt download
                  list, re-upload
```

### Steps for bank user

1. Open the web app → choose "Upload Excel Sheet"
2. Download the `.xlsx` template (one-click, served as a static asset)
3. Fill in the template in Excel (Windows), save as `.xlsx`
4. Drag-drop or browse to upload the file
5. App validates instantly — errors shown inline if any
6. Click "Generate & Sign" → signed `.tt` file rendered and available for download
7. Upload `.tt` to trustvc.io or ref.tradetrust.io to verify

---

## 3. Architecture

### What changes

| Area | Change |
|---|---|
| `src/App.tsx` | Add landing page as initial route; route to form or upload |
| `src/LandingPage.tsx` | New — two-card selector |
| `src/excel/parseExcel.ts` | New — SheetJS reads `.xlsx` by named range |
| `src/excel/mapToSchema.ts` | New — normalises raw values to `GuaranteeFormData` shape |
| `src/steps/ExcelUpload.tsx` | New — file picker, validation errors, proceed button |
| `template/guarantee-template.xlsx` | New — checked into repo, served as static download |
| `package.json` | Add `xlsx` (SheetJS) dependency |

### What is unchanged

- `src/form/schema.ts` — zod schema, single source of truth for both paths
- `src/form/GuaranteeForm.tsx` — existing webform, untouched
- `server/` — signing routes, DID:WEB logic, all unchanged
- `renderer/` — YORK HTML renderer, untouched
- `public/.well-known/did.json` — DID identity, untouched

---

## 4. Excel Template

**File:** `template/guarantee-template.xlsx`
**Sheet:** `Guarantee Data`

All input cells are registered as **named ranges** (e.g. `guaranteeNumber`, `issuanceDate`). The parser reads by name, not by row position, so the template can be reformatted without breaking the parser.

### Fields & named ranges

| Section | Label | Named Range | Type | Validation |
|---|---|---|---|---|
| Guarantee Details | Guarantee Reference Number | `guaranteeNumber` | string | — |
| | Date of Issuance | `issuanceDate` | string | text length = 10 |
| | Agreement Date | `agreementDate` | string | text length = 10 |
| | Effective Date | `effectiveDate` | string | text length = 10 |
| | Expiry Date | `expiryDate` | string | text length = 10 |
| Applicant | Full Legal Name | `applicantName` | string | — |
| | Registered Address | `applicantAddress` | string | — |
| Beneficiary | Full Legal Name | `beneficiaryName` | string | — |
| | Registered Address | `beneficiaryAddress` | string | — |
| Issuing Bank | Bank Full Legal Name | `bankName` | string | — |
| | Bank Registration Number | `bankRegistrationNumber` | string | — |
| | Bank Registered Address | `bankAddress` | string | — |
| Contract | Nature of Contract | `contractNature` | string | — |
| Guaranteed Sum | Currency | `guaranteedSumCurrency` | string | dropdown: SGD,USD,EUR,GBP,JPY,AUD,CNY,HKD,MYR,THB |
| | Amount in Figures | `guaranteedSumFigures` | number | decimal > 0 |
| | Amount in Words | `guaranteedSumWords` | string | — |
| Signatory | Full Name | `signatoryName` | string | — |
| | Job Title | `signatoryTitle` | string | — |

**Not in template:** `signatory.signatureImage` — remains a static asset injected server-side, same as current behaviour.

### Template design choices

- Built-in Excel data validation (no VBA macros) — safe under bank IT Group Policy
- Pre-filled with sample data so users see expected format immediately
- Header rows frozen for scrolling comfort
- Named navy/blue colour scheme matching UOB brand

---

## 5. Parsing Pipeline

```
parseExcel(file: File): Promise<Record<string, unknown>>
  └── SheetJS: read workbook from ArrayBuffer
  └── for each named range in the workbook:
        extract the cell value at the referenced address
  └── return flat map: { guaranteeNumber: "...", issuanceDate: "...", ... }

mapToSchema(raw: Record<string, unknown>): GuaranteeFormData
  └── trim all string values
  └── if a value is a JS Date object (SheetJS auto-parsed date cell): format as YYYY-MM-DD
  └── guaranteedSumFigures: coerce to number
  └── return object matching GuaranteeFormData shape

zod.parse(guaranteeSchema, mapped)
  └── same schema.ts used by the web form
  └── includes cross-field rules: expiryDate > issuanceDate, effectiveDate ≤ expiryDate
```

---

## 6. Error Handling

Three layers, all surfaced before the user can proceed:

| Layer | Catches | UX |
|---|---|---|
| File check | Not `.xlsx`; file > 1 MB | Inline message, no parse attempted |
| Named range check | Named range missing from workbook; cell blank | Lists each missing field by friendly label |
| Zod validation | Wrong format, failed cross-field date rules | Inline list matching webform error messages |

- All errors shown at once (not one-by-one)
- "Generate & Sign" button disabled until zero errors
- Re-upload clears previous errors and re-runs all three layers instantly

---

## 7. Branding Note — YORK

YORK stands for "Your Online [gua**R**antee] Kit" — the R is taken from the interior of "guarantee" and "Letter of" is implicit. This is a known acronym cheat agreed at design time. The name YORK is kept as-is; no change to the renderer or document template.

---

## 8. Out of Scope

- `signatory.signatureImage` in the Excel template (stays server-side static)
- Bulk upload (multiple guarantees in one sheet)
- Mac Excel support (Windows-only for the initial release)
- Auto-conversion of figures to words in the template
