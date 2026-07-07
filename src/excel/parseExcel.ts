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

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file — make sure it is a valid .xlsx file.'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseExcel(file: File): Promise<RawFields> {
  const buf = await readFileAsArrayBuffer(file);
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
