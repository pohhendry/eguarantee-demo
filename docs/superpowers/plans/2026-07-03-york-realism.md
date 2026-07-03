# YORK Realism Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the eGuarantee demo's generic BG template with UOB's approved legal format, rebrand to YORK, add issuer identity surfacing in the renderer, and extend the schema to the full UOB field set.

**Architecture:** Full schema replacement (Option A) — every layer (schema → form → assembleVC → renderer) is rewritten to the new nested UOB-aligned schema. `GuaranteePreview` is shared between the in-app preview and the decentralised renderer iframe; one change covers both. The renderer gains an `issuerDid` prop surfaced via Penpal's document payload.

**Tech Stack:** React 19 + TypeScript, Vite 6, Tailwind v4, React Hook Form v7 + Zod v4, `@hookform/resolvers` v5, Vitest 3 + Testing Library, Express 5, `@trustvc/trustvc`.

## Global Constraints

- Branch: `feature/eguarantee-build` — all commits go here; merge to `main` triggers both CI/CD pipelines automatically.
- Test command: `npm test` (runs `vitest run`; config in `vite.config.ts`, setup in `src/test/setup.ts`).
- Build command: `npm run build` (TypeScript check + Vite build).
- Do NOT change: repo URLs, domain names, signing architecture, Render.com env vars, DID keys.
- Verbatim copy: UOB clauses 1–8, "PROVIDED ALWAYS THAT" paragraphs, 4 p.m. Singapore time cut-off.
- Specimen footer exact text: `SPECIMEN — issued for demonstration under the IMDA TradeTrust eBG pilot. Not a valid instrument.`
- Signatory: `Alexandra Teo`, `Vice President, Trade Finance Operations` — fictitious, must not match any real UOB staff.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/form/schema.ts` | Rewrite | Zod schema for new UOB field set |
| `src/form/schema.test.ts` | Rewrite | Schema validation tests |
| `src/vc/assembleVC.ts` | Rewrite | Form data → W3C VC 2.0, injects static signature |
| `src/vc/assembleVC.test.ts` | Rewrite | assembleVC unit tests |
| `src/sample/sampleInput.ts` | Rewrite | Realistic SGD sample matching new schema |
| `src/assets/uob-logo.png` | Create | UOB logo asset (downloaded) |
| `src/renderer/GuaranteePreview.tsx` | Rewrite | UOB formal letter renderer, issuer identity section |
| `src/renderer/GuaranteePreview.test.tsx` | Rewrite | Renderer tests |
| `src/form/GuaranteeForm.tsx` | Rewrite | Form fields for new schema |
| `src/App.tsx` | Modify | YORK header/tagline, pass `issuerDid` to GuaranteePreview |
| `src/renderer-app/RendererApp.tsx` | Modify | Extract `doc.issuer`, pass as `issuerDid` |
| `index.html` | Modify | Page `<title>` |
| `docs/schema.md` | Create | Field glossary for Excel front-end team |

---

### Task 1: Feature branch + schema replacement

**Files:**
- Modify: `src/form/schema.ts`
- Modify: `src/form/schema.test.ts`

**Interfaces:**
- Produces: `GuaranteeFormData` type — consumed by Tasks 2, 3, 4

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feature/eguarantee-build
```

- [ ] **Step 2: Rewrite the failing tests first**

Replace the entire contents of `src/form/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { guaranteeSchema } from './schema';

const valid = {
  guaranteeNumber: 'BG-UOB-2026-00123',
  issuanceDate: '2026-07-03',
  agreementDate: '2026-05-15',
  effectiveDate: '2026-07-03',
  expiryDate: '2027-07-02',
  applicant: { name: 'Tan Chong Construction Pte Ltd', address: '10 Tuas South Street 2, Singapore 637542' },
  beneficiary: { name: 'Housing & Development Board', address: 'HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480' },
  bank: { name: 'United Overseas Bank Limited', registrationNumber: '193500026Z', address: '80 Raffles Place, UOB Plaza, Singapore 048624' },
  contractNature: 'construction services',
  guaranteedSum: { currency: 'SGD', figures: 750000, words: 'Seven Hundred and Fifty Thousand' },
  signatory: { name: 'Alexandra Teo', title: 'Vice President, Trade Finance Operations' },
};

describe('guaranteeSchema', () => {
  it('accepts a fully valid input', () => {
    expect(guaranteeSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing guaranteeNumber', () => {
    const r = guaranteeSchema.safeParse({ ...valid, guaranteeNumber: '' });
    expect(r.success).toBe(false);
  });

  it('rejects bad date format for issuanceDate', () => {
    const r = guaranteeSchema.safeParse({ ...valid, issuanceDate: '03-07-2026' });
    expect(r.success).toBe(false);
  });

  it('rejects expiryDate equal to issuanceDate', () => {
    const r = guaranteeSchema.safeParse({ ...valid, expiryDate: '2026-07-03' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain('expiryDate');
  });

  it('rejects expiryDate before issuanceDate', () => {
    const r = guaranteeSchema.safeParse({ ...valid, expiryDate: '2025-01-01' });
    expect(r.success).toBe(false);
  });

  it('rejects effectiveDate after expiryDate', () => {
    const r = guaranteeSchema.safeParse({ ...valid, effectiveDate: '2028-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain('effectiveDate');
  });

  it('rejects guaranteedSum.currency not 3 uppercase letters', () => {
    const r = guaranteeSchema.safeParse({ ...valid, guaranteedSum: { ...valid.guaranteedSum, currency: 'sgd' } });
    expect(r.success).toBe(false);
  });

  it('rejects guaranteedSum.figures of 0', () => {
    const r = guaranteeSchema.safeParse({ ...valid, guaranteedSum: { ...valid.guaranteedSum, figures: 0 } });
    expect(r.success).toBe(false);
  });

  it('rejects guaranteedSum.figures negative', () => {
    const r = guaranteeSchema.safeParse({ ...valid, guaranteedSum: { ...valid.guaranteedSum, figures: -1 } });
    expect(r.success).toBe(false);
  });

  it('rejects empty applicant name', () => {
    const r = guaranteeSchema.safeParse({ ...valid, applicant: { ...valid.applicant, name: '' } });
    expect(r.success).toBe(false);
  });

  it('rejects empty bank registrationNumber', () => {
    const r = guaranteeSchema.safeParse({ ...valid, bank: { ...valid.bank, registrationNumber: '' } });
    expect(r.success).toBe(false);
  });

  it('accepts effectiveDate equal to expiryDate', () => {
    const r = guaranteeSchema.safeParse({ ...valid, effectiveDate: '2027-07-02' });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
cd /Users/dryhen/projects/eguarantee-demo && npm test
```

Expected: schema tests FAIL (old field names no longer exist), assembleVC tests FAIL (same reason). GuaranteePreview tests may also fail. That's correct — the old code doesn't satisfy the new tests.

- [ ] **Step 4: Rewrite `src/form/schema.ts`**

```typescript
import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine((d) => !isNaN(Date.parse(d)), 'Must be a valid date');

const party = z.object({
  name: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
});

export const guaranteeSchema = z
  .object({
    guaranteeNumber: z.string().min(1, 'Required'),
    issuanceDate: isoDate,
    agreementDate: isoDate,
    effectiveDate: isoDate,
    expiryDate: isoDate,
    applicant: party,
    beneficiary: party,
    bank: z.object({
      name: z.string().min(1, 'Required'),
      registrationNumber: z.string().min(1, 'Required'),
      address: z.string().min(1, 'Required'),
    }),
    contractNature: z.string().min(1, 'Required'),
    guaranteedSum: z.object({
      currency: z.string().regex(/^[A-Z]{3}$/, 'Must be 3 uppercase letters (ISO 4217)'),
      figures: z.number().positive('Must be greater than 0'),
      words: z.string().min(1, 'Required'),
    }),
    signatory: z.object({
      name: z.string().min(1, 'Required'),
      title: z.string().min(1, 'Required'),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.issuanceDate && data.expiryDate && data.expiryDate <= data.issuanceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expiry date must be after issuance date',
        path: ['expiryDate'],
      });
    }
    if (data.effectiveDate && data.expiryDate && data.effectiveDate > data.expiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Effective date must be on or before expiry date',
        path: ['effectiveDate'],
      });
    }
  });

export type GuaranteeFormData = z.infer<typeof guaranteeSchema>;
```

- [ ] **Step 5: Run schema tests — confirm they pass**

```bash
npm test -- --reporter=verbose src/form/schema.test.ts
```

Expected: 13 tests pass. (Other test files may still fail — that's fine.)

- [ ] **Step 6: Commit**

```bash
git add src/form/schema.ts src/form/schema.test.ts
git commit -m "feat: replace schema with UOB-aligned field set"
```

---

### Task 2: assembleVC + sample data

**Files:**
- Modify: `src/vc/assembleVC.ts`
- Modify: `src/vc/assembleVC.test.ts`
- Modify: `src/sample/sampleInput.ts`

**Interfaces:**
- Consumes: `GuaranteeFormData` from Task 1
- Produces: `assembleVC(data, issuerDid, rendererUrl?)` → W3C VC 2.0 object with `credentialSubject.signatory.signatureImage`

- [ ] **Step 1: Rewrite `src/vc/assembleVC.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { assembleVC } from './assembleVC';
import type { GuaranteeFormData } from '../form/schema';

const data: GuaranteeFormData = {
  guaranteeNumber: 'BG-UOB-2026-00123',
  issuanceDate: '2026-07-03',
  agreementDate: '2026-05-15',
  effectiveDate: '2026-07-03',
  expiryDate: '2027-07-02',
  applicant: { name: 'Tan Chong Construction Pte Ltd', address: '10 Tuas South Street 2, Singapore 637542' },
  beneficiary: { name: 'Housing & Development Board', address: 'HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480' },
  bank: { name: 'United Overseas Bank Limited', registrationNumber: '193500026Z', address: '80 Raffles Place, UOB Plaza, Singapore 048624' },
  contractNature: 'construction services',
  guaranteedSum: { currency: 'SGD', figures: 750000, words: 'Seven Hundred and Fifty Thousand' },
  signatory: { name: 'Alexandra Teo', title: 'Vice President, Trade Finance Operations' },
};

const ISSUER = 'did:web:eguarantee.hendrypoh.com';

describe('assembleVC', () => {
  it('includes the W3C VC DM 2.0 context', () => {
    expect(assembleVC(data, ISSUER)['@context']).toContain('https://www.w3.org/ns/credentials/v2');
  });

  it('includes @vocab in context', () => {
    const vocab = assembleVC(data, ISSUER)['@context'].find(
      (c: unknown) => typeof c === 'object' && (c as Record<string, string>)['@vocab'],
    );
    expect(vocab).toBeDefined();
  });

  it('sets type to VerifiableCredential', () => {
    expect(assembleVC(data, ISSUER).type).toContain('VerifiableCredential');
  });

  it('sets issuer from parameter', () => {
    expect(assembleVC(data, ISSUER).issuer).toBe(ISSUER);
  });

  it('maps issuanceDate to validFrom', () => {
    expect(assembleVC(data, ISSUER).validFrom).toBe('2026-07-03T00:00:00Z');
  });

  it('maps expiryDate to validUntil', () => {
    expect(assembleVC(data, ISSUER).validUntil).toBe('2027-07-02T00:00:00Z');
  });

  it('includes guaranteeNumber in credentialSubject', () => {
    expect(assembleVC(data, ISSUER).credentialSubject.guaranteeNumber).toBe('BG-UOB-2026-00123');
  });

  it('nests bank with name, registrationNumber, address', () => {
    expect(assembleVC(data, ISSUER).credentialSubject.bank).toEqual({
      name: 'United Overseas Bank Limited',
      registrationNumber: '193500026Z',
      address: '80 Raffles Place, UOB Plaza, Singapore 048624',
    });
  });

  it('nests guaranteedSum with currency, figures, words', () => {
    expect(assembleVC(data, ISSUER).credentialSubject.guaranteedSum).toEqual({
      currency: 'SGD',
      figures: 750000,
      words: 'Seven Hundred and Fifty Thousand',
    });
  });

  it('injects signatory.signatureImage as a non-empty data URI', () => {
    const sig = assembleVC(data, ISSUER).credentialSubject.signatory.signatureImage;
    expect(sig).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('uses custom rendererUrl when provided', () => {
    expect(assembleVC(data, ISSUER, 'https://custom.example.com/renderer').renderMethod[0].id).toBe(
      'https://custom.example.com/renderer',
    );
  });

  it('does not include a proof field', () => {
    expect((assembleVC(data, ISSUER) as Record<string, unknown>)['proof']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — confirm assembleVC tests fail**

```bash
npm test -- --reporter=verbose src/vc/assembleVC.test.ts
```

Expected: FAIL — old `assembleVC` returns old shape.

- [ ] **Step 3: Rewrite `src/vc/assembleVC.ts`**

```typescript
import type { GuaranteeFormData } from '../form/schema';

const ALEXANDRA_TEO_SIGNATURE_SVG =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCAyMDAgNjAiPjxwYXRoIGQ9Ik04LDQ1IEMxNSwyMCAyOCw1MCA0MiwzMiBDNTYsMTQgNjgsNDggODUsMzggQzEwMiwyOCAxMTUsNTAgMTM1LDM1IEMxNTIsMjIgMTYyLDQ0IDE5MCwzOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWExYTRmIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTEyLDUyIEM1MCw1MiA5MCw1NCAxMzAsNTIgQzE2MCw1MCAxNzUsNTIgMTkyLDUyIiBmaWxsPSJub25lIiBzdHJva2U9IiMxYTFhNGYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+';

export function assembleVC(
  data: GuaranteeFormData,
  issuerDid: string,
  rendererUrl: string = 'https://eguarantee.hendrypoh.com/renderer',
) {
  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://trustvc.io/context/render-method-context-v2.json',
      { '@vocab': 'https://eguarantee.hendrypoh.com/vocab#' },
    ],
    type: ['VerifiableCredential'],
    issuer: issuerDid,
    validFrom: `${data.issuanceDate}T00:00:00Z`,
    validUntil: `${data.expiryDate}T00:00:00Z`,
    credentialSubject: {
      type: ['BankersGuarantee'],
      guaranteeNumber: data.guaranteeNumber,
      issuanceDate: data.issuanceDate,
      agreementDate: data.agreementDate,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
      applicant: { name: data.applicant.name, address: data.applicant.address },
      beneficiary: { name: data.beneficiary.name, address: data.beneficiary.address },
      bank: {
        name: data.bank.name,
        registrationNumber: data.bank.registrationNumber,
        address: data.bank.address,
      },
      contractNature: data.contractNature,
      guaranteedSum: {
        currency: data.guaranteedSum.currency,
        figures: data.guaranteedSum.figures,
        words: data.guaranteedSum.words,
      },
      signatory: {
        name: data.signatory.name,
        title: data.signatory.title,
        signatureImage: ALEXANDRA_TEO_SIGNATURE_SVG,
      },
    },
    renderMethod: [
      {
        id: rendererUrl,
        type: 'EMBEDDED_RENDERER',
        templateName: 'EBG',
      },
    ],
  };
}
```

- [ ] **Step 4: Rewrite `src/sample/sampleInput.ts`**

```typescript
import type { GuaranteeFormData } from '../form/schema';

export const sampleInput: GuaranteeFormData = {
  guaranteeNumber: 'BG-UOB-2026-00123',
  issuanceDate: '2026-07-03',
  agreementDate: '2026-05-15',
  effectiveDate: '2026-07-03',
  expiryDate: '2027-07-02',
  applicant: {
    name: 'Tan Chong Construction Pte Ltd',
    address: '10 Tuas South Street 2, Singapore 637542',
  },
  beneficiary: {
    name: 'Housing & Development Board',
    address: 'HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480',
  },
  bank: {
    name: 'United Overseas Bank Limited',
    registrationNumber: '193500026Z',
    address: '80 Raffles Place, UOB Plaza, Singapore 048624',
  },
  contractNature:
    'supply and installation of precast structural components under HDB Tender Ref HDB-CONST-2026-0441',
  guaranteedSum: {
    currency: 'SGD',
    figures: 750000,
    words: 'Seven Hundred and Fifty Thousand',
  },
  signatory: {
    name: 'Alexandra Teo',
    title: 'Vice President, Trade Finance Operations',
  },
};
```

- [ ] **Step 5: Run assembleVC tests — confirm they pass**

```bash
npm test -- --reporter=verbose src/vc/assembleVC.test.ts
```

Expected: 12 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/vc/assembleVC.ts src/vc/assembleVC.test.ts src/sample/sampleInput.ts
git commit -m "feat: replace assembleVC and sample data for UOB schema"
```

---

### Task 3: UOB renderer (GuaranteePreview)

**Files:**
- Create: `src/assets/uob-logo.png`
- Modify: `src/renderer/GuaranteePreview.tsx`
- Modify: `src/renderer/GuaranteePreview.test.tsx`

**Interfaces:**
- Consumes: `CredentialSubject` shape from Task 2's `assembleVC` output
- Produces: `GuaranteePreview({ subject, issuerDid? })` — consumed by Task 4 (Form) and Task 5 (wiring)

- [ ] **Step 1: Download the UOB logo**

```bash
mkdir -p src/assets
curl -L -o src/assets/uob-logo.png \
  "https://www.uob.com.sg/assets/images/header/uob-logo.png"
```

If the curl fails (403/404), open `https://www.uob.com.sg` in a browser, right-click the UOB logo in the header → "Save Image As" → save to `src/assets/uob-logo.png`. The file must exist before running tests (Vite processes the import at transform time).

- [ ] **Step 2: Rewrite `src/renderer/GuaranteePreview.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuaranteePreview from './GuaranteePreview';

const subject = {
  guaranteeNumber: 'BG-UOB-2026-00123',
  issuanceDate: '2026-07-03',
  agreementDate: '2026-05-15',
  effectiveDate: '2026-07-03',
  expiryDate: '2027-07-02',
  applicant: { name: 'Tan Chong Construction Pte Ltd', address: '10 Tuas South Street 2, Singapore 637542' },
  beneficiary: { name: 'Housing & Development Board', address: 'HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480' },
  bank: {
    name: 'United Overseas Bank Limited',
    registrationNumber: '193500026Z',
    address: '80 Raffles Place, UOB Plaza, Singapore 048624',
  },
  contractNature: 'construction services',
  guaranteedSum: { currency: 'SGD', figures: 750000, words: 'Seven Hundred and Fifty Thousand' },
  signatory: {
    name: 'Alexandra Teo',
    title: 'Vice President, Trade Finance Operations',
    signatureImage: 'data:image/svg+xml;base64,PHN2Zy8+',
  },
};

describe('GuaranteePreview', () => {
  it('renders the guarantee number', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/BG-UOB-2026-00123/)).toBeInTheDocument();
  });

  it('renders beneficiary name in the To block', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Housing & Development Board/)).toBeInTheDocument();
  });

  it('renders bank name and registration number in clause 1', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/United Overseas Bank Limited/)).toBeInTheDocument();
    expect(screen.getByText(/193500026Z/)).toBeInTheDocument();
  });

  it('renders guaranteed sum words and comma-formatted figures', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Seven Hundred and Fifty Thousand/)).toBeInTheDocument();
    expect(screen.getByText(/750,000/)).toBeInTheDocument();
  });

  it('renders expiry date in clause 2', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/2027-07-02/)).toBeInTheDocument();
  });

  it('renders 4 p.m. Singapore time cut-off in clause 3', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/4 p\.m\./)).toBeInTheDocument();
    expect(screen.getByText(/Singapore time/)).toBeInTheDocument();
  });

  it('renders signatory name in execution block', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Alexandra Teo/)).toBeInTheDocument();
  });

  it('renders SPECIMEN footer', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/SPECIMEN/)).toBeInTheDocument();
    expect(screen.getByText(/IMDA TradeTrust eBG pilot/)).toBeInTheDocument();
  });

  it('does not render issuer section when issuerDid is omitted', () => {
    const { container } = render(<GuaranteePreview subject={subject} />);
    expect(container.textContent).not.toContain('Issued by:');
  });

  it('renders issuer domain and explainer when issuerDid is provided', () => {
    const { container } = render(
      <GuaranteePreview subject={subject} issuerDid="did:web:eguarantee.hendrypoh.com" />,
    );
    expect(container.textContent).toContain('eguarantee.hendrypoh.com');
    expect(container.textContent).toContain('How do I know this is really from the bank?');
  });
});
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
npm test -- --reporter=verbose src/renderer/GuaranteePreview.test.tsx
```

Expected: FAIL — old template has different shape.

- [ ] **Step 4: Rewrite `src/renderer/GuaranteePreview.tsx`**

```tsx
import uobLogo from '../../assets/uob-logo.png';

interface CredentialSubject {
  guaranteeNumber: string;
  issuanceDate: string;
  agreementDate: string;
  effectiveDate: string;
  expiryDate: string;
  applicant: { name: string; address: string };
  beneficiary: { name: string; address: string };
  bank: { name: string; registrationNumber: string; address: string };
  contractNature: string;
  guaranteedSum: { currency: string; figures: number; words: string };
  signatory: { name: string; title: string; signatureImage: string };
}

interface Props {
  subject: CredentialSubject;
  issuerDid?: string;
}

function fmt(n: number): string {
  return n.toLocaleString('en-SG');
}

function domainFromDid(did: string): string {
  return did.startsWith('did:web:') ? did.slice('did:web:'.length).replace(/:/g, '/') : did;
}

export default function GuaranteePreview({ subject, issuerDid }: Props) {
  const domain = issuerDid ? domainFromDid(issuerDid) : null;

  return (
    <div className="bg-white font-serif text-sm leading-relaxed text-black">
      <div className="max-w-3xl mx-auto px-12 py-10">
        {/* UOB logo — top right per UOB letter convention */}
        <div className="flex justify-end mb-8">
          <img src={uobLogo} alt="United Overseas Bank" className="h-12" />
        </div>

        <p className="mb-6 font-semibold">Guarantee No.: {subject.guaranteeNumber}</p>

        {/* To block */}
        <div className="mb-6">
          <p>To: {subject.beneficiary.name}</p>
          <p className="whitespace-pre-line">{subject.beneficiary.address}</p>
          <p>(hereafter referred to as &ldquo;you&rdquo;)</p>
        </div>

        {/* WHEREAS */}
        <p className="mb-6">
          WHEREAS an agreement dated {subject.agreementDate} was made between you and {subject.applicant.name} of{' '}
          {subject.applicant.address} (the &ldquo;Applicant&rdquo;) for {subject.contractNature} (the
          &ldquo;Contract&rdquo;).
        </p>

        {/* Clause 1 */}
        <div className="mb-4 space-y-3">
          <p>
            <span className="font-semibold">1.</span> Now we, {subject.bank.name} (company registration number{' '}
            {subject.bank.registrationNumber}) of {subject.bank.address} in consideration of the premises and at the
            request of the Applicant hereby guarantee payment to you of a sum or sums not exceeding the aggregate of{' '}
            {subject.guaranteedSum.words} only ({subject.guaranteedSum.currency} {fmt(subject.guaranteedSum.figures)}){' '}
            (the &ldquo;Guaranteed Sum&rdquo;) upon our receipt in Singapore of your written demand stating that the
            Applicant [is in breach of the Contract], such statement of demand shall be deemed final and conclusive
            without any further investigation on our part including as to the authenticity or authority of the signatory
            to such statement of demand.
          </p>
          <p className="pl-6">
            PROVIDED ALWAYS THAT the Guaranteed Sum shall be automatically reduced by the aggregate amount of any sums
            paid hereunder, and our total liability hereunder shall in no circumstance exceed the Guaranteed Sum.
          </p>
          <p className="pl-6">
            Our obligation to pay under this Guarantee is unconditional and arises upon a written demand (as described
            above) being received, without any regard to the terms and conditions of the Contract.
          </p>
        </div>

        {/* Clause 2 */}
        <div className="mb-4 space-y-2">
          <p>
            <span className="font-semibold">2.</span> This Guarantee shall be effective from {subject.effectiveDate}{' '}
            and shall expire on the earliest of the following dates (the &ldquo;Expiry Date&rdquo;):&mdash;
          </p>
          <div className="pl-6 space-y-1">
            <p>
              (i) {subject.expiryDate} provided that if such date is not a business day, then such date shall be deemed
              to fall on the following business day;
            </p>
            <p>(ii) the date the Guaranteed Sum is automatically reduced to zero hereunder;</p>
            <p>(iii) the date we receive the original of this Guarantee for cancellation; or</p>
            <p>(iv) the date you expressly discharge us from our obligations hereunder in writing.</p>
          </div>
          <p className="pl-6">
            PROVIDED ALWAYS THAT we may at any time without being required to do so pay to you the undrawn portion of
            the Guaranteed Sum in full, whereupon our liability hereunder shall immediately cease and determine.
          </p>
        </div>

        {/* Clause 3 */}
        <p className="mb-4">
          <span className="font-semibold">3.</span> All demands under this Guarantee must be received by us in
          Singapore on or before 4 p.m. of the Expiry Date (Singapore time), after which this Guarantee shall be null
          and void and our obligations shall cease, and no demand for payment shall be permitted or entertained by us
          notwithstanding that this Guarantee may not have been returned to us for cancellation.
        </p>

        {/* Clause 4 */}
        <p className="mb-4">
          <span className="font-semibold">4.</span> You may not assign the benefit of this Guarantee without our prior
          written consent. Any demand by an approved assignee must be accompanied by the original copy of this
          Guarantee. [We shall be entitled to assign or transfer any part or all of our rights and or obligations under
          this Guarantee and shall notify you in writing in the event of such assignment or transfer.]
        </p>

        {/* Clause 5 */}
        <p className="mb-4">
          <span className="font-semibold">5.</span> This Guarantee may be executed in any number of counterparts,
          each of which when executed and delivered is an original and all of which together evidence the same
          Guarantee.
        </p>

        {/* Clause 6 */}
        <p className="mb-4">
          <span className="font-semibold">6.</span> In addition to the rights conferred by any applicable laws, you
          consent to our disclosure of any information relating to this Guarantee where such disclosure may be required
          under any applicable law or regulation or by any governmental authority or body with whose requests we are
          accustomed to or required to comply.
        </p>

        {/* Clause 7 */}
        <p className="mb-4">
          <span className="font-semibold">7.</span> A person who is not a party to this Guarantee may not enforce any
          of its terms under the Contracts (Rights of Third Parties) Act 2001 of Singapore. Any amendment of any
          provision of this Guarantee will only be effective if made in writing and signed by both parties to this
          Guarantee.
        </p>

        {/* Clause 8 */}
        <p className="mb-8">
          <span className="font-semibold">8.</span> This Guarantee and all matters arising from this Guarantee shall
          be governed by and construed in accordance with the laws of the Republic of Singapore. By accepting this
          Guarantee, you hereby irrevocably submit to the exclusive jurisdiction of the courts of Singapore.
        </p>

        <p className="mb-10">Dated {subject.issuanceDate}</p>

        {/* Execution blocks */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border border-black p-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-4">Execution block of UOB</p>
            <img
              src={subject.signatory.signatureImage}
              alt="Authorised signatory"
              className="h-14 mb-2"
            />
            <div className="border-t border-black pt-2">
              <p className="font-semibold">{subject.signatory.name}</p>
              <p>{subject.signatory.title}</p>
              <p>{subject.bank.name}</p>
            </div>
          </div>
          <div className="border border-black p-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-4">
              Execution block of Beneficiary of Guarantee
            </p>
            <p className="text-xs text-gray-400 mt-8">(Customer to sign on a copy of the BG)</p>
          </div>
        </div>

        {/* Specimen footer */}
        <p className="text-xs text-gray-400 text-center border-t border-gray-200 pt-3 print:block">
          SPECIMEN — issued for demonstration under the IMDA TradeTrust eBG pilot. Not a valid instrument.
        </p>
      </div>

      {/* Issuer identity section — shown when issuerDid is provided (in-app preview and trustvc.io) */}
      {domain && (
        <div className="max-w-3xl mx-auto px-12 py-6 border-t-2 border-gray-200 font-sans text-sm">
          <p className="font-semibold text-base mb-2">
            Issued by:{' '}
            <span className="font-mono">{domain}</span>{' '}
            <span className="text-green-600">✓</span>
          </p>
          <details>
            <summary className="cursor-pointer text-blue-600 hover:underline">
              How do I know this is really from the bank?
            </summary>
            <ol className="mt-3 space-y-2 pl-5 list-decimal text-gray-700">
              <li>The document carries a digital signature created with the issuer&apos;s private key.</li>
              <li>
                The matching public key is published in a DID document at the issuer&apos;s own web domain
                (did:web). Only someone who controls that domain&apos;s web server can publish it — the trust
                anchor is domain control, same as the padlock in your browser.
              </li>
              <li>
                Verification = signature checks out against the key at that domain, and the document
                hasn&apos;t been altered since signing.
              </li>
              <li>
                In this demo the issuer is a placeholder domain. In a live pilot, the bank publishes one small
                file on its own domain (e.g. uob.com.sg) — that is the entire identity integration. A future
                step is an IMDA/MAS-maintained trusted-issuer list on top of this.
              </li>
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run renderer tests — confirm they pass**

```bash
npm test -- --reporter=verbose src/renderer/GuaranteePreview.test.tsx
```

Expected: 10 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/assets/uob-logo.png src/renderer/GuaranteePreview.tsx src/renderer/GuaranteePreview.test.tsx
git commit -m "feat: replace renderer with UOB formal letter template and issuer identity section"
```

---

### Task 4: Form replacement

**Files:**
- Modify: `src/form/GuaranteeForm.tsx`

**Interfaces:**
- Consumes: `GuaranteeFormData` from Task 1, `sampleInput` from Task 2

No unit tests for the form — it's pure UI wiring. TypeScript build is the verification step.

- [ ] **Step 1: Rewrite `src/form/GuaranteeForm.tsx`**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guaranteeSchema, type GuaranteeFormData } from './schema';
import { sampleInput } from '../sample/sampleInput';
import InputField from './fields/InputField';
import DateField from './fields/DateField';
import NumberField from './fields/NumberField';
import TextareaField from './fields/TextareaField';

interface Props {
  onSubmit: (data: GuaranteeFormData) => void;
  onValidChange: (isValid: boolean, data: GuaranteeFormData) => void;
  isSubmitting: boolean;
}

export default function GuaranteeForm({ onSubmit, onValidChange, isSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<GuaranteeFormData>({
    resolver: zodResolver(guaranteeSchema),
    mode: 'onChange',
  });

  const formValues = watch();

  // useEffect removed — onValidChange called inline via watch subscription
  // eslint-disable-next-line react-hooks/exhaustive-deps
  import { useEffect } from 'react';
  useEffect(() => {
    onValidChange(isValid, formValues);
  }, [isValid, JSON.stringify(formValues)]);

  function fillSample() {
    reset(sampleInput);
  }

  const sectionClass = 'flex flex-col gap-3';
  const headingClass = 'text-xs font-bold uppercase tracking-wide text-indigo-500 mt-4 first:mt-0';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 pb-4">
      <button
        type="button"
        onClick={fillSample}
        className="self-start rounded-md border border-indigo-300 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
      >
        Fill sample data
      </button>

      {/* Guarantee Details */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Guarantee Details</h3>
        <InputField
          label="Guarantee Reference Number"
          placeholder="BG-UOB-2026-00123"
          error={errors.guaranteeNumber?.message}
          {...register('guaranteeNumber')}
        />
        <div className="grid grid-cols-2 gap-3">
          <DateField label="Date of Issuance" error={errors.issuanceDate?.message} {...register('issuanceDate')} />
          <DateField label="Agreement Date" error={errors.agreementDate?.message} {...register('agreementDate')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DateField label="Effective Date" error={errors.effectiveDate?.message} {...register('effectiveDate')} />
          <DateField label="Expiry Date" error={errors.expiryDate?.message} {...register('expiryDate')} />
        </div>
      </div>

      {/* Issuing Bank */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Issuing Bank</h3>
        <InputField
          label="Bank Full Legal Name"
          placeholder="United Overseas Bank Limited"
          error={errors.bank?.name?.message}
          {...register('bank.name')}
        />
        <InputField
          label="Company Registration Number"
          placeholder="193500026Z"
          error={errors.bank?.registrationNumber?.message}
          {...register('bank.registrationNumber')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="80 Raffles Place, UOB Plaza, Singapore 048624"
          error={errors.bank?.address?.message}
          {...register('bank.address')}
        />
      </div>

      {/* Applicant */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Applicant</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Tan Chong Construction Pte Ltd"
          error={errors.applicant?.name?.message}
          {...register('applicant.name')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="10 Tuas South Street 2, Singapore 637542"
          error={errors.applicant?.address?.message}
          {...register('applicant.address')}
        />
      </div>

      {/* Beneficiary */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Beneficiary</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Housing & Development Board"
          error={errors.beneficiary?.name?.message}
          {...register('beneficiary.name')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480"
          error={errors.beneficiary?.address?.message}
          {...register('beneficiary.address')}
        />
      </div>

      {/* Contract */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Contract</h3>
        <TextareaField
          label="Nature of Contract"
          placeholder="supply and installation of precast structural components under HDB Tender Ref HDB-CONST-2026-0441"
          error={errors.contractNature?.message}
          {...register('contractNature')}
        />
      </div>

      {/* Guaranteed Sum */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Guaranteed Sum</h3>
        <div className="grid grid-cols-3 gap-3">
          <InputField
            label="Currency"
            placeholder="SGD"
            maxLength={3}
            error={errors.guaranteedSum?.currency?.message}
            {...register('guaranteedSum.currency')}
          />
          <div className="col-span-2">
            <NumberField
              label="Amount (figures)"
              placeholder="750000"
              error={errors.guaranteedSum?.figures?.message}
              {...register('guaranteedSum.figures', { valueAsNumber: true })}
            />
          </div>
        </div>
        <TextareaField
          label="Amount in Words"
          placeholder="Seven Hundred and Fifty Thousand"
          error={errors.guaranteedSum?.words?.message}
          {...register('guaranteedSum.words')}
        />
      </div>

      {/* Signatory */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Signatory</h3>
        <InputField
          label="Name"
          placeholder="Alexandra Teo"
          error={errors.signatory?.name?.message}
          {...register('signatory.name')}
        />
        <InputField
          label="Title"
          placeholder="Vice President, Trade Finance Operations"
          error={errors.signatory?.title?.message}
          {...register('signatory.title')}
        />
      </div>

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="mt-4 w-full rounded-md bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? 'Signing…' : 'Sign & Download VC'}
      </button>
    </form>
  );
}
```

**Note:** The `import { useEffect }` is misplaced in the snippet above — it belongs at the top of the file with the other React import. The final file should have a single import block at the top:

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
// ... rest of imports
```

Remove the inline `import` comment in the body.

- [ ] **Step 2: Run TypeScript build to confirm no type errors**

```bash
npm run build 2>&1 | head -40
```

Expected: Build succeeds with no TypeScript errors. (Vite/Rollup may emit `dist/` output.)

- [ ] **Step 3: Commit**

```bash
git add src/form/GuaranteeForm.tsx
git commit -m "feat: replace form fields for UOB schema"
```

---

### Task 5: Rebrand + App.tsx + RendererApp.tsx wiring

**Files:**
- Modify: `index.html`
- Modify: `src/App.tsx`
- Modify: `src/renderer-app/RendererApp.tsx`

**Interfaces:**
- Consumes: `GuaranteePreview` `issuerDid?` prop from Task 3
- Produces: Complete working app — in-app preview and decentralised renderer both show issuer identity section

- [ ] **Step 1: Update `index.html`**

Change line 6 from:
```html
    <title>eGuarantee Creator</title>
```
To:
```html
    <title>YORK — Your Online LetterOfGuarantee Kit</title>
```

- [ ] **Step 2: Rewrite `src/App.tsx`**

Replace the entire file:

```tsx
import { useState } from 'react';
import GuaranteeForm from './form/GuaranteeForm';
import GuaranteePreview from './renderer/GuaranteePreview';
import VcJsonViewer from './renderer/VcJsonViewer';
import { assembleVC } from './vc/assembleVC';
import type { GuaranteeFormData } from './form/schema';

const ISSUER_DID = import.meta.env.VITE_DID_WEB ?? '';
const RENDERER_URL = import.meta.env.VITE_RENDERER_URL ?? 'https://eguarantee.hendrypoh.com/renderer';

type AppState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'signed'; signedVC: object };

export default function App() {
  const [appState, setAppState] = useState<AppState>({ phase: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [liveVC, setLiveVC] = useState<ReturnType<typeof assembleVC> | null>(null);

  function handleValidChange(isValid: boolean, data: GuaranteeFormData) {
    if (isValid) {
      setLiveVC(assembleVC(data, ISSUER_DID || 'did:web:pending-setup', RENDERER_URL));
    }
  }

  async function handleSubmit(data: GuaranteeFormData) {
    setError(null);
    setAppState({ phase: 'submitting' });
    try {
      const unsignedVC = assembleVC(data, ISSUER_DID || 'did:web:pending-setup', RENDERER_URL);
      const res = await fetch('/api/vc/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unsignedVC }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const { signedVC } = await res.json();
      setAppState({ phase: 'signed', signedVC });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed');
      setAppState({ phase: 'idle' });
    }
  }

  function downloadSignedVC(signedVC: object) {
    const blob = new Blob([JSON.stringify(signedVC, null, 2)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bankers_guarantee.tt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const previewVC = appState.phase === 'signed' ? appState.signedVC : liveVC;
  const credentialSubject = previewVC
    ? (previewVC as { credentialSubject: Parameters<typeof GuaranteePreview>[0]['subject'] }).credentialSubject
    : null;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Nav bar */}
      <header className="flex flex-col bg-indigo-600 px-6 py-3 text-white shadow">
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-wide">YORK — Your Online LetterOfGuarantee Kit</span>
          {ISSUER_DID ? (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-mono">✓ {ISSUER_DID}</span>
          ) : (
            <span className="rounded-full bg-yellow-300 text-yellow-900 px-3 py-1 text-xs">
              ⚠ Identity not configured — run npm run setup
            </span>
          )}
        </div>
        <p className="text-xs text-indigo-200 mt-0.5">
          Built on TradeTrust — decentralised and open-source, so YORK can be deployed inside a bank&apos;s own
          environment beyond Phase 1.
        </p>
      </header>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <aside className="w-[45%] overflow-y-auto border-r border-slate-200 bg-white px-6 py-4">
          <GuaranteeForm
            onSubmit={handleSubmit}
            onValidChange={handleValidChange}
            isSubmitting={appState.phase === 'submitting'}
          />
          {error && (
            <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </aside>

        {/* Right: Preview */}
        <main className="flex-1 overflow-y-auto bg-slate-50 px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 mb-3">Preview</p>

          {credentialSubject ? (
            <>
              <GuaranteePreview
                subject={credentialSubject}
                issuerDid={ISSUER_DID || undefined}
              />

              {appState.phase === 'signed' && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-green-700">✓ Signed VC ready</p>
                    <p className="text-xs text-green-600">Drag bankers_guarantee.tt onto trustvc.io to verify</p>
                  </div>
                  <button
                    onClick={() =>
                      downloadSignedVC((appState as { phase: 'signed'; signedVC: object }).signedVC)
                    }
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Download bankers_guarantee.tt
                  </button>
                </div>
              )}

              <VcJsonViewer
                vc={previewVC!}
                label={appState.phase === 'signed' ? 'Signed VC JSON ▾' : 'Unsigned VC JSON (preview) ▾'}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Fill in the form to see the guarantee preview
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/renderer-app/RendererApp.tsx`**

Replace the entire file:

```tsx
import { useEffect, useRef, useState } from 'react';
import { connectToParent } from 'penpal';
import GuaranteePreview from '../renderer/GuaranteePreview';

type CredentialSubject = Parameters<typeof GuaranteePreview>[0]['subject'];

const TEMPLATES = [{ id: 'EBG', label: "Banker's Guarantee", type: 'custom' }];
const noop = () => {};

export default function RendererApp() {
  const [subject, setSubject] = useState<CredentialSubject | null>(null);
  const [issuerDid, setIssuerDid] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatchToHost = useRef<(action: object) => void>(noop);

  useEffect(() => {
    const connection = connectToParent<{ dispatch: (action: object) => Promise<void> }>({
      methods: {
        dispatch(action: { type: string; payload: any }) {
          if (action.type === 'RENDER_DOCUMENT') {
            const doc = action.payload?.document ?? action.payload;
            setSubject(doc?.credentialSubject ?? null);
            const issuer = doc?.issuer;
            setIssuerDid(typeof issuer === 'string' ? issuer : issuer?.id);
            dispatchToHost.current({ type: 'UPDATE_TEMPLATES', payload: TEMPLATES });
          } else if (action.type === 'GET_TEMPLATES') {
            dispatchToHost.current({ type: 'UPDATE_TEMPLATES', payload: TEMPLATES });
            return TEMPLATES;
          } else if (action.type === 'SELECT_TEMPLATE') {
            // single template, nothing to do
          } else if (action.type === 'PRINT') {
            window.print();
          }
        },
      },
      timeout: 30000,
    });

    connection.promise.then((parent) => {
      dispatchToHost.current = (action) => parent.dispatch(action);
    });

    return () => connection.destroy();
  }, []);

  useEffect(() => {
    if (!subject || !containerRef.current) return;
    requestAnimationFrame(() => {
      if (containerRef.current) {
        dispatchToHost.current({ type: 'UPDATE_HEIGHT', payload: containerRef.current.scrollHeight });
      }
    });
  }, [subject]);

  if (!subject) return null;

  return (
    <div ref={containerRef}>
      <GuaranteePreview subject={subject} issuerDid={issuerDid} />
    </div>
  );
}
```

- [ ] **Step 4: Run full test suite and build**

```bash
npm test && npm run build 2>&1 | tail -20
```

Expected: All tests pass. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add index.html src/App.tsx src/renderer-app/RendererApp.tsx
git commit -m "feat: rebrand to YORK, wire issuerDid through app and renderer"
```

---

### Task 6: Schema documentation

**Files:**
- Create: `docs/schema.md`

- [ ] **Step 1: Create `docs/schema.md`**

```markdown
# YORK credentialSubject Schema

This file documents every field in `credentialSubject` for the UOB Banker's Guarantee VC.
It is the canonical reference for the Excel front-end re-templating pass.

All field names follow JSON dot-notation paths relative to `credentialSubject`.

| Field | Type | Required | Description | UOB clause / slot |
|---|---|---|---|---|
| `guaranteeNumber` | string | yes | Bank-assigned guarantee reference number | Header "Guarantee No." |
| `issuanceDate` | string (YYYY-MM-DD) | yes | Date the guarantee is issued and signed | "Dated ___" |
| `agreementDate` | string (YYYY-MM-DD) | yes | Date of the underlying contract | "WHEREAS an agreement dated ___" |
| `effectiveDate` | string (YYYY-MM-DD) | yes | Date from which the guarantee is in force | Clause 2 "effective from ___" |
| `expiryDate` | string (YYYY-MM-DD) | yes | Specific calendar expiry date | Clause 2(i) |
| `applicant.name` | string | yes | Full legal name of the applicant (contractor/buyer) | "made between you and ___ (the 'Applicant')" |
| `applicant.address` | string | yes | Registered address of the applicant | "of [address]" |
| `beneficiary.name` | string | yes | Full legal name of the guarantee beneficiary | "To: [Beneficiary of Guarantee]" |
| `beneficiary.address` | string | yes | Registered address of the beneficiary | To block |
| `bank.name` | string | yes | Full legal name of the issuing bank | Clause 1 "we, [BANK]" |
| `bank.registrationNumber` | string | yes | ACRA registration number of the bank | Clause 1 "(company registration number [•])" |
| `bank.address` | string | yes | Registered address of the bank | Clause 1 "of [address]" |
| `contractNature` | string | yes | Plain-language description of the contract type | WHEREAS "[state nature of contract]" |
| `guaranteedSum.currency` | string (ISO 4217) | yes | Currency code, e.g. "SGD" | Clause 1 amount |
| `guaranteedSum.figures` | number | yes | Guarantee amount as a number, e.g. 750000 | Clause 1 "($___)" |
| `guaranteedSum.words` | string | yes | Amount in English words — operator-supplied, not auto-generated | Clause 1 "___ only" |
| `signatory.name` | string | yes | Name of the authorised bank signatory | Execution block |
| `signatory.title` | string | yes | Job title of the authorised bank signatory | Execution block |
| `signatory.signatureImage` | string (data URI) | yes | Base64-encoded SVG/PNG handwriting signature | Execution block (above printed name) |

## Notes

- `guaranteedSum.words` must be supplied by the operator. The renderer does not auto-convert figures to words.
- `signatory.signatureImage` is currently injected as a static constant in `assembleVC.ts`. In a production deployment, the bank would supply a real image.
- All dates must be `YYYY-MM-DD` (ISO 8601 date only, no time component).
- `expiryDate` must be strictly after `issuanceDate`. `effectiveDate` must be on or before `expiryDate`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/schema.md
git commit -m "docs: add credentialSubject schema glossary for Excel front-end alignment"
```

---

### Task 7: Open the pull request

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feature/eguarantee-build
```

- [ ] **Step 2: Create the PR**

```bash
gh pr create \
  --title "feat: YORK realism pass — UOB BG template, rebrand, issuer identity" \
  --body "$(cat <<'EOF'
## Summary

- Rebrands the app to **YORK — Your Online LetterOfGuarantee Kit** (cosmetic; URLs unchanged)
- Replaces the generic 4-clause renderer with UOB's approved 8-clause Banker's Guarantee format (verbatim legal text, merge fields from new schema)
- Extends credentialSubject schema to full UOB field set: nested `applicant`, `beneficiary`, `bank`, `guaranteedSum`, `signatory`
- Injects static fictitious signature (Alexandra Teo) as a base64 SVG — deliberate provocation for the pilot conversation
- Adds issuer identity section to the renderer (domain extracted from `did:web` DID, expandable "How do I know?" explainer) — visible on trustvc.io / ref.tradetrust.io
- Adds `docs/schema.md` field glossary for Excel front-end alignment

## Deployment

Merging to `main` triggers both pipelines automatically:
- GitHub Actions → GitHub Pages (renderer + static frontend at `eguarantee.hendrypoh.com`)
- Render.com → Express signing API

## Test plan

- [ ] `npm test` passes (all 3 test files)
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] Fill sample data → preview shows UOB logo, 8 clauses, Alexandra Teo signature, SPECIMEN footer
- [ ] Sign → download `.tt` → drag onto trustvc.io → UOB BG renders with issuer identity section
- [ ] Tamper test: edit a field in the `.tt` JSON → re-verify on trustvc.io → verification fails

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 9 spec sections covered — rebrand (Task 5), schema (Task 1), form (Task 4), assembleVC (Task 2), renderer (Task 3), RendererApp (Task 5), issuer identity (Task 3), sample payload (Task 2), schema docs (Task 6)
- [x] **No placeholders:** Every step has complete code or exact commands
- [x] **Type consistency:** `GuaranteeFormData` defined in Task 1, consumed identically in Tasks 2, 4, 5. `assembleVC` return shape matches `CredentialSubject` interface in Task 3. `issuerDid?: string` prop consistent across Tasks 3 and 5
- [x] **UOB logo prerequisite:** Task 3 Step 1 must complete before `npm test` in Step 5 (file import will fail otherwise)
- [x] **Form import fix noted:** Task 4 Step 1 notes the `import { useEffect }` must be at the top of the file
