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
