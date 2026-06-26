import { useEffect, useRef, useState } from 'react';
import GuaranteePreview from '../renderer/GuaranteePreview';

type CredentialSubject = Parameters<typeof GuaranteePreview>[0]['subject'];

const TEMPLATES = [{ id: 'EBG', label: "Banker's Guarantee" }];

function postToParent(type: string, payload: unknown) {
  window.parent.postMessage({ type, payload }, '*');
}

export default function RendererApp() {
  const [subject, setSubject] = useState<CredentialSubject | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reportHeight = () => {
    postToParent('DOCUMENT_RENDERED', containerRef.current?.scrollHeight ?? 0);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = (event.data ?? {}) as { type: string; payload: unknown };

      if (type === 'RENDER_DOCUMENT') {
        const doc = (payload as { document?: { credentialSubject: CredentialSubject } })?.document
          ?? (payload as { credentialSubject: CredentialSubject });
        setSubject((doc as { credentialSubject: CredentialSubject })?.credentialSubject ?? null);
      } else if (type === 'GET_TEMPLATES') {
        postToParent('TEMPLATES_UPDATED', TEMPLATES);
      } else if (type === 'PRINT') {
        window.print();
        postToParent('PRINT_COMPLETION', true);
      }
    };

    window.addEventListener('message', handleMessage);
    // TrustVC/TradeTrust handshake — parent re-sends RENDER_DOCUMENT after this
    postToParent('IFRAME_CONNECTED', {});
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (subject) requestAnimationFrame(reportHeight);
  }, [subject]);

  if (!subject) return null;

  return (
    <div ref={containerRef} className="p-4">
      <GuaranteePreview subject={subject} />
    </div>
  );
}
