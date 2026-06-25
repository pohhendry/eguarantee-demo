import { readFileSync } from 'fs';
import { join } from 'path';
import { signW3C } from '@trustvc/trustvc';

export interface KeyPair {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
  secretKeyMultibase: string;
  [key: string]: unknown;
}

const KEYPAIR_PATH = join(process.cwd(), 'keys', 'keypair.json');

let cachedKeypair: KeyPair | null = null;

export function loadKeypair(): KeyPair {
  if (cachedKeypair) return cachedKeypair;
  try {
    const raw = readFileSync(KEYPAIR_PATH, 'utf-8');
    cachedKeypair = JSON.parse(raw) as KeyPair;
    return cachedKeypair;
  } catch {
    throw new Error(
      'keys/keypair.json not found. Run "npm run setup" to generate the signing identity.'
    );
  }
}

export function resetKeypairCache(): void {
  cachedKeypair = null;
}

export async function signVC(unsignedVC: object): Promise<object> {
  const keyPair = loadKeypair();
  const result = await signW3C(unsignedVC, keyPair, 'ecdsa-sd-2023') as { signed?: object; error?: string } | object;
  // signW3C returns { signed: <document with proof> } — unwrap it.
  if (result && typeof result === 'object' && 'signed' in result) {
    const wrapped = result as { signed: object };
    return wrapped.signed;
  }
  return result as object;
}
