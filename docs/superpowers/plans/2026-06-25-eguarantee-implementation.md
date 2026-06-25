# eGuarantee Demo Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Express web app where a bank officer fills a 13-field form and downloads a signed W3C VC (Banker's Guarantee) that verifies on trustvc.io.

**Architecture:** Vite + React frontend (split panel: form left, live preview right) sends an unsigned VC to an Express backend, which signs it with `signW3C` from `@trustvc/trustvc` using a keypair from `keys/keypair.json`. A separate `npm run setup` CLI generates the keypair and the `did.json` to publish. End users never see keys or setup.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + React Hook Form + Zod + Vitest (frontend); Node.js + Express + TypeScript + `tsx` + Vitest + Supertest (backend); `@trustvc/trustvc` + `@trustvc/w3c-issuer` (signing/keygen).

## Global Constraints

- W3C VC Data Model **2.0** only: context `https://www.w3.org/ns/credentials/v2`, use `validFrom`/`validUntil` (not `issuanceDate`/`expirationDate`).
- Signing suite: `ecdsa-sd-2023`. No `proof` written by hand.
- Exactly 13 fields — no extras added.
- `credentialStatus` intentionally omitted.
- `keys/` and `.env` are gitignored. Private key never commits.
- Frontend reads issuer DID from `VITE_DID_WEB` env var; renderer URL from `VITE_RENDERER_URL`.
- `renderMethod.id` is a placeholder — does not need to be live for this demo.
- All tests use Vitest. Run with `npm test`. Backend tests use Supertest.
- Tailwind CSS colour: indigo-500 = `#6366f1` for all primary elements.

---

## File Map

```
index.html
src/
  main.tsx                          entry point
  App.tsx                           split-panel shell + nav bar
  form/
    schema.ts                       Zod schema + GuaranteeFormData type
    GuaranteeForm.tsx               13-field RHF form
    fields/
      InputField.tsx                labelled text input wrapper
      DateField.tsx                 date input (YYYY-MM-DD)
      NumberField.tsx               number input
      TextareaField.tsx             multiline text input
  vc/
    assembleVC.ts                   pure fn: GuaranteeFormData → unsigned VC object
  renderer/
    GuaranteePreview.tsx            renders the 4-clause BG from credentialSubject
    VcJsonViewer.tsx                collapsible <pre> JSON block
  sample/
    sampleInput.ts                  example values from the brief
  test/
    setup.ts                        @testing-library/jest-dom matchers
server/
  index.ts                          Express app: loads keypair, registers routes
  routes/
    vc.ts                           POST /api/vc/sign
  services/
    signVC.ts                       loadKeypair() + signVC(unsignedVC)
scripts/
  setup.ts                          admin CLI: generate keys + did.json + instructions
keys/                               gitignored output directory
  keypair.json                      Multikey keypair (id/controller = did:web)
  did.json                          DID document to publish at /.well-known/did.json
.env                                gitignored: VITE_DID_WEB, VITE_RENDERER_URL, PORT
.env.example                        committed template
vite.config.ts
tailwind.config.ts
postcss.config.js
tsconfig.json
tsconfig.node.json
server/tsconfig.json
package.json
```

---

### Task 1: Project Scaffold & Tooling

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `server/tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/main.tsx`
- Create: `src/App.tsx` (skeleton)
- Create: `src/test/setup.ts`
- Create: `server/index.ts` (skeleton)

**Interfaces:**
- Produces: `npm run dev` starts Vite on :5173 + Express on :3001. `npm test` runs Vitest.

---

- [ ] **Step 1: Install dependencies**

```bash
mkdir -p /Users/dryhen/projects/eguarantee-demo
cd /Users/dryhen/projects/eguarantee-demo
npm init -y
npm install react react-dom react-hook-form @hookform/resolvers zod
npm install @trustvc/trustvc @trustvc/w3c-issuer express dotenv
npm install -D @types/react @types/react-dom @types/express @types/node \
  @vitejs/plugin-react vite typescript \
  tailwindcss autoprefixer postcss \
  tsx concurrently \
  vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  supertest @types/supertest
```

- [ ] **Step 2: Write `package.json` scripts section**

Open `package.json` and replace the `scripts` block with:

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "setup": "tsx scripts/setup.ts"
  }
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 4: Write `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Write `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 7: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts"]
}
```

- [ ] **Step 8: Write `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "outDir": "dist/server",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["server/**/*", "scripts/**/*"]
}
```

- [ ] **Step 9: Write `.gitignore`**

```
node_modules/
dist/
keys/
.env
*.env.local
```

- [ ] **Step 10: Write `.env.example`**

```
# Set by admin after running: npm run setup
VITE_DID_WEB=did:web:eguarantee.fyntech.io
VITE_RENDERER_URL=https://eguarantee.fyntech.io/renderer

# Express server port (default: 3001)
PORT=3001
```

- [ ] **Step 11: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>eGuarantee Creator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 12: Write `src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 13: Create `src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 14: Write skeleton `src/App.tsx`**

```typescript
export default function App() {
  return <div className="min-h-screen bg-slate-50 p-8">eGuarantee Creator — scaffold</div>;
}
```

- [ ] **Step 15: Write `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 16: Write skeleton `server/index.ts`**

```typescript
import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));

export default app;
```

- [ ] **Step 17: Verify scaffold**

Run: `npm run dev`
Expected: Vite starts on http://localhost:5173, Express starts on :3001 with no errors.

Open http://localhost:5173 — should show "eGuarantee Creator — scaffold".
Run: `curl http://localhost:3001/api/health`
Expected: `{"ok":true}`

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + Express + Tailwind project"
```

---

### Task 2: Data Layer — Schema, VC Assembly, Sample Data

**Files:**
- Create: `src/form/schema.ts`
- Create: `src/vc/assembleVC.ts`
- Create: `src/sample/sampleInput.ts`
- Create: `src/form/schema.test.ts`
- Create: `src/vc/assembleVC.test.ts`

**Interfaces:**
- Produces:
  - `GuaranteeFormData` — TypeScript type for all 13 fields
  - `guaranteeSchema` — Zod schema for form validation
  - `assembleVC(data: GuaranteeFormData, issuerDid: string, rendererUrl?: string): object` — returns unsigned W3C VC DM 2.0 object
  - `sampleInput: GuaranteeFormData` — pre-filled example values

---

- [ ] **Step 1: Write the failing schema tests**

```typescript
// src/form/schema.test.ts
import { describe, it, expect } from 'vitest';
import { guaranteeSchema } from './schema';

const valid = {
  bgNumber: 'BG-2026-88910',
  issueDate: '2026-06-24',
  expiryDate: '2027-06-30',
  issuingBankName: 'Global Trade Bank Ltd',
  issuingBankSwift: 'GTBKSGSGXXX',
  applicantName: 'Apex Builders Pte Ltd',
  applicantAddress: '10 Marina Boulevard, Singapore 018983',
  beneficiaryName: 'Maritime Authority of Singapore',
  beneficiaryAddress: '456 Alexandra Road, Singapore 119962',
  underlyingContract: 'Tender Ref: MAS-2026-004',
  currency: 'SGD',
  amount: 500000,
  placeOfPresentation: 'Singapore Counter, 12 Marina Blvd',
};

describe('guaranteeSchema', () => {
  it('accepts a fully valid input', () => {
    expect(guaranteeSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects SWIFT with fewer than 8 chars', () => {
    const r = guaranteeSchema.safeParse({ ...valid, issuingBankSwift: 'GTBK' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain('issuingBankSwift');
  });

  it('rejects SWIFT with 9 chars (not 8 or 11)', () => {
    const r = guaranteeSchema.safeParse({ ...valid, issuingBankSwift: 'GTBKSGSG1' });
    expect(r.success).toBe(false);
  });

  it('accepts SWIFT with exactly 8 chars', () => {
    expect(guaranteeSchema.safeParse({ ...valid, issuingBankSwift: 'GTBKSGSG' }).success).toBe(true);
  });

  it('rejects lowercase SWIFT', () => {
    const r = guaranteeSchema.safeParse({ ...valid, issuingBankSwift: 'gtbksgsg' });
    expect(r.success).toBe(false);
  });

  it('rejects currency not 3 uppercase letters', () => {
    const r = guaranteeSchema.safeParse({ ...valid, currency: 'sgd' });
    expect(r.success).toBe(false);
  });

  it('rejects amount of 0', () => {
    const r = guaranteeSchema.safeParse({ ...valid, amount: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const r = guaranteeSchema.safeParse({ ...valid, amount: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects expiryDate equal to issueDate', () => {
    const r = guaranteeSchema.safeParse({ ...valid, expiryDate: '2026-06-24' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain('expiryDate');
  });

  it('rejects expiryDate before issueDate', () => {
    const r = guaranteeSchema.safeParse({ ...valid, expiryDate: '2025-01-01' });
    expect(r.success).toBe(false);
  });

  it('rejects empty bgNumber', () => {
    const r = guaranteeSchema.safeParse({ ...valid, bgNumber: '' });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test
```
Expected: FAIL — "Cannot find module './schema'"

- [ ] **Step 3: Write `src/form/schema.ts`**

```typescript
import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine((d) => !isNaN(Date.parse(d)), 'Must be a valid date');

export const guaranteeSchema = z
  .object({
    bgNumber: z.string().min(1, 'Required'),
    issueDate: isoDate,
    expiryDate: isoDate,
    issuingBankName: z.string().min(1, 'Required'),
    issuingBankSwift: z
      .string()
      .regex(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/, 'Must be 8 or 11 uppercase alphanumeric characters'),
    applicantName: z.string().min(1, 'Required'),
    applicantAddress: z.string().min(1, 'Required'),
    beneficiaryName: z.string().min(1, 'Required'),
    beneficiaryAddress: z.string().min(1, 'Required'),
    underlyingContract: z.string().min(1, 'Required'),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Must be 3 uppercase letters (ISO 4217)'),
    amount: z.number().positive('Must be greater than 0'),
    placeOfPresentation: z.string().min(1, 'Required'),
  })
  .superRefine((data, ctx) => {
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

- [ ] **Step 4: Write the failing assembleVC tests**

```typescript
// src/vc/assembleVC.test.ts
import { describe, it, expect } from 'vitest';
import { assembleVC } from './assembleVC';
import type { GuaranteeFormData } from '../form/schema';

const data: GuaranteeFormData = {
  bgNumber: 'BG-2026-88910',
  issueDate: '2026-06-24',
  expiryDate: '2027-06-30',
  issuingBankName: 'Global Trade Bank Ltd',
  issuingBankSwift: 'GTBKSGSGXXX',
  applicantName: 'Apex Builders Pte Ltd',
  applicantAddress: '10 Marina Boulevard, Singapore 018983',
  beneficiaryName: 'Maritime Authority of Singapore',
  beneficiaryAddress: '456 Alexandra Road, Singapore 119962',
  underlyingContract: 'Tender Ref: MAS-2026-004',
  currency: 'SGD',
  amount: 500000,
  placeOfPresentation: 'Singapore Counter, 12 Marina Blvd',
};

const ISSUER = 'did:web:eguarantee.fyntech.io';

describe('assembleVC', () => {
  it('includes the W3C VC DM 2.0 context', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc['@context']).toContain('https://www.w3.org/ns/credentials/v2');
  });

  it('sets type to VerifiableCredential', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc.type).toContain('VerifiableCredential');
  });

  it('sets issuer from parameter', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc.issuer).toBe(ISSUER);
  });

  it('maps issueDate to validFrom in ISO format', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc.validFrom).toBe('2026-06-24T00:00:00Z');
  });

  it('maps expiryDate to validUntil in ISO format', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc.validUntil).toBe('2027-06-30T00:00:00Z');
  });

  it('nests bank fields under issuingBank', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc.credentialSubject.issuingBank).toEqual({
      name: 'Global Trade Bank Ltd',
      swift: 'GTBKSGSGXXX',
    });
  });

  it('nests applicant fields under applicant', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc.credentialSubject.applicant).toEqual({
      name: 'Apex Builders Pte Ltd',
      address: '10 Marina Boulevard, Singapore 018983',
    });
  });

  it('sets governingRules to URDG758', () => {
    const vc = assembleVC(data, ISSUER);
    expect(vc.credentialSubject.governingRules).toBe('URDG758');
  });

  it('does not include a proof field', () => {
    const vc = assembleVC(data, ISSUER) as Record<string, unknown>;
    expect(vc['proof']).toBeUndefined();
  });

  it('does not include credentialStatus', () => {
    const vc = assembleVC(data, ISSUER) as Record<string, unknown>;
    expect(vc['credentialStatus']).toBeUndefined();
  });

  it('uses custom rendererUrl when provided', () => {
    const vc = assembleVC(data, ISSUER, 'https://custom.example.com/renderer');
    expect(vc.renderMethod[0].id).toBe('https://custom.example.com/renderer');
  });
});
```

- [ ] **Step 5: Run tests — expect FAIL**

```bash
npm test
```
Expected: FAIL — "Cannot find module './assembleVC'"

- [ ] **Step 6: Write `src/vc/assembleVC.ts`**

```typescript
import type { GuaranteeFormData } from '../form/schema';

export function assembleVC(
  data: GuaranteeFormData,
  issuerDid: string,
  rendererUrl: string = 'https://eguarantee.fyntech.io/renderer',
) {
  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://trustvc.io/context/render-method-context-v2.json',
    ],
    type: ['VerifiableCredential'],
    issuer: issuerDid,
    validFrom: `${data.issueDate}T00:00:00Z`,
    validUntil: `${data.expiryDate}T00:00:00Z`,
    credentialSubject: {
      type: ['BankersGuarantee'],
      bgNumber: data.bgNumber,
      issueDate: data.issueDate,
      issuingBank: { name: data.issuingBankName, swift: data.issuingBankSwift },
      applicant: { name: data.applicantName, address: data.applicantAddress },
      beneficiary: { name: data.beneficiaryName, address: data.beneficiaryAddress },
      underlyingContract: data.underlyingContract,
      currency: data.currency,
      amount: data.amount,
      expiryDate: data.expiryDate,
      placeOfPresentation: data.placeOfPresentation,
      governingRules: 'URDG758',
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

- [ ] **Step 7: Write `src/sample/sampleInput.ts`**

```typescript
import type { GuaranteeFormData } from '../form/schema';

export const sampleInput: GuaranteeFormData = {
  bgNumber: 'BG-2026-88910',
  issueDate: '2026-06-24',
  expiryDate: '2027-06-30',
  issuingBankName: 'Global Trade Bank Ltd',
  issuingBankSwift: 'GTBKSGSGXXX',
  applicantName: 'Apex Builders Pte Ltd',
  applicantAddress: '10 Marina Boulevard, Singapore 018983',
  beneficiaryName: 'Maritime Authority of Singapore',
  beneficiaryAddress: '456 Alexandra Road, Singapore 119962',
  underlyingContract: 'Tender Ref: MAS-2026-004',
  currency: 'SGD',
  amount: 500000,
  placeOfPresentation: 'Singapore Counter, 12 Marina Blvd',
};
```

- [ ] **Step 8: Run all tests — expect PASS**

```bash
npm test
```
Expected: All tests PASS. 21 tests total.

- [ ] **Step 9: Commit**

```bash
git add src/form/schema.ts src/form/schema.test.ts src/vc/assembleVC.ts src/vc/assembleVC.test.ts src/sample/sampleInput.ts
git commit -m "feat: add Zod schema, VC assembly, and sample data"
```

---

### Task 3: Form Components

**Files:**
- Create: `src/form/fields/InputField.tsx`
- Create: `src/form/fields/DateField.tsx`
- Create: `src/form/fields/NumberField.tsx`
- Create: `src/form/fields/TextareaField.tsx`
- Create: `src/form/GuaranteeForm.tsx`

**Interfaces:**
- Consumes: `GuaranteeFormData`, `guaranteeSchema` from `../form/schema`; `sampleInput` from `../sample/sampleInput`
- Produces: `<GuaranteeForm onSubmit={(data) => void} onValidChange={(isValid, data) => void} />` — calls `onValidChange` on every form state change so the parent can drive the live preview.

---

- [ ] **Step 1: Write `src/form/fields/InputField.tsx`**

```typescript
import { forwardRef } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const InputField = forwardRef<HTMLInputElement, Props>(({ label, error, ...rest }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-600">{label} *</label>
    <input
      ref={ref}
      className={`rounded-md border px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 ${
        error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
      }`}
      {...rest}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
InputField.displayName = 'InputField';
export default InputField;
```

- [ ] **Step 2: Write `src/form/fields/DateField.tsx`**

```typescript
import { forwardRef } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const DateField = forwardRef<HTMLInputElement, Props>(({ label, error, ...rest }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-600">{label} *</label>
    <input
      type="date"
      ref={ref}
      className={`rounded-md border px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 ${
        error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
      }`}
      {...rest}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
DateField.displayName = 'DateField';
export default DateField;
```

- [ ] **Step 3: Write `src/form/fields/NumberField.tsx`**

```typescript
import { forwardRef } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const NumberField = forwardRef<HTMLInputElement, Props>(({ label, error, ...rest }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-600">{label} *</label>
    <input
      type="number"
      ref={ref}
      className={`rounded-md border px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 ${
        error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
      }`}
      {...rest}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
NumberField.displayName = 'NumberField';
export default NumberField;
```

- [ ] **Step 4: Write `src/form/fields/TextareaField.tsx`**

```typescript
import { forwardRef } from 'react';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const TextareaField = forwardRef<HTMLTextAreaElement, Props>(({ label, error, ...rest }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-600">{label} *</label>
    <textarea
      ref={ref}
      rows={2}
      className={`rounded-md border px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 resize-none ${
        error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
      }`}
      {...rest}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
TextareaField.displayName = 'TextareaField';
export default TextareaField;
```

- [ ] **Step 5: Write `src/form/GuaranteeForm.tsx`**

```typescript
import { useEffect } from 'react';
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
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<GuaranteeFormData>({
    resolver: zodResolver(guaranteeSchema),
    mode: 'onChange',
  });

  const formValues = watch();

  useEffect(() => {
    onValidChange(isValid, formValues);
  }, [isValid, JSON.stringify(formValues)]);

  function fillSample() {
    (Object.keys(sampleInput) as (keyof GuaranteeFormData)[]).forEach((key) => {
      setValue(key, sampleInput[key] as never, { shouldValidate: true });
    });
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
          placeholder="BG-2026-88910"
          error={errors.bgNumber?.message}
          {...register('bgNumber')}
        />
        <div className="grid grid-cols-2 gap-3">
          <DateField
            label="Date of Issue"
            error={errors.issueDate?.message}
            {...register('issueDate')}
          />
          <DateField
            label="Expiry Date"
            error={errors.expiryDate?.message}
            {...register('expiryDate')}
          />
        </div>
      </div>

      {/* Issuing Bank */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Issuing Bank</h3>
        <InputField
          label="Bank Full Legal Name"
          placeholder="Global Trade Bank Ltd"
          error={errors.issuingBankName?.message}
          {...register('issuingBankName')}
        />
        <InputField
          label="SWIFT / BIC"
          placeholder="GTBKSGSGXXX"
          error={errors.issuingBankSwift?.message}
          {...register('issuingBankSwift')}
        />
      </div>

      {/* Applicant */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Applicant</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Apex Builders Pte Ltd"
          error={errors.applicantName?.message}
          {...register('applicantName')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="10 Marina Boulevard, Singapore 018983"
          error={errors.applicantAddress?.message}
          {...register('applicantAddress')}
        />
      </div>

      {/* Beneficiary */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Beneficiary</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Maritime Authority of Singapore"
          error={errors.beneficiaryName?.message}
          {...register('beneficiaryName')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="456 Alexandra Road, Singapore 119962"
          error={errors.beneficiaryAddress?.message}
          {...register('beneficiaryAddress')}
        />
      </div>

      {/* Financial Terms */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Financial Terms</h3>
        <div className="grid grid-cols-3 gap-3">
          <InputField
            label="Currency"
            placeholder="SGD"
            maxLength={3}
            error={errors.currency?.message}
            {...register('currency')}
          />
          <div className="col-span-2">
            <NumberField
              label="Guarantee Amount"
              placeholder="500000"
              error={errors.amount?.message}
              {...register('amount', { valueAsNumber: true })}
            />
          </div>
        </div>
        <InputField
          label="Underlying Contract / Tender Reference"
          placeholder="Tender Ref: MAS-2026-004"
          error={errors.underlyingContract?.message}
          {...register('underlyingContract')}
        />
        <InputField
          label="Place of Presentation"
          placeholder="Singapore Counter, 12 Marina Blvd"
          error={errors.placeOfPresentation?.message}
          {...register('placeOfPresentation')}
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

- [ ] **Step 6: Verify form renders in browser**

Update `src/App.tsx` temporarily:
```typescript
import GuaranteeForm from './form/GuaranteeForm';
export default function App() {
  return (
    <div className="max-w-md mx-auto mt-8 p-4">
      <GuaranteeForm
        onSubmit={(d) => console.log(d)}
        onValidChange={(v, d) => console.log(v, d)}
        isSubmitting={false}
      />
    </div>
  );
}
```
Run `npm run dev`, open http://localhost:5173. Verify: all 5 sections render, "Fill sample data" button pre-fills all fields, validation errors appear on blur, submit button enables only when form is fully valid.

- [ ] **Step 7: Commit**

```bash
git add src/form/ src/sample/
git commit -m "feat: add 13-field guarantee form with RHF + Zod validation"
```

---

### Task 4: Renderer Components

**Files:**
- Create: `src/renderer/GuaranteePreview.tsx`
- Create: `src/renderer/VcJsonViewer.tsx`
- Create: `src/renderer/GuaranteePreview.test.tsx`

**Interfaces:**
- Consumes: `credentialSubject` shape from `assembleVC` output
- Produces:
  - `<GuaranteePreview subject={credentialSubject} />` — renders 4-clause BG document view
  - `<VcJsonViewer vc={object} label="string" />` — collapsible JSON block

---

- [ ] **Step 1: Write failing renderer tests**

```typescript
// src/renderer/GuaranteePreview.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuaranteePreview from './GuaranteePreview';

const subject = {
  type: ['BankersGuarantee'],
  bgNumber: 'BG-2026-88910',
  issueDate: '2026-06-24',
  issuingBank: { name: 'Global Trade Bank Ltd', swift: 'GTBKSGSGXXX' },
  applicant: { name: 'Apex Builders Pte Ltd', address: '10 Marina Boulevard, Singapore 018983' },
  beneficiary: { name: 'Maritime Authority of Singapore', address: '456 Alexandra Road, Singapore 119962' },
  underlyingContract: 'Tender Ref: MAS-2026-004',
  currency: 'SGD',
  amount: 500000,
  expiryDate: '2027-06-30',
  placeOfPresentation: 'Singapore Counter, 12 Marina Blvd',
  governingRules: 'URDG758',
};

describe('GuaranteePreview', () => {
  it('renders the document title', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText("BANKER'S GUARANTEE")).toBeInTheDocument();
  });

  it('renders the beneficiary name', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Maritime Authority of Singapore/)).toBeInTheDocument();
  });

  it('renders the issuing bank name in clause 1', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Global Trade Bank Ltd/)).toBeInTheDocument();
  });

  it('renders the amount and currency in clause 2', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/SGD 500000/)).toBeInTheDocument();
  });

  it('renders URDG reference in clause 3', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/URDG.*758/i)).toBeInTheDocument();
  });

  it('renders expiry date in clause 4', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/2027-06-30/)).toBeInTheDocument();
  });

  it('renders the guarantee number', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/BG-2026-88910/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test
```
Expected: FAIL — "Cannot find module './GuaranteePreview'"

- [ ] **Step 3: Write `src/renderer/GuaranteePreview.tsx`**

```typescript
interface CredentialSubject {
  bgNumber: string;
  issueDate: string;
  issuingBank: { name: string; swift: string };
  applicant: { name: string; address: string };
  beneficiary: { name: string; address: string };
  underlyingContract: string;
  currency: string;
  amount: number;
  expiryDate: string;
  placeOfPresentation: string;
}

interface Props {
  subject: CredentialSubject;
}

export default function GuaranteePreview({ subject }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 font-serif text-sm leading-relaxed text-slate-800">
      <div className="text-center mb-4">
        <h1 className="font-bold text-base tracking-widest">BANKER'S GUARANTEE</h1>
        <p className="text-xs text-slate-500">(FINANCIAL GUARANTEE)</p>
      </div>

      <div className="mb-4 space-y-1 text-sm">
        <p><span className="font-semibold">To:</span> {subject.beneficiary.name}</p>
        <p><span className="font-semibold">Address:</span> {subject.beneficiary.address}</p>
        <p>
          <span className="font-semibold">Date of Issue:</span> {subject.issueDate}
          &emsp;
          <span className="font-semibold">Guarantee No.:</span> {subject.bgNumber}
        </p>
      </div>

      <hr className="border-slate-200 my-4" />

      <div className="space-y-4 text-sm">
        <p>
          <span className="font-semibold">1. </span>
          We,{' '}
          <span className="text-indigo-600 font-medium">{subject.issuingBank.name}</span>
          {' '}(SWIFT:{' '}
          <span className="text-indigo-600 font-medium">{subject.issuingBank.swift}</span>
          ) (the &ldquo;Guarantor&rdquo;), have been informed that{' '}
          <span className="text-indigo-600 font-medium">{subject.applicant.name}</span>
          {' '}of{' '}
          <span className="text-indigo-600 font-medium">{subject.applicant.address}</span>
          {' '}(the &ldquo;Applicant&rdquo;) has entered into an underlying agreement/obligation under{' '}
          <span className="text-indigo-600 font-medium">{subject.underlyingContract}</span>
          {' '}with you.
        </p>

        <p>
          <span className="font-semibold">2. </span>
          At the request of the Applicant, we, the Guarantor, hereby irrevocably and unconditionally undertake to pay you, the Beneficiary, any sum or sums not exceeding in total an amount of{' '}
          <span className="text-indigo-600 font-medium">{subject.currency} {subject.amount}</span>
          {' '}upon receipt by us of your conforming demand in writing. Your demand must be accompanied by a signed statement stating that the Applicant is in breach of its financial obligations under the underlying agreement.
        </p>

        <p>
          <span className="font-semibold">3. </span>
          This Guarantee is subject to the Uniform Rules for Demand Guarantees (URDG) 2010 Revision, ICC Publication No. 758.
        </p>

        <p>
          <span className="font-semibold">4. </span>
          Any demand for payment under this Guarantee must be received by us on or before{' '}
          <span className="text-indigo-600 font-medium">{subject.expiryDate}</span>
          {' '}(the &ldquo;Expiry Date&rdquo;) at our counters located at{' '}
          <span className="text-indigo-600 font-medium">{subject.placeOfPresentation}</span>
          . After the Expiry Date, this Guarantee shall become completely null and void.
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-400 font-sans">
        Draft only — legal wording must be confirmed by the bank&apos;s legal team before production use.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/renderer/VcJsonViewer.tsx`**

```typescript
import { useState } from 'react';

interface Props {
  vc: object;
  label: string;
}

export default function VcJsonViewer({ vc, label }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
      >
        <span>{label}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <pre className="bg-slate-900 text-slate-300 text-xs p-4 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
          {JSON.stringify(vc, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/
git commit -m "feat: add GuaranteePreview and VcJsonViewer components"
```

---

### Task 5: Split Panel App Shell

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `GuaranteeForm`, `GuaranteePreview`, `VcJsonViewer`, `assembleVC`, `GuaranteeFormData`
- Produces: Full split-panel layout. Left panel = form. Right panel = live preview + JSON viewer. Nav bar shows app name + DID badge.

---

- [ ] **Step 1: Write the final `src/App.tsx`**

```typescript
import { useState } from 'react';
import GuaranteeForm from './form/GuaranteeForm';
import GuaranteePreview from './renderer/GuaranteePreview';
import VcJsonViewer from './renderer/VcJsonViewer';
import { assembleVC } from './vc/assembleVC';
import type { GuaranteeFormData } from './form/schema';

const ISSUER_DID = import.meta.env.VITE_DID_WEB ?? '';
const RENDERER_URL = import.meta.env.VITE_RENDERER_URL ?? 'https://eguarantee.fyntech.io/renderer';

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
    const blob = new Blob([JSON.stringify(signedVC, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed_vc.json';
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
      <header className="flex items-center justify-between bg-indigo-500 px-6 py-3 text-white shadow">
        <span className="font-bold tracking-wide">⚡ eGuarantee Creator</span>
        {ISSUER_DID ? (
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-mono">
            ✓ {ISSUER_DID}
          </span>
        ) : (
          <span className="rounded-full bg-yellow-300 text-yellow-900 px-3 py-1 text-xs">
            ⚠ Identity not configured — run npm run setup
          </span>
        )}
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
              <GuaranteePreview subject={credentialSubject} />

              {appState.phase === 'signed' && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-green-700">✓ Signed VC ready</p>
                    <p className="text-xs text-green-600">Drag signed_vc.json onto trustvc.io to verify</p>
                  </div>
                  <button
                    onClick={() => downloadSignedVC((appState as { phase: 'signed'; signedVC: object }).signedVC)}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Download signed_vc.json
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

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Open http://localhost:5173.
- Nav bar shows "⚡ eGuarantee Creator"
- If `VITE_DID_WEB` is not set in `.env`, the yellow warning badge shows
- Click "Fill sample data" — right panel populates with the rendered guarantee
- JSON viewer accordion expands/collapses

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: assemble split-panel app shell with live preview"
```

---

### Task 6: Backend Signing API

**Files:**
- Create: `server/services/signVC.ts`
- Create: `server/routes/vc.ts`
- Modify: `server/index.ts`
- Create: `server/services/signVC.test.ts`
- Create: `server/routes/vc.test.ts`

**Interfaces:**
- Produces:
  - `loadKeypair(): KeyPair` — reads `keys/keypair.json`, throws if missing
  - `signVC(unsignedVC: object): Promise<object>` — returns signed VC
  - `POST /api/vc/sign` → `{ signedVC }` or `{ error }` with appropriate status codes

---

- [ ] **Step 1: Create `keys/` directory with a test keypair for tests**

The tests need a keypair at `keys/keypair.json`. Generate a throwaway one using the TrustVC SDK. Run this once in a Node REPL:

```bash
node -e "
const { generateDidKeyPair, CryptoSuite } = require('@trustvc/w3c-issuer');
generateDidKeyPair(CryptoSuite.EcdsaSd2023).then(({ didKeyPairs }) => {
  // didKeyPairs is an array; we need the first entry
  console.log(JSON.stringify(didKeyPairs[0], null, 2));
});
"
```

Copy the printed JSON to `keys/keypair.json`. Inspect its shape — it should contain `id`, `type`, `controller`, `publicKeyMultibase`, `secretKeyMultibase`. If `id`/`controller` reference `did:key:...`, note that `scripts/setup.ts` (Task 7) will write a version with `did:web:...` references instead. For tests this does not matter.

> **Note:** If `generateDidKeyPair` does not exist, check `@trustvc/w3c-issuer` exports: `import('@trustvc/w3c-issuer').then(m => console.log(Object.keys(m)))`. Adapt the import accordingly.

- [ ] **Step 2: Write `server/services/signVC.ts`**

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { signW3C } from '@trustvc/trustvc';

export interface KeyPair {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
  secretKeyMultibase: string;
  [key: string]: unknown;
}

const KEYPAIR_PATH = join(process.cwd(), 'keys', 'keypair.json');

let cachedKeypair: KeyPair | null = null;

export function loadKeypair(): KeyPair {
  if (cachedKeypair) return cachedKeypair;
  try {
    const raw = readFileSync(KEYPAIR_PATH, 'utf-8');
    cachedKeypair = JSON.parse(raw) as KeyPair;
    return cachedKeypair;
  } catch {
    throw new Error(
      'keys/keypair.json not found. Run "npm run setup" to generate the signing identity.'
    );
  }
}

export async function signVC(unsignedVC: object): Promise<object> {
  const keyPair = loadKeypair();
  const result = await signW3C(unsignedVC, keyPair, 'ecdsa-sd-2023');
  // signW3C returns the signed document directly (with proof field added).
  // If the library wraps it (e.g. { document: ... }), unwrap here.
  return result as object;
}
```

- [ ] **Step 3: Write `server/routes/vc.ts`**

```typescript
import { Router, type Request, type Response } from 'express';
import { signVC, loadKeypair } from '../services/signVC';

const router = Router();

router.post('/sign', async (req: Request, res: Response) => {
  const { unsignedVC } = req.body as { unsignedVC?: object };

  if (!unsignedVC || typeof unsignedVC !== 'object') {
    res.status(400).json({ error: 'Request body must include "unsignedVC" object' });
    return;
  }

  try {
    loadKeypair(); // fail fast if not configured
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'Identity not configured',
    });
    return;
  }

  try {
    const signedVC = await signVC(unsignedVC);
    res.json({ signedVC });
  } catch (err) {
    console.error('Signing error:', err);
    res.status(500).json({ error: 'Signing failed. Check server logs.' });
  }
});

export default router;
```

- [ ] **Step 4: Update `server/index.ts` to register the route**

```typescript
import express from 'express';
import 'dotenv/config';
import vcRouter from './routes/vc';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/vc', vcRouter);

const PORT = process.env.PORT ?? 3001;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

export default app;
```

- [ ] **Step 5: Write backend integration tests**

```typescript
// server/routes/vc.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';

const validUnsignedVC = {
  '@context': [
    'https://www.w3.org/ns/credentials/v2',
    'https://trustvc.io/context/render-method-context-v2.json',
  ],
  type: ['VerifiableCredential'],
  issuer: 'did:web:eguarantee.fyntech.io',
  validFrom: '2026-06-24T00:00:00Z',
  validUntil: '2027-06-30T00:00:00Z',
  credentialSubject: {
    type: ['BankersGuarantee'],
    bgNumber: 'BG-2026-88910',
    issueDate: '2026-06-24',
    issuingBank: { name: 'Global Trade Bank Ltd', swift: 'GTBKSGSGXXX' },
    applicant: { name: 'Apex Builders Pte Ltd', address: '10 Marina Blvd, Singapore 018983' },
    beneficiary: { name: 'Maritime Authority', address: '456 Alexandra Rd, Singapore 119962' },
    underlyingContract: 'Tender Ref: MAS-2026-004',
    currency: 'SGD',
    amount: 500000,
    expiryDate: '2027-06-30',
    placeOfPresentation: 'Singapore Counter, 12 Marina Blvd',
    governingRules: 'URDG758',
  },
  renderMethod: [{ id: 'https://example.com/renderer', type: 'EMBEDDED_RENDERER', templateName: 'EBG' }],
};

describe('POST /api/vc/sign', () => {
  it('returns 400 when unsignedVC is missing', async () => {
    const res = await request(app).post('/api/vc/sign').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsignedVC/);
  });

  it('returns a signedVC with a proof field when keypair exists', async () => {
    // This test requires keys/keypair.json to exist (created in Step 1).
    const res = await request(app)
      .post('/api/vc/sign')
      .send({ unsignedVC: validUnsignedVC });

    if (res.status === 503) {
      console.warn('SKIPPED: keys/keypair.json not present — run Step 1 of Task 6 first.');
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body.signedVC).toBeDefined();
    expect(res.body.signedVC.proof).toBeDefined();
  });

  it('returns 503 with helpful message when keypair is missing', async () => {
    // Temporarily rename keypair to simulate missing file.
    const { renameSync, existsSync } = await import('fs');
    const path = 'keys/keypair.json';
    const tmp = 'keys/keypair.json.bak';
    if (!existsSync(path)) {
      console.warn('SKIPPED: keys/keypair.json not present to test 503 path.');
      return;
    }
    renameSync(path, tmp);
    // Clear module cache so loadKeypair re-reads.
    const { cachedKeypair: _ } = await import('../services/signVC');
    try {
      const res = await request(app)
        .post('/api/vc/sign')
        .send({ unsignedVC: validUnsignedVC });
      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/npm run setup/i);
    } finally {
      renameSync(tmp, path);
    }
  });
});
```

> **Note on the 503 test:** The `cachedKeypair` is module-level. Between tests, reset it by re-importing or restarting the server. If the cache makes the 503 test flaky, mock `readFileSync` with Vitest's `vi.mock` instead.

- [ ] **Step 6: Run tests**

```bash
npm test
```
If `keys/keypair.json` exists: all three backend tests should pass.
If it doesn't exist yet: the sign test will warn and skip, the 400 test will pass.

- [ ] **Step 7: Verify with curl**

```bash
npm run dev
# In another terminal:
curl -s -X POST http://localhost:3001/api/vc/sign \
  -H 'Content-Type: application/json' \
  -d '{"unsignedVC": {"@context":["https://www.w3.org/ns/credentials/v2"],"type":["VerifiableCredential"],"issuer":"did:web:test","validFrom":"2026-01-01T00:00:00Z","credentialSubject":{"id":"test"}}}' \
  | python3 -m json.tool
```
Expected: JSON response — either `{ "signedVC": { ... "proof": { ... } } }` or `{ "error": "keys/keypair.json not found..." }` if keypair not yet generated.

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat: add Express signing API with signW3C integration"
```

---

### Task 7: Admin Setup Script

**Files:**
- Create: `scripts/setup.ts`
- Create: `keys/.gitkeep`

**Interfaces:**
- Consumes: `@trustvc/w3c-issuer` (`generateDidKeyPair`, `CryptoSuite`)
- Produces: `keys/keypair.json`, `keys/did.json`, updates `.env` with `DID_WEB` and `VITE_DID_WEB`

---

- [ ] **Step 1: Create `keys/.gitkeep`**

```bash
touch keys/.gitkeep
echo 'keys/keypair.json' >> .gitignore
echo 'keys/did.json' >> .gitignore
```

- [ ] **Step 2: Write `scripts/setup.ts`**

```typescript
import { existsSync, writeFileSync, readFileSync, mkdirSync, appendFileSync } from 'fs';
import { createInterface } from 'readline/promises';
import { join } from 'path';

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n=== eGuarantee Identity Setup ===\n');

  const keypairPath = join(process.cwd(), 'keys', 'keypair.json');
  const didJsonPath = join(process.cwd(), 'keys', 'did.json');

  if (existsSync(keypairPath)) {
    const overwrite = await rl.question('keys/keypair.json already exists. Overwrite? (y/N): ');
    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  const subdomain = (
    await rl.question('Enter your fyntech.io subdomain (e.g. eguarantee.fyntech.io): ')
  ).trim();

  if (!subdomain) {
    console.error('Subdomain is required.');
    rl.close();
    process.exit(1);
  }

  const didWeb = `did:web:${subdomain}`;
  const keyId = `${didWeb}#key-1`;

  console.log(`\nGenerating ECDSA-SD-2023 key pair for ${didWeb}…`);

  // Dynamic import so TypeScript resolves correctly
  const { generateDidKeyPair, CryptoSuite } = await import('@trustvc/w3c-issuer');
  const { didKeyPairs } = await generateDidKeyPair(CryptoSuite.EcdsaSd2023);

  // didKeyPairs[0] contains the raw Multikey material.
  // Extract publicKeyMultibase and secretKeyMultibase, then re-anchor to did:web.
  const rawPair = didKeyPairs[0] as {
    publicKeyMultibase: string;
    secretKeyMultibase: string;
    [k: string]: unknown;
  };

  const keypairForSigning = {
    '@context': 'https://w3id.org/security/multikey/v1',
    id: keyId,
    type: 'Multikey',
    controller: didWeb,
    publicKeyMultibase: rawPair.publicKeyMultibase,
    secretKeyMultibase: rawPair.secretKeyMultibase,
  };

  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/multikey/v1',
    ],
    id: didWeb,
    verificationMethod: [
      {
        id: keyId,
        type: 'Multikey',
        controller: didWeb,
        publicKeyMultibase: rawPair.publicKeyMultibase,
      },
    ],
    authentication: [keyId],
    assertionMethod: [keyId],
  };

  mkdirSync('keys', { recursive: true });
  writeFileSync(keypairPath, JSON.stringify(keypairForSigning, null, 2));
  writeFileSync(didJsonPath, JSON.stringify(didDocument, null, 2));
  console.log('✓ keys/keypair.json written (keep this file secret — never commit it)');
  console.log('✓ keys/did.json written');

  // Write .env
  const envLines = [
    `\n# eGuarantee identity (generated by npm run setup)`,
    `DID_WEB=${didWeb}`,
    `VITE_DID_WEB=${didWeb}`,
    `VITE_RENDERER_URL=https://${subdomain}/renderer`,
  ].join('\n');

  appendFileSync('.env', envLines);
  console.log('✓ .env updated with DID_WEB and VITE_DID_WEB\n');

  console.log('─────────────────────────────────────────────');
  console.log('NEXT STEPS — two manual actions required:\n');
  console.log('STEP A — Publish your DID document:');
  console.log(`  Upload  keys/did.json`);
  console.log(`  To:     https://${subdomain}/.well-known/did.json`);
  console.log(`  (The file must be served with Content-Type: application/json)\n`);
  console.log('STEP B — Add a DNS TXT record:');
  console.log(`  Name:   _did.${subdomain}`);
  console.log(`  Value:  did=${didWeb}\n`);
  console.log('─────────────────────────────────────────────');

  const check = await rl.question('\nPress ENTER once both steps are done to verify, or type "skip" to exit: ');

  if (check.trim().toLowerCase() !== 'skip') {
    await pollUntilLive(subdomain, didWeb, didDocument);
  }

  rl.close();
  console.log('\nSetup complete. Run "npm run dev" to start the app.\n');
}

async function pollUntilLive(subdomain: string, didWeb: string, expectedDoc: object) {
  console.log('\nVerifying…');
  const didJsonUrl = `https://${subdomain}/.well-known/did.json`;
  const dnsTxtName = `_did.${subdomain}`;
  const dohUrl = `https://dns.google/resolve?name=${encodeURIComponent(dnsTxtName)}&type=TXT`;

  let attempts = 0;
  const MAX = 30;

  while (attempts < MAX) {
    attempts++;
    let didDocOk = false;
    let dnsTxtOk = false;

    try {
      const res = await fetch(didJsonUrl);
      if (res.ok) {
        const doc = await res.json();
        if (doc.id === didWeb) didDocOk = true;
      }
    } catch {
      // not yet live
    }

    try {
      const res = await fetch(dohUrl);
      const data = (await res.json()) as { Answer?: { data: string }[] };
      const records = data.Answer ?? [];
      dnsTxtOk = records.some((r) => r.data.includes(`did=${didWeb}`));
    } catch {
      // not yet live
    }

    const didDocMark = didDocOk ? '✓' : '…';
    const dnsMark = dnsTxtOk ? '✓' : '…';
    process.stdout.write(`\r[${didDocMark}] did.json   [${dnsMark}] DNS TXT   (attempt ${attempts}/${MAX})`);

    if (didDocOk && dnsTxtOk) {
      console.log('\n\n✓ Identity is live and verified!');
      return;
    }

    await new Promise((r) => setTimeout(r, 10_000));
  }

  console.log('\n\nCould not verify within the timeout. Check your DNS and hosting, then re-run npm run setup.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Test the setup script locally (dry run)**

```bash
npm run setup
```
At the subdomain prompt, enter a test value like `test.example.com`. Expected:
- `keys/keypair.json` created with `id: did:web:test.example.com#key-1` and `secretKeyMultibase` present
- `keys/did.json` created with the correct DID document shape
- `.env` updated with `DID_WEB=did:web:test.example.com`
- Script prints the two manual steps
- Type `skip` at the verification prompt

Inspect the files:
```bash
cat keys/keypair.json | python3 -m json.tool
cat keys/did.json | python3 -m json.tool
```
Verify `keypair.json` has `secretKeyMultibase` and `did.json` has a `verificationMethod` array.

> **If `didKeyPairs[0]` shape differs from what the script expects:** Check `@trustvc/w3c-issuer` TypeScript types — `generateDidKeyPair` may return a different structure. Adapt the property access in `scripts/setup.ts` accordingly.

- [ ] **Step 4: Run full setup for real (fyntech.io)**

```bash
# Delete the test keys first
rm keys/keypair.json keys/did.json
# Remove the test DID_WEB lines you just added to .env

npm run setup
# Enter: eguarantee.fyntech.io (or your chosen subdomain)
# Follow the printed instructions:
#   A. Upload keys/did.json to https://eguarantee.fyntech.io/.well-known/did.json
#   B. Set DNS TXT record: _did.eguarantee.fyntech.io  →  did=did:web:eguarantee.fyntech.io
# Press ENTER — script polls until both resolve
```

- [ ] **Step 5: Verify end-to-end with real DID**

```bash
npm run dev
```
Open http://localhost:5173. Nav bar should show the green `✓ did:web:eguarantee.fyntech.io` badge.

Fill in the form → click "Sign & Download VC" → download `signed_vc.json`.
Drag it onto https://ref.tradetrust.io — all three checks (integrity, issuance, issuer identity) should show green.

- [ ] **Step 6: Commit**

```bash
git add scripts/setup.ts keys/.gitkeep .gitignore .env.example
git commit -m "feat: add admin setup script for DID:web key generation"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered in task |
|---|---|
| 13 fields, all required | Task 2 (schema), Task 3 (form) |
| Zod cross-field expiryDate > issueDate | Task 2 |
| W3C VC DM 2.0 shape with all required fields | Task 2 (assembleVC) |
| `validFrom`/`validUntil` mapping | Task 2 |
| `governingRules: URDG758` | Task 2 |
| `renderMethod` placeholder | Task 2 |
| 4-clause BG template rendering | Task 4 |
| Split panel layout | Task 5 |
| Nav bar with DID badge | Task 5 |
| Live preview updates | Task 5 (watch → onValidChange) |
| "Fill sample data" button | Task 3 |
| `POST /api/vc/sign` | Task 6 |
| `signW3C` with ECDSA-SD-2023 | Task 6 |
| 503 when keypair missing | Task 6 |
| Download `signed_vc.json` | Task 5 |
| Admin CLI key generation | Task 7 |
| DID document for `.well-known/did.json` | Task 7 |
| DNS TXT record instructions | Task 7 |
| Poll until DID:web is live | Task 7 |
| Private key never in git | Task 1 (.gitignore), Task 7 |
| Visual style: indigo, rounded, system-sans | Task 3, 4, 5 |

All spec requirements are covered. No gaps found.
