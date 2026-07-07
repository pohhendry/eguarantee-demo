import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcel, FIELD_NAMES } from './parseExcel';

// Builds an in-memory .xlsx File with named ranges pointing to column A cells
function makeFile(values: Record<string, unknown>, omit: string[] = []): File {
  const wb = XLSX.utils.book_new();
  const entries = Object.entries(values).filter(([k]) => !omit.includes(k));
  const ws: XLSX.WorkSheet = { '!ref': `A1:A${entries.length}` };
  entries.forEach(([, v], i) => {
    ws[`A${i + 1}`] = { v, t: typeof v === 'number' ? 'n' : 's' };
  });
  XLSX.utils.book_append_sheet(wb, ws, 'Guarantee Data');

  if (!wb.Workbook) wb.Workbook = { Names: [] };
  entries.forEach(([name], i) => {
    wb.Workbook!.Names!.push({ Name: name, Ref: `'Guarantee Data'!$A$${i + 1}` });
  });

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  return new File([buf as unknown as BlobPart], 'test.xlsx', {
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
