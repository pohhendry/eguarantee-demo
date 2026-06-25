import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { existsSync, renameSync } from 'fs';
import app from '../index';
import { resetKeypairCache } from '../services/signVC';

// The VC uses did:web:eguarantee.fyntech.io as issuer (must match keypair controller).
// An inline @vocab context is required so JSON-LD does not reject unknown terms
// (bgNumber, issuingBank, etc.) in safe mode validation.
const validUnsignedVC = {
  '@context': [
    'https://www.w3.org/ns/credentials/v2',
    'https://trustvc.io/context/render-method-context-v2.json',
    { '@vocab': 'https://eguarantee.example.com/vocab#' },
  ],
  type: ['VerifiableCredential'],
  issuer: 'did:web:eguarantee.fyntech.io',
  validFrom: '2026-06-24T00:00:00Z',
  validUntil: '2027-06-30T00:00:00Z',
  credentialSubject: {
    id: 'https://eguarantee.example.com/bg/BG-2026-88910',
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

beforeEach(() => {
  // Reset keypair cache before each test so state doesn't bleed between tests.
  resetKeypairCache();
});

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
    const path = 'keys/keypair.json';
    const tmp = 'keys/keypair.json.bak';
    if (!existsSync(path)) {
      console.warn('SKIPPED: keys/keypair.json not present to test 503 path.');
      return;
    }
    renameSync(path, tmp);
    // Cache was reset in beforeEach, so loadKeypair will re-read (and fail).
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
