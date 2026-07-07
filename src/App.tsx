import { useState, useCallback } from 'react';
import GuaranteeForm from './form/GuaranteeForm';
import GuaranteePreview from './renderer/GuaranteePreview';
import VcJsonViewer from './renderer/VcJsonViewer';
import ExcelUpload from './steps/ExcelUpload';
import LandingPage from './LandingPage';
import { assembleVC } from './vc/assembleVC';
import type { GuaranteeFormData } from './form/schema';

const ISSUER_DID = import.meta.env.VITE_DID_WEB ?? '';
const RENDERER_URL = import.meta.env.VITE_RENDERER_URL ?? 'https://eguarantee.hendrypoh.com/renderer';

type EntryMode = 'landing' | 'form' | 'excel';

type AppState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'signed'; signedVC: object };

export default function App() {
  const [mode, setMode] = useState<EntryMode>('landing');
  const [appState, setAppState] = useState<AppState>({ phase: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [liveVC, setLiveVC] = useState<ReturnType<typeof assembleVC> | null>(null);

  function handleModeSelect(m: 'form' | 'excel') {
    setMode(m);
    setAppState({ phase: 'idle' });
    setLiveVC(null);
    setError(null);
  }

  function handleBack() {
    setMode('landing');
    setAppState({ phase: 'idle' });
    setLiveVC(null);
    setError(null);
  }

  const handleValidChange = useCallback((isValid: boolean, data: GuaranteeFormData) => {
    if (isValid) {
      setLiveVC(assembleVC(data, ISSUER_DID || 'did:web:pending-setup', RENDERER_URL));
    }
  }, []);

  async function handleSubmit(data: GuaranteeFormData) {
    setError(null);
    setAppState({ phase: 'submitting' });
    try {
      const unsignedVC = assembleVC(data, ISSUER_DID || 'did:web:pending-setup', RENDERER_URL);
      const res = await fetch('/api/vc/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unsignedVC }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const { signedVC } = await res.json();
      setAppState({ phase: 'signed', signedVC });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed');
      setAppState({ phase: 'idle' });
    }
  }

  function downloadSignedVC(signedVC: object) {
    const blob = new Blob([JSON.stringify(signedVC, null, 2)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bankers_guarantee.tt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const previewVC = appState.phase === 'signed' ? appState.signedVC : liveVC;
  const credentialSubject = previewVC
    ? (previewVC as { credentialSubject: Parameters<typeof GuaranteePreview>[0]['subject'] }).credentialSubject
    : null;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Nav bar */}
      <header className="flex flex-col bg-indigo-600 px-6 py-3 text-white shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mode !== 'landing' && (
              <button
                onClick={handleBack}
                className="text-xs text-indigo-200 hover:text-white"
                aria-label="Back to home"
              >
                ← Back
              </button>
            )}
            <span className="font-bold tracking-wide">YORK — Your Online LetterOfGuarantee Kit</span>
          </div>
          {ISSUER_DID ? (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-mono">✓ {ISSUER_DID}</span>
          ) : (
            <span className="rounded-full bg-yellow-300 text-yellow-900 px-3 py-1 text-xs">
              ⚠ Identity not configured — run npm run setup
            </span>
          )}
        </div>
        <p className="text-xs text-indigo-200 mt-0.5">
          Built on TradeTrust — decentralised and open-source, so YORK can be deployed inside a bank&apos;s own
          environment beyond Phase 1.
        </p>
      </header>

      {/* Body */}
      {mode === 'landing' ? (
        <div className="flex-1">
          <LandingPage onSelect={handleModeSelect} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: entry panel */}
          <aside className="w-[45%] overflow-y-auto border-r border-slate-200 bg-white px-6 py-4">
            {mode === 'form' ? (
              <GuaranteeForm
                onSubmit={handleSubmit}
                onValidChange={handleValidChange}
                isSubmitting={appState.phase === 'submitting'}
              />
            ) : (
              <ExcelUpload
                onSubmit={handleSubmit}
                onValidChange={handleValidChange}
                isSubmitting={appState.phase === 'submitting'}
              />
            )}
            {error && (
              <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </aside>

          {/* Right: Preview */}
          <main className="flex-1 overflow-y-auto bg-slate-50 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 mb-3">Preview</p>

            {credentialSubject ? (
              <>
                <GuaranteePreview
                  subject={credentialSubject}
                  issuerDid={ISSUER_DID || undefined}
                />

                {appState.phase === 'signed' && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-green-700">✓ Signed VC ready</p>
                      <p className="text-xs text-green-600">Drag bankers_guarantee.tt onto trustvc.io to verify</p>
                    </div>
                    <button
                      onClick={() =>
                        downloadSignedVC((appState as { phase: 'signed'; signedVC: object }).signedVC)
                      }
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Download bankers_guarantee.tt
                    </button>
                  </div>
                )}

                <VcJsonViewer
                  vc={previewVC!}
                  label={appState.phase === 'signed' ? 'Signed VC JSON ▾' : 'Unsigned VC JSON (preview) ▾'}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                {mode === 'form'
                  ? 'Fill in the form to see the guarantee preview'
                  : 'Upload your Excel file to see the guarantee preview'}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
