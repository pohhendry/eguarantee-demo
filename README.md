# YORK — Your Online LetterOfGuarantee Kit

A working demonstration of an **electronic Banker's Guarantee (eBG)** using [W3C Verifiable Credentials 2.0](https://www.w3.org/TR/vc-data-model-2.0/) and the [TradeTrust](https://www.tradetrust.io/) open framework. Built to support IMDA's Phase 1 conversation with UOB on digitising the Banker's Guarantee workflow.

**Live demo:** https://eguarantee-demo.onrender.com  
**Renderer:** https://eguarantee.hendrypoh.com/renderer  
**Verify a document:** drag a `.tt` file onto [trustvc.io](https://trustvc.io)

---

## What this demonstrates

### 1. The document looks like a real UOB instrument
The rendered guarantee uses UOB's approved 8-clause Banker's Guarantee wording verbatim (Appendix A format), with UOB letterhead, formal serif layout, and a SPECIMEN guardrail footer to prevent misuse.

### 2. The signature question is deliberately left open
A fictitious signatory — **Alexandra Teo, Vice President, Trade Finance Operations** — appears in the UOB execution block. This is intentional: when the bank reviews the document, the natural question is *"do we even need a wet-signature image on a cryptographically signed document?"* The demo surfaces that conversation rather than answering it.

### 3. "How do I know it's really from UOB?" is answered on-screen
The verification result on trustvc.io shows the issuer identity prominently: `Issued by: DID:WEB:EGUARANTEE.HENDRYPOH.COM`. An expandable explainer walks through the trust chain:

- The document carries a digital signature made with the issuer's private key.
- The matching public key is published at the issuer's own web domain (`did:web`). Only someone who controls that domain's web server can publish it — trust anchor is domain control, same as the padlock in your browser.
- In a live pilot, the bank publishes one small file on its own domain (e.g. `uob.com.sg`) — that is the entire identity integration.

In this demo the issuer domain is a placeholder (`eguarantee.hendrypoh.com`). In production, it would be `uob.com.sg`.

### 4. The document is tamper-evident
Edit any field in the downloaded `.tt` file and re-verify on trustvc.io — verification fails immediately. The cryptographic proof is over the entire credential subject, not just a hash.

### 5. The renderer is decentralised
The visual template is hosted separately from the verifier. trustvc.io (and any other TradeTrust-compatible verifier) loads the renderer from `https://eguarantee.hendrypoh.com/renderer` via an iframe and Penpal RPC. This means the bank controls how its documents look — the verifier is just a frame.

---

## Architecture

```
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│  eguarantee-demo.onrender.com   │     │  eguarantee.hendrypoh.com    │
│                                 │     │                              │
│  React SPA (Vite + Tailwind)    │     │  Static renderer iframe      │
│  ┌──────────┐  ┌─────────────┐  │     │  (GuaranteePreview.tsx)       │
│  │  Form    │  │  Preview    │  │     │  served by GitHub Pages      │
│  │ (RHF +  │  │(GuaranteeP  │  │     │                              │
│  │  Zod)   │  │  review)    │  │     │  ← loaded by trustvc.io      │
│  └────┬─────┘  └─────────────┘  │     │    via Penpal RPC            │
│       │                         │     └──────────────────────────────┘
│       ▼                         │
│  Express /api/vc/sign           │     ┌──────────────────────────────┐
│  (ECDSA-SD-2023 via @trustvc)   │     │  did:web:eguarantee.         │
│                                 │     │  hendrypoh.com               │
│  → outputs bankers_guarantee.tt │     │                              │
└─────────────────────────────────┘     │  DID document + public key   │
                                        │  (/.well-known/did.json)     │
                                        │  served by GitHub Pages      │
                                        └──────────────────────────────┘
```

**Signing:** The Express server signs the VC using `@trustvc/trustvc` with ECDSA-SD-2023. The private key lives in Render.com's secret environment (`PRIVATE_KEY_JSON`).

**Issuer identity:** `did:web:eguarantee.hendrypoh.com` — the DID document is at `/.well-known/did.json` on GitHub Pages.

**Credential format:** W3C VC 2.0, `renderMethod` pointing at the hosted renderer (`templateName: 'EBG'`). Compatible with ref.tradetrust.io and trustvc.io.

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Generate a keypair and DID document (first time only)
npm run setup

# 3. Start the dev server (Vite + Express on separate ports, proxied)
npm run dev
```

Open http://localhost:5173. The form signs locally — no cloud keys needed after `npm run setup`.

---

## Credential schema

See [`docs/schema.md`](docs/schema.md) for the full `credentialSubject` field glossary. Key fields:

| Field | Description |
|---|---|
| `guaranteeNumber` | Bank's reference number |
| `applicant` | Company requesting the guarantee |
| `beneficiary` | Counterparty the guarantee is issued to |
| `bank` | Issuing bank (name, registration number, address) |
| `guaranteedSum` | Amount in currency, figures, and words |
| `signatory` | Name, title, and signature image |
| `expiryDate` | Expiry date (clause 2(i)) |

---

## Phase 1 scope

This demo covers **Verifiable Document** issuance only — no token registry, no blockchain commitment, no amendment or cancellation flows. Those are out of scope for the Phase 1 UOB conversation.

What a real Phase 1 pilot would add on top of this demo:
- Issuer DID published at `uob.com.sg` (one JSON file on the bank's web server)
- Internal bank system integration to populate the form fields
- IMDA / MAS trusted-issuer registry as a second trust anchor layer
