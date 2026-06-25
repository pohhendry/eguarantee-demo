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

  it('includes @vocab in context for JSON-LD safe mode', () => {
    const vc = assembleVC(data, ISSUER);
    const vocab = vc['@context'].find((c: unknown) => typeof c === 'object' && (c as Record<string, string>)['@vocab']);
    expect(vocab).toBeDefined();
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
