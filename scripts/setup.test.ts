import { describe, it, expect } from 'vitest';
import { buildKeypairJson, buildDidDocument } from './setup.ts';

const SUBDOMAIN = 'eguarantee.fyntech.io';
const DID_WEB = `did:web:${SUBDOMAIN}`;
const KEY_ID = `${DID_WEB}#key-1`;

const MOCK_RAW_KEYPAIR = {
  publicKeyMultibase: 'zDnaeXXXpublicXXXkey',
  secretKeyMultibase: 'z42tkXXXsecretXXXkey',
};

describe('buildKeypairJson', () => {
  it('sets id to did:web:<subdomain>#key-1', () => {
    const kp = buildKeypairJson(SUBDOMAIN, MOCK_RAW_KEYPAIR);
    expect(kp.id).toBe(KEY_ID);
  });

  it('sets controller to did:web:<subdomain>', () => {
    const kp = buildKeypairJson(SUBDOMAIN, MOCK_RAW_KEYPAIR);
    expect(kp.controller).toBe(DID_WEB);
  });

  it('sets type to Multikey', () => {
    const kp = buildKeypairJson(SUBDOMAIN, MOCK_RAW_KEYPAIR);
    expect(kp.type).toBe('Multikey');
  });

  it('preserves publicKeyMultibase from raw keypair', () => {
    const kp = buildKeypairJson(SUBDOMAIN, MOCK_RAW_KEYPAIR);
    expect(kp.publicKeyMultibase).toBe(MOCK_RAW_KEYPAIR.publicKeyMultibase);
  });

  it('preserves secretKeyMultibase from raw keypair', () => {
    const kp = buildKeypairJson(SUBDOMAIN, MOCK_RAW_KEYPAIR);
    expect(kp.secretKeyMultibase).toBe(MOCK_RAW_KEYPAIR.secretKeyMultibase);
  });

  it('sets @context to multikey context', () => {
    const kp = buildKeypairJson(SUBDOMAIN, MOCK_RAW_KEYPAIR);
    expect(kp['@context']).toBe('https://w3id.org/security/multikey/v1');
  });

  it('works with a different subdomain', () => {
    const kp = buildKeypairJson('test.example.com', MOCK_RAW_KEYPAIR);
    expect(kp.id).toBe('did:web:test.example.com#key-1');
    expect(kp.controller).toBe('did:web:test.example.com');
  });
});

describe('buildDidDocument', () => {
  it('sets id to did:web:<subdomain>', () => {
    const doc = buildDidDocument(SUBDOMAIN, MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(doc.id).toBe(DID_WEB);
  });

  it('includes the W3C DID and multikey contexts', () => {
    const doc = buildDidDocument(SUBDOMAIN, MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(doc['@context']).toContain('https://www.w3.org/ns/did/v1');
    expect(doc['@context']).toContain('https://w3id.org/security/multikey/v1');
  });

  it('verificationMethod has one entry with correct id and type', () => {
    const doc = buildDidDocument(SUBDOMAIN, MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(doc.verificationMethod).toHaveLength(1);
    expect(doc.verificationMethod[0].id).toBe(KEY_ID);
    expect(doc.verificationMethod[0].type).toBe('Multikey');
  });

  it('verificationMethod entry has correct controller and publicKeyMultibase', () => {
    const doc = buildDidDocument(SUBDOMAIN, MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(doc.verificationMethod[0].controller).toBe(DID_WEB);
    expect(doc.verificationMethod[0].publicKeyMultibase).toBe(MOCK_RAW_KEYPAIR.publicKeyMultibase);
  });

  it('verificationMethod does NOT contain secretKeyMultibase', () => {
    const doc = buildDidDocument(SUBDOMAIN, MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(JSON.stringify(doc)).not.toContain('secretKey');
  });

  it('authentication references the key id', () => {
    const doc = buildDidDocument(SUBDOMAIN, MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(doc.authentication).toContain(KEY_ID);
  });

  it('assertionMethod references the key id', () => {
    const doc = buildDidDocument(SUBDOMAIN, MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(doc.assertionMethod).toContain(KEY_ID);
  });

  it('works with a different subdomain', () => {
    const doc = buildDidDocument('test.example.com', MOCK_RAW_KEYPAIR.publicKeyMultibase);
    expect(doc.id).toBe('did:web:test.example.com');
    expect(doc.verificationMethod[0].id).toBe('did:web:test.example.com#key-1');
  });
});
