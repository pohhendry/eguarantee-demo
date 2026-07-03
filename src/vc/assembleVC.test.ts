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
