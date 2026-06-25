import { useState } from 'react';
import GuaranteeForm from './form/GuaranteeForm';
import GuaranteePreview from './renderer/GuaranteePreview';
import VcJsonViewer from './renderer/VcJsonViewer';
import { assembleVC } from './vc/assembleVC';
import type { GuaranteeFormData } from './form/schema';

const ISSUER_DID = import.meta.env.VITE_DID_WEB ?? '';
const RENDERER_URL = import.meta.env.VITE_RENDERER_URL ?? 'https://eguarantee.fyntech.io/renderer';

type AppState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'signed'; signedVC: object };

export default function App() {
  const [appState, setAppState] = useState<AppState>({ phase: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [liveVC, setLiveVC] = useState<ReturnType<typeof assembleVC> | null>(null);

  function handleValidChange(isValid: boolean, data: GuaranteeFormData) {
    if (isValid) {
      setLiveVC(assembleVC(data, ISSUER_DID || 'did:web:pending-setup', RENDERER_URL));
    }
  }

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
    const blob = new Blob([JSON.stringify(signedVC, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed_vc.json';
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
      <header className="flex items-center justify-between bg-indigo-500 px-6 py-3 text-white shadow">
        <span className="font-bold tracking-wide">⚡ eGuarantee Creator</span>
        {ISSUER_DID ? (
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-mono">
            ✓ {ISSUER_DID}
          </span>
        ) : (
          <span className="rounded-full bg-yellow-300 text-yellow-900 px-3 py-1 text-xs">
            ⚠ Identity not configured — run npm run setup
          </span>
        )}
      </header>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <aside className="w-[45%] overflow-y-auto border-r border-slate-200 bg-white px-6 py-4">
          <GuaranteeForm
            onSubmit={handleSubmit}
            onValidChange={handleValidChange}
            isSubmitting={appState.phase === 'submitting'}
          />
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
              <GuaranteePreview subject={credentialSubject} />

              {appState.phase === 'signed' && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-green-700">✓ Signed VC ready</p>
                    <p className="text-xs text-green-600">Drag signed_vc.json onto trustvc.io to verify</p>
                  </div>
                  <button
                    onClick={() => downloadSignedVC((appState as { phase: 'signed'; signedVC: object }).signedVC)}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Download signed_vc.json
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
              Fill in the form to see the guarantee preview
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
