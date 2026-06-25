'use strict';
// Pure CJS helper for generating an ECDSA-SD-2023 keypair.
// Runs in a Node.js CJS context without tsx/ESM interference.
// Called by setup.ts via child_process.execFile and returns JSON to stdout.

const { generateDidKeyPair, CryptoSuite } = require('@trustvc/w3c-issuer');

generateDidKeyPair(CryptoSuite.EcdsaSd2023)
  .then((result) => {
    process.stdout.write(JSON.stringify(result.didKeyPairs));
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(String(err));
    process.exit(1);
  });
