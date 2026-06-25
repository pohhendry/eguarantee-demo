import { existsSync, writeFileSync, readFileSync, mkdirSync, appendFileSync } from 'fs';
import { createInterface } from 'readline/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Validate Node.js version — require(esm) support was backported to Node 20.19+
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 20 || (nodeMajor === 20 && (nodeMinor ?? 0) < 19)) {
  console.error(
    `Error: This script requires Node.js 20.19 or later (found ${process.versions.node}).\n` +
    `Run: nvm use 20  — then try again.`
  );
  process.exit(1);
}

interface RawKeyPair {
  publicKeyMultibase: string;
  secretKeyMultibase: string;
  [k: string]: unknown;
}

export interface KeypairJson {
  '@context': string;
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
  secretKeyMultibase: string;
}

export interface DidDocument {
  '@context': string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
}

/** Pure helper — builds the keypair object that signVC.ts expects */
export function buildKeypairJson(subdomain: string, rawKeyPair: RawKeyPair): KeypairJson {
  const didWeb = `did:web:${subdomain}`;
  const keyId = `${didWeb}#key-1`;
  return {
    '@context': 'https://w3id.org/security/multikey/v1',
    id: keyId,
    type: 'Multikey',
    controller: didWeb,
    publicKeyMultibase: rawKeyPair.publicKeyMultibase,
    secretKeyMultibase: rawKeyPair.secretKeyMultibase,
  };
}

/** Pure helper — builds the DID document for /.well-known/did.json */
export function buildDidDocument(subdomain: string, publicKeyMultibase: string): DidDocument {
  const didWeb = `did:web:${subdomain}`;
  const keyId = `${didWeb}#key-1`;
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/multikey/v1',
    ],
    id: didWeb,
    verificationMethod: [
      {
        id: keyId,
        type: 'Multikey',
        controller: didWeb,
        publicKeyMultibase,
      },
    ],
    authentication: [keyId],
    assertionMethod: [keyId],
  };
}

/** Updates .env to add DID_WEB and VITE_DID_WEB if not already present */
function updateEnv(subdomain: string): void {
  const envPath = join(process.cwd(), '.env');
  const didWeb = `did:web:${subdomain}`;

  let existing = '';
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, 'utf-8');
  }

  const linesToAdd: string[] = [];
  if (!existing.includes('DID_WEB=')) {
    linesToAdd.push(`DID_WEB=${didWeb}`);
  }
  if (!existing.includes('VITE_DID_WEB=')) {
    linesToAdd.push(`VITE_DID_WEB=${didWeb}`);
  }

  if (linesToAdd.length > 0) {
    const prefix = existing.endsWith('\n') || existing === '' ? '' : '\n';
    appendFileSync(envPath, `${prefix}${linesToAdd.join('\n')}\n`);
  }
}

/** Writes .env.example (always overwrite) */
function writeEnvExample(): void {
  const envExamplePath = join(process.cwd(), '.env.example');
  const content = `DID_WEB=\nVITE_DID_WEB=\nPORT=3001\nPRIVATE_KEY=\n`;
  writeFileSync(envExamplePath, content);
}

async function pollUntilLive(subdomain: string, didWeb: string): Promise<void> {
  console.log('\nVerifying…');
  const didJsonUrl = `https://${subdomain}/.well-known/did.json`;
  const dnsTxtName = `_did.${subdomain}`;
  const dohUrl = `https://dns.google/resolve?name=${encodeURIComponent(dnsTxtName)}&type=TXT`;

  let attempts = 0;
  const MAX = 12; // 60 seconds with 5-second intervals

  while (attempts < MAX) {
    attempts++;
    let didDocOk = false;
    let dnsTxtOk = false;

    try {
      const res = await fetch(didJsonUrl);
      if (res.ok) {
        const doc = await res.json() as { id?: string };
        if (doc.id === didWeb) didDocOk = true;
      }
    } catch {
      // not yet live
    }

    try {
      const res = await fetch(dohUrl);
      const data = await res.json() as { Answer?: { data: string }[] };
      const records = data.Answer ?? [];
      dnsTxtOk = records.some((r) => r.data.includes(`did=${didWeb}`));
    } catch {
      // not yet live
    }

    const didDocMark = didDocOk ? '✓' : '…';
    const dnsMark = dnsTxtOk ? '✓' : '…';
    process.stdout.write(
      `\r[${didDocMark}] did.json   [${dnsMark}] DNS TXT   (attempt ${attempts}/${MAX})`
    );

    if (didDocOk && dnsTxtOk) {
      console.log('\n\n✓ Identity is live and verified!');
      return;
    }

    if (attempts < MAX) {
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }

  console.log(
    '\n\nCould not verify within the timeout. Check your DNS and hosting, then re-run npm run setup.'
  );
}

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n=== eGuarantee Identity Setup ===\n');

  const keypairPath = join(process.cwd(), 'keys', 'keypair.json');
  const didJsonPath = join(process.cwd(), 'keys', 'did.json');

  if (existsSync(keypairPath)) {
    const overwrite = await rl.question('keys/keypair.json already exists. Overwrite? (y/N): ');
    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  const subdomain = (
    await rl.question('Enter your fyntech.io subdomain (e.g. eguarantee.fyntech.io): ')
  ).trim();

  if (!subdomain) {
    console.error('Subdomain is required.');
    rl.close();
    process.exit(1);
  }

  const didWeb = `did:web:${subdomain}`;

  console.log(`\nGenerating ECDSA-SD-2023 key pair for ${didWeb}…`);

  // Use a separate CJS helper to avoid ESM/CJS interop issues with @trustvc/w3c-issuer's deps
  const helperPath = join(__dirname, 'gen-keypair.cjs');
  const { stdout: keypairJson } = await execFileAsync(process.execPath, [helperPath]);
  const rawPair = JSON.parse(keypairJson) as RawKeyPair;

  const keypairForSigning = buildKeypairJson(subdomain, rawPair);
  const didDocument = buildDidDocument(subdomain, rawPair.publicKeyMultibase);

  mkdirSync('keys', { recursive: true });
  writeFileSync(keypairPath, JSON.stringify(keypairForSigning, null, 2));
  writeFileSync(didJsonPath, JSON.stringify(didDocument, null, 2));
  console.log('✓ keys/keypair.json written (keep this file secret — never commit it)');
  console.log('✓ keys/did.json written');

  updateEnv(subdomain);
  console.log('✓ .env updated with DID_WEB and VITE_DID_WEB');

  writeEnvExample();
  console.log('✓ .env.example written\n');

  console.log('─────────────────────────────────────────────');
  console.log('NEXT STEPS — two manual actions required:\n');
  console.log('STEP A — Publish your DID document:');
  console.log(`  Upload  keys/did.json`);
  console.log(`  To:     https://${subdomain}/.well-known/did.json`);
  console.log(`  (The file must be served with Content-Type: application/json)\n`);
  console.log('STEP B — Add a DNS TXT record:');
  console.log(`  Name:   _did.${subdomain}`);
  console.log(`  Value:  did=${didWeb}\n`);
  console.log('─────────────────────────────────────────────');

  let check = 'skip';
  try {
    check = await rl.question(
      '\nPress ENTER once both steps are done to verify, or type "skip" to exit: '
    );
  } catch {
    // stdin closed (e.g. non-interactive use) — skip verification
  }

  if (check.trim().toLowerCase() !== 'skip') {
    await pollUntilLive(subdomain, didWeb);
  }

  rl.close();
  console.log('\nSetup complete. Run "npm run dev" to start the app.\n');
}

// Only run main() when this file is executed directly (not imported in tests)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
