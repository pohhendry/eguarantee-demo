import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

// @trustvc/trustvc's ESM dist has broken transitive deps on Node 20 (missing .jsx
// contract files in @tradetrust-tt/token-registry-v4). The CJS dist works correctly.
// createRequire loads the CJS dist regardless of whether this file runs as ESM.
const _require = createRequire(import.meta.url);
const { signW3C } = _require('@trustvc/trustvc') as { signW3C: (...args: unknown[]) => Promise<Record<string, unknown>> };

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
  const result = await signW3C(unsignedVC, keyPair, 'ecdsa-sd-2023') as Record<string, unknown>;
  if (result.error || !result.signed) {
    throw new Error(
      typeof result.error === 'string' ? result.error : 'signW3C returned no signed document'
    );
  }
  return result.signed as object;
}
