# Excel Upload Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Excel-upload entry path to eguarantee-demo so bank users can fill a `.xlsx` template and upload it instead of using the web form; both paths share the same signing server and YORK renderer.

**Architecture:** SheetJS parses the uploaded `.xlsx` client-side using named ranges; `mapToSchema` normalises raw cell values into `GuaranteeFormData`; the existing zod schema validates; the existing `handleSubmit` / `assembleVC` / `/api/vc/sign` pipeline is reused unchanged. A new landing page lets users choose between the two entry modes.

**Tech Stack:** React 19, TypeScript 6, Vite 6, Tailwind 4, Vitest 3, zod 4, SheetJS (`xlsx`), existing Node/Express signing server.

## Global Constraints

- Repo: `pohhendry/eguarantee-demo`, branch `feature/eguarantee-build`
- **Zero changes** to `server/`, `src/form/schema.ts`, `src/form/GuaranteeForm.tsx`, `src/renderer/`, `src/vc/assembleVC.ts`
- All new source files live under `src/excel/` or `src/steps/` or `src/` root
- Excel template served as static asset from `public/guarantee-template.xlsx`
- Named ranges in the template are the parse contract — never read by row position
- Test runner: `npm test` (vitest)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `xlsx` dependency |
| `public/guarantee-template.xlsx` | Create | Static download served by Vite |
| `src/excel/parseExcel.ts` | Create | SheetJS → raw named-range values |
| `src/excel/parseExcel.test.ts` | Create | Unit tests for parseExcel |
| `src/excel/mapToSchema.ts` | Create | Raw values → `GuaranteeFormData` shape |
| `src/excel/mapToSchema.test.ts` | Create | Unit tests for mapToSchema |
| `src/steps/ExcelUpload.tsx` | Create | File drop, validation errors, proceed button |
| `src/steps/ExcelUpload.test.tsx` | Create | Component tests for ExcelUpload |
| `src/LandingPage.tsx` | Create | Two-card mode selector |
| `src/LandingPage.test.tsx` | Create | Component tests for LandingPage |
| `src/App.tsx` | Modify | Add mode state, render landing or split panel |

---

## Task 1: Install SheetJS and add template file

**Files:**
- Modify: `package.json`
- Create: `public/guarantee-template.xlsx` (copy from `~/Desktop/guarantee-template.xlsx`)

**Interfaces:**
- Produces: `xlsx` importable as `import * as XLSX from 'xlsx'` in subsequent tasks

- [ ] **Step 1: Install SheetJS**

```bash
npm install xlsx
```

Expected output: `added 1 package` (xlsx adds no transitive deps)

- [ ] **Step 2: Copy template into public/**

```bash
cp ~/Desktop/guarantee-template.xlsx public/guarantee-template.xlsx
```

- [ ] **Step 3: Verify template is served**

```bash
npm run dev
# In a second terminal:
curl -I http://localhost:5173/guarantee-template.xlsx
```

Expected: `HTTP/1.1 200 OK` with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json public/guarantee-template.xlsx
git commit -m "feat: add SheetJS dependency and Excel template static asset"
```

---

## Task 2: parseExcel.ts — read .xlsx by named ranges

**Files:**
- Create: `src/excel/parseExcel.ts`
- Create: `src/excel/parseExcel.test.ts`

**Interfaces:**
- Consumes: `xlsx` package
- Produces:
  ```typescript
  export const FIELD_NAMES: readonly string[]  // all 18 named range keys
  export type RawFields = Record<typeof FIELD_NAMES[number], unknown>
  export async function parseExcel(file: File): Promise<RawFields>
  // throws Error with message listing missing named ranges, or 'Failed to read file'
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/excel/parseExcel.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcel, FIELD_NAMES } from './parseExcel';

// Builds an in-memory .xlsx File with named ranges pointing to column A cells
function makeFile(values: Record<string, unknown>, omit: string[] = []): File {
  const wb: XLSX.WorkBook = {
    SheetNames: ['Guarantee Data'],
    Sheets: {},
    Workbook: { Names: [], WBProps: {} as XLSX.WBProps },
  };

  const entries = Object.entries(values).filter(([k]) => !omit.includes(k));
  const ws: XLSX.WorkSheet = { '!ref': `A1:A${entries.length}` };
  entries.forEach(([, v], i) => {
    ws[`A${i + 1}`] = { v, t: typeof v === 'number' ? 'n' : 's' };
  });
  wb.Sheets['Guarantee Data'] = ws;

  entries.forEach(([name], i) => {
    wb.Workbook!.Names!.push({ Name: name, Ref: `'Guarantee Data'!$A$${i + 1}` });
  });

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  return new File([buf], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

const SAMPLE: Record<string, unknown> = {
  guaranteeNumber: 'BG-TEST-001',
  issuanceDate: '2026-07-07',
  agreementDate: '2026-06-01',
  effectiveDate: '2026-07-07',
  expiryDate: '2027-07-06',
  applicantName: 'York Construction Pte. Ltd.',
  applicantAddress: '100 York Road, Singapore 123456',
  beneficiaryName: 'Ministry of Development',
  beneficiaryAddress: '5 Maxwell Road, Singapore 069110',
  bankName: 'United Overseas Bank Limited',
  bankRegistrationNumber: '193500026Z',
  bankAddress: '80 Raffles Place, UOB Plaza, Singapore 048624',
  contractNature: 'construction of a residential complex',
  guaranteedSumCurrency: 'SGD',
  guaranteedSumFigures: 750000,
  guaranteedSumWords: 'Seven Hundred and Fifty Thousand Dollars only',
  signatoryName: 'Tan Wei Liang',
  signatoryTitle: 'Vice President, Trade Finance',
};

describe('parseExcel', () => {
  it('returns all 18 named range values from a valid file', async () => {
    const result = await parseExcel(makeFile(SAMPLE));
    expect(result.guaranteeNumber).toBe('BG-TEST-001');
    expect(result.guaranteedSumFigures).toBe(750000);
    expect(result.issuanceDate).toBe('2026-07-07');
  });

  it('returns all FIELD_NAMES keys', async () => {
    const result = await parseExcel(makeFile(SAMPLE));
    for (const name of FIELD_NAMES) {
      expect(result).toHaveProperty(name);
    }
  });

  it('throws when a named range is missing', async () => {
    const file = makeFile(SAMPLE, ['guaranteeNumber']);
    await expect(parseExcel(file)).rejects.toThrow('guaranteeNumber');
  });

  it('rejects a non-xlsx file', async () => {
    const file = new File(['not xlsx'], 'test.csv', { type: 'text/csv' });
    await expect(parseExcel(file)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/excel/parseExcel.test.ts
```

Expected: `FAIL` — `parseExcel` not found

- [ ] **Step 3: Implement parseExcel.ts**

Create `src/excel/parseExcel.ts`:

```typescript
import * as XLSX from 'xlsx';

export const FIELD_NAMES = [
  'guaranteeNumber',
  'issuanceDate',
  'agreementDate',
  'effectiveDate',
  'expiryDate',
  'applicantName',
  'applicantAddress',
  'beneficiaryName',
  'beneficiaryAddress',
  'bankName',
  'bankRegistrationNumber',
  'bankAddress',
  'contractNature',
  'guaranteedSumCurrency',
  'guaranteedSumFigures',
  'guaranteedSumWords',
  'signatoryName',
  'signatoryTitle',
] as const;

export type RawFields = Record<typeof FIELD_NAMES[number], unknown>;

export async function parseExcel(file: File): Promise<RawFields> {
  const buf = await file.arrayBuffer();
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  } catch {
    throw new Error('Failed to read file — make sure it is a valid .xlsx file.');
  }

  const names = wb.Workbook?.Names ?? [];
  const missing: string[] = [];
  const raw = {} as RawFields;

  for (const fieldName of FIELD_NAMES) {
    const def = names.find((n) => n.Name === fieldName);
    if (!def) {
      missing.push(fieldName);
      continue;
    }

    // Ref format: "'Sheet Name'!$B$5" or "Sheet!$B$5"
    const excl = def.Ref.lastIndexOf('!');
    const sheetName = def.Ref.slice(0, excl).replace(/^'|'$/g, '');
    const cellAddr = def.Ref.slice(excl + 1).replace(/\$/g, '');

    const sheet = wb.Sheets[sheetName];
    const cell = sheet?.[cellAddr];
    raw[fieldName] = cell?.v ?? '';
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing named ranges in workbook: ${missing.join(', ')}. ` +
        'Make sure you are using the provided template without renaming cells.',
    );
  }

  return raw;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/excel/parseExcel.test.ts
```

Expected: `PASS` — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/excel/parseExcel.ts src/excel/parseExcel.test.ts
git commit -m "feat: add parseExcel — reads .xlsx by named ranges"
```

---

## Task 3: mapToSchema.ts — normalise raw values to GuaranteeFormData

**Files:**
- Create: `src/excel/mapToSchema.ts`
- Create: `src/excel/mapToSchema.test.ts`

**Interfaces:**
- Consumes: `RawFields` from `./parseExcel`
- Consumes: `GuaranteeFormData` type from `../form/schema`
- Produces:
  ```typescript
  export function mapToSchema(raw: RawFields): GuaranteeFormData
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/excel/mapToSchema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mapToSchema } from './mapToSchema';
import type { RawFields } from './parseExcel';

const BASE: RawFields = {
  guaranteeNumber: 'BG-TEST-001',
  issuanceDate: '2026-07-07',
  agreementDate: '2026-06-01',
  effectiveDate: '2026-07-07',
  expiryDate: '2027-07-06',
  applicantName: 'York Construction Pte. Ltd.',
  applicantAddress: '100 York Road, Singapore 123456',
  beneficiaryName: 'Ministry of Development',
  beneficiaryAddress: '5 Maxwell Road, Singapore 069110',
  bankName: 'United Overseas Bank Limited',
  bankRegistrationNumber: '193500026Z',
  bankAddress: '80 Raffles Place, UOB Plaza, Singapore 048624',
  contractNature: 'construction of a residential complex',
  guaranteedSumCurrency: 'SGD',
  guaranteedSumFigures: 750000,
  guaranteedSumWords: 'Seven Hundred and Fifty Thousand Dollars only',
  signatoryName: 'Tan Wei Liang',
  signatoryTitle: 'Vice President, Trade Finance',
};

describe('mapToSchema', () => {
  it('maps flat raw fields to nested GuaranteeFormData shape', () => {
    const result = mapToSchema(BASE);
    expect(result.guaranteeNumber).toBe('BG-TEST-001');
    expect(result.applicant.name).toBe('York Construction Pte. Ltd.');
    expect(result.applicant.address).toBe('100 York Road, Singapore 123456');
    expect(result.bank.registrationNumber).toBe('193500026Z');
    expect(result.guaranteedSum.figures).toBe(750000);
    expect(result.signatory.title).toBe('Vice President, Trade Finance');
  });

  it('trims whitespace from string values', () => {
    const result = mapToSchema({ ...BASE, guaranteeNumber: '  BG-TEST-001  ' });
    expect(result.guaranteeNumber).toBe('BG-TEST-001');
  });

  it('converts a JS Date object to YYYY-MM-DD string', () => {
    const d = new Date('2026-07-07T00:00:00Z');
    const result = mapToSchema({ ...BASE, issuanceDate: d });
    expect(result.issuanceDate).toBe('2026-07-07');
  });

  it('coerces a numeric string to number for figures', () => {
    const result = mapToSchema({ ...BASE, guaranteedSumFigures: '750000' });
    expect(result.guaranteedSum.figures).toBe(750000);
  });

  it('strips commas from figures string', () => {
    const result = mapToSchema({ ...BASE, guaranteedSumFigures: '750,000' });
    expect(result.guaranteedSum.figures).toBe(750000);
  });

  it('returns 0 for unparseable figures', () => {
    const result = mapToSchema({ ...BASE, guaranteedSumFigures: 'abc' });
    expect(result.guaranteedSum.figures).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/excel/mapToSchema.test.ts
```

Expected: `FAIL` — `mapToSchema` not found

- [ ] **Step 3: Implement mapToSchema.ts**

Create `src/excel/mapToSchema.ts`:

```typescript
import type { GuaranteeFormData } from '../form/schema';
import type { RawFields } from './parseExcel';

function toStr(v: unknown): string {
  return String(v ?? '').trim();
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) {
    // format as YYYY-MM-DD in UTC to avoid timezone shifts
    return v.toISOString().slice(0, 10);
  }
  return toStr(v);
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

export function mapToSchema(raw: RawFields): GuaranteeFormData {
  return {
    guaranteeNumber: toStr(raw.guaranteeNumber),
    issuanceDate: toDateStr(raw.issuanceDate),
    agreementDate: toDateStr(raw.agreementDate),
    effectiveDate: toDateStr(raw.effectiveDate),
    expiryDate: toDateStr(raw.expiryDate),
    applicant: {
      name: toStr(raw.applicantName),
      address: toStr(raw.applicantAddress),
    },
    beneficiary: {
      name: toStr(raw.beneficiaryName),
      address: toStr(raw.beneficiaryAddress),
    },
    bank: {
      name: toStr(raw.bankName),
      registrationNumber: toStr(raw.bankRegistrationNumber),
      address: toStr(raw.bankAddress),
    },
    contractNature: toStr(raw.contractNature),
    guaranteedSum: {
      currency: toStr(raw.guaranteedSumCurrency),
      figures: toNumber(raw.guaranteedSumFigures),
      words: toStr(raw.guaranteedSumWords),
    },
    signatory: {
      name: toStr(raw.signatoryName),
      title: toStr(raw.signatoryTitle),
    },
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/excel/mapToSchema.test.ts
```

Expected: `PASS` — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/excel/mapToSchema.ts src/excel/mapToSchema.test.ts
git commit -m "feat: add mapToSchema — normalises raw Excel values to GuaranteeFormData"
```

---

## Task 4: ExcelUpload.tsx — file picker, validation, proceed

**Files:**
- Create: `src/steps/ExcelUpload.tsx`
- Create: `src/steps/ExcelUpload.test.tsx`

**Interfaces:**
- Consumes:
  - `parseExcel(file: File): Promise<RawFields>` from `../excel/parseExcel`
  - `mapToSchema(raw: RawFields): GuaranteeFormData` from `../excel/mapToSchema`
  - `guaranteeSchema` from `../form/schema`
- Produces component with props:
  ```typescript
  interface Props {
    onSubmit: (data: GuaranteeFormData) => void;
    onValidChange: (isValid: boolean, data: GuaranteeFormData) => void;
    isSubmitting: boolean;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/steps/ExcelUpload.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExcelUpload from './ExcelUpload';
import * as parseExcelModule from '../excel/parseExcel';
import * as mapToSchemaModule from '../excel/mapToSchema';

const VALID_DATA = {
  guaranteeNumber: 'BG-TEST-001',
  issuanceDate: '2026-07-07',
  agreementDate: '2026-06-01',
  effectiveDate: '2026-07-07',
  expiryDate: '2027-07-06',
  applicant: { name: 'York Construction Pte. Ltd.', address: '100 York Road, Singapore 123456' },
  beneficiary: { name: 'Ministry of Development', address: '5 Maxwell Road, Singapore 069110' },
  bank: { name: 'United Overseas Bank Limited', registrationNumber: '193500026Z', address: '80 Raffles Place, UOB Plaza, Singapore 048624' },
  contractNature: 'construction of a residential complex',
  guaranteedSum: { currency: 'SGD', figures: 750000, words: 'Seven Hundred and Fifty Thousand Dollars only' },
  signatory: { name: 'Tan Wei Liang', title: 'Vice President, Trade Finance' },
};

function makeXlsxFile(name = 'test.xlsx'): File {
  return new File(['dummy'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('ExcelUpload', () => {
  const onSubmit = vi.fn();
  const onValidChange = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onSubmit.mockClear();
    onValidChange.mockClear();
  });

  it('renders template download link and drop zone', () => {
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    expect(screen.getByText(/download excel template/i)).toBeInTheDocument();
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  it('shows error when a non-.xlsx file is uploaded', async () => {
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'data.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText(/must be a .xlsx/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument();
  });

  it('shows error when file exceeds 1 MB', async () => {
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const big = new File([new ArrayBuffer(1_100_000)], 'big.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [big] } });
    await waitFor(() => expect(screen.getByText(/under 1 mb/i)).toBeInTheDocument());
  });

  it('shows zod errors when parsed data is invalid', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue({
      ...VALID_DATA,
      guaranteeNumber: '',  // triggers zod error
    });
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    await waitFor(() => expect(screen.getByText(/guaranteeNumber/i)).toBeInTheDocument());
  });

  it('shows proceed button and calls onValidChange when file is valid', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue(VALID_DATA);
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /generate & sign/i })).toBeInTheDocument());
    expect(onValidChange).toHaveBeenCalledWith(true, VALID_DATA);
  });

  it('calls onSubmit when proceed button is clicked', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue(VALID_DATA);
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    const btn = await screen.findByRole('button', { name: /generate & sign/i });
    fireEvent.click(btn);
    expect(onSubmit).toHaveBeenCalledWith(VALID_DATA);
  });

  it('disables proceed button while submitting', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue(VALID_DATA);
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={true} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    const btn = await screen.findByRole('button', { name: /signing/i });
    expect(btn).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/steps/ExcelUpload.test.tsx
```

Expected: `FAIL` — `ExcelUpload` not found

- [ ] **Step 3: Implement ExcelUpload.tsx**

Create `src/steps/ExcelUpload.tsx`:

```tsx
import { useState, useCallback } from 'react';
import type { GuaranteeFormData } from '../form/schema';
import { guaranteeSchema } from '../form/schema';
import { parseExcel } from '../excel/parseExcel';
import { mapToSchema } from '../excel/mapToSchema';

interface Props {
  onSubmit: (data: GuaranteeFormData) => void;
  onValidChange: (isValid: boolean, data: GuaranteeFormData) => void;
  isSubmitting: boolean;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'error'; errors: string[] }
  | { status: 'valid'; data: GuaranteeFormData };

export default function ExcelUpload({ onSubmit, onValidChange, isSubmitting }: Props) {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [fileName, setFileName] = useState<string | null>(null);

  async function processFile(file: File) {
    setState({ status: 'idle' });

    if (!file.name.endsWith('.xlsx')) {
      setState({ status: 'error', errors: ['File must be a .xlsx file.'] });
      return;
    }
    if (file.size > 1_048_576) {
      setState({ status: 'error', errors: ['File must be under 1 MB.'] });
      return;
    }

    setFileName(file.name);

    try {
      const raw = await parseExcel(file);
      const mapped = mapToSchema(raw);
      const result = guaranteeSchema.safeParse(mapped);

      if (!result.success) {
        const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        setState({ status: 'error', errors });
        return;
      }

      setState({ status: 'valid', data: result.data });
      onValidChange(true, result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file.';
      setState({ status: 'error', errors: [msg] });
    }
  }

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <a
        href="/guarantee-template.xlsx"
        download
        className="self-start text-xs text-indigo-600 underline hover:text-indigo-800"
      >
        ↓ Download Excel template
      </a>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('excel-input')?.click()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-indigo-300 p-10 text-center hover:bg-indigo-50 transition-colors"
      >
        <input
          id="excel-input"
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleInput}
        />
        {fileName ? (
          <p className="text-sm font-medium text-slate-700">{fileName}</p>
        ) : (
          <>
            <p className="text-sm text-slate-400">Drag &amp; drop your .xlsx file here</p>
            <p className="text-xs text-slate-300 mt-1">or click to browse</p>
          </>
        )}
      </div>

      {state.status === 'error' && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-bold text-red-700 mb-1">Please fix the following errors in your Excel file:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs text-red-600">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {state.status === 'valid' && (
        <button
          onClick={() => onSubmit(state.data)}
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing…' : 'Generate & Sign'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/steps/ExcelUpload.test.tsx
```

Expected: `PASS` — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/steps/ExcelUpload.tsx src/steps/ExcelUpload.test.tsx
git commit -m "feat: add ExcelUpload component — file validation and zod error display"
```

---

## Task 5: LandingPage.tsx — mode selector

**Files:**
- Create: `src/LandingPage.tsx`
- Create: `src/LandingPage.test.tsx`

**Interfaces:**
- Produces component with props:
  ```typescript
  interface Props {
    onSelect: (mode: 'form' | 'excel') => void;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/LandingPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('renders both mode options', () => {
    render(<LandingPage onSelect={vi.fn()} />);
    expect(screen.getByText(/fill in form/i)).toBeInTheDocument();
    expect(screen.getByText(/upload excel/i)).toBeInTheDocument();
  });

  it('calls onSelect with "form" when Fill in Form is clicked', () => {
    const onSelect = vi.fn();
    render(<LandingPage onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/fill in form/i));
    expect(onSelect).toHaveBeenCalledWith('form');
  });

  it('calls onSelect with "excel" when Upload Excel is clicked', () => {
    const onSelect = vi.fn();
    render(<LandingPage onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/upload excel/i));
    expect(onSelect).toHaveBeenCalledWith('excel');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/LandingPage.test.tsx
```

Expected: `FAIL` — `LandingPage` not found

- [ ] **Step 3: Implement LandingPage.tsx**

Create `src/LandingPage.tsx`:

```tsx
interface Props {
  onSelect: (mode: 'form' | 'excel') => void;
}

export default function LandingPage({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-12">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-700">How would you like to create your guarantee?</h2>
        <p className="text-sm text-slate-500 mt-1">Choose an entry method below</p>
      </div>
      <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
        <button
          onClick={() => onSelect('form')}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-indigo-200 p-8 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        >
          <span className="text-4xl" aria-hidden>📝</span>
          <span className="font-semibold text-slate-700">Fill in Form</span>
          <span className="text-xs text-slate-400 text-center">Enter details directly in your browser</span>
        </button>
        <button
          onClick={() => onSelect('excel')}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-indigo-200 p-8 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        >
          <span className="text-4xl" aria-hidden>📊</span>
          <span className="font-semibold text-slate-700">Upload Excel Sheet</span>
          <span className="text-xs text-slate-400 text-center">Fill the provided .xlsx template and upload</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/LandingPage.test.tsx
```

Expected: `PASS` — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/LandingPage.tsx src/LandingPage.test.tsx
git commit -m "feat: add LandingPage — two-card entry mode selector"
```

---

## Task 6: Wire App.tsx — add mode state and route between landing / form / excel

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `LandingPage` from `./LandingPage`, `ExcelUpload` from `./steps/ExcelUpload`
- All existing exports and behaviour of `App.tsx` are preserved; only the initial view changes

- [ ] **Step 1: Replace src/App.tsx**

Open `src/App.tsx`. Make the following targeted changes (shown as the complete new file — diff against the existing file to verify nothing unintentional changed):

```tsx
import { useState, useCallback } from 'react';
import GuaranteeForm from './form/GuaranteeForm';
import GuaranteePreview from './renderer/GuaranteePreview';
import VcJsonViewer from './renderer/VcJsonViewer';
import ExcelUpload from './steps/ExcelUpload';
import LandingPage from './LandingPage';
import { assembleVC } from './vc/assembleVC';
import type { GuaranteeFormData } from './form/schema';

const ISSUER_DID = import.meta.env.VITE_DID_WEB ?? '';
const RENDERER_URL = import.meta.env.VITE_RENDERER_URL ?? 'https://eguarantee.hendrypoh.com/renderer';

type EntryMode = 'landing' | 'form' | 'excel';

type AppState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'signed'; signedVC: object };

export default function App() {
  const [mode, setMode] = useState<EntryMode>('landing');
  const [appState, setAppState] = useState<AppState>({ phase: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [liveVC, setLiveVC] = useState<ReturnType<typeof assembleVC> | null>(null);

  function handleModeSelect(m: 'form' | 'excel') {
    setMode(m);
    setAppState({ phase: 'idle' });
    setLiveVC(null);
    setError(null);
  }

  function handleBack() {
    setMode('landing');
    setAppState({ phase: 'idle' });
    setLiveVC(null);
    setError(null);
  }

  const handleValidChange = useCallback((isValid: boolean, data: GuaranteeFormData) => {
    if (isValid) {
      setLiveVC(assembleVC(data, ISSUER_DID || 'did:web:pending-setup', RENDERER_URL));
    }
  }, []);

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
          <div className="flex items-center gap-3">
            {mode !== 'landing' && (
              <button
                onClick={handleBack}
                className="text-xs text-indigo-200 hover:text-white"
                aria-label="Back to home"
              >
                ← Back
              </button>
            )}
            <span className="font-bold tracking-wide">YORK — Your Online LetterOfGuarantee Kit</span>
          </div>
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

      {/* Body */}
      {mode === 'landing' ? (
        <div className="flex-1">
          <LandingPage onSelect={handleModeSelect} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: entry panel */}
          <aside className="w-[45%] overflow-y-auto border-r border-slate-200 bg-white px-6 py-4">
            {mode === 'form' ? (
              <GuaranteeForm
                onSubmit={handleSubmit}
                onValidChange={handleValidChange}
                isSubmitting={appState.phase === 'submitting'}
              />
            ) : (
              <ExcelUpload
                onSubmit={handleSubmit}
                onValidChange={handleValidChange}
                isSubmitting={appState.phase === 'submitting'}
              />
            )}
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
                {mode === 'form'
                  ? 'Fill in the form to see the guarantee preview'
                  : 'Upload your Excel file to see the guarantee preview'}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all prior tests still pass; no new failures

- [ ] **Step 3: Start the dev server and manually verify the flow**

```bash
npm run dev
```

Open `http://localhost:5173` and verify:
1. Landing page shows two cards — "Fill in Form" and "Upload Excel Sheet"
2. "Fill in Form" → existing webform works as before; "← Back" returns to landing
3. "Upload Excel Sheet" → upload `~/Desktop/guarantee-template.xlsx` → preview renders, "Generate & Sign" appears
4. If DID is configured: click "Generate & Sign" → signed VC appears → "Download bankers_guarantee.tt" works

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire App.tsx — landing page + Excel upload path alongside existing form"
```

---

## Final check

```bash
npm test
```

Expected output:
```
 ✓ src/excel/parseExcel.test.ts (4 tests)
 ✓ src/excel/mapToSchema.test.ts (6 tests)
 ✓ src/steps/ExcelUpload.test.tsx (6 tests)
 ✓ src/LandingPage.test.tsx (3 tests)
 ✓ src/form/schema.test.ts (12 tests)
 ✓ server/routes/vc.test.ts (N tests)

 Test Files  6 passed
```
