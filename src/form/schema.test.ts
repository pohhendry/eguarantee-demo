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
