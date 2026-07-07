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
