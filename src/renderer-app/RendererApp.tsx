import { useEffect, useRef, useState } from 'react';
import { connectToParent } from 'penpal';
import GuaranteePreview from '../renderer/GuaranteePreview';

type CredentialSubject = Parameters<typeof GuaranteePreview>[0]['subject'];

const TEMPLATES = [{ id: 'EBG', label: "Banker's Guarantee", type: 'custom' }];
const noop = () => {};

export default function RendererApp() {
  const [subject, setSubject] = useState<CredentialSubject | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatchToHost = useRef<(action: object) => void>(noop);

  useEffect(() => {
    const connection = connectToParent<{ dispatch: (action: object) => Promise<void> }>({
      methods: {
        dispatch(action: { type: string; payload: any }) {
          if (action.type === 'RENDER_DOCUMENT') {
            const doc = action.payload?.document ?? action.payload;
            setSubject(doc?.credentialSubject ?? null);
            dispatchToHost.current({ type: 'UPDATE_TEMPLATES', payload: TEMPLATES });
          } else if (action.type === 'GET_TEMPLATES') {
            dispatchToHost.current({ type: 'UPDATE_TEMPLATES', payload: TEMPLATES });
            return TEMPLATES;
          } else if (action.type === 'SELECT_TEMPLATE') {
            // single template, nothing to do
          } else if (action.type === 'PRINT') {
            window.print();
          }
        },
      },
      timeout: 30000,
    });

    connection.promise.then((parent) => {
      dispatchToHost.current = (action) => parent.dispatch(action);
    });

    return () => connection.destroy();
  }, []);

  useEffect(() => {
    if (!subject || !containerRef.current) return;
    requestAnimationFrame(() => {
      if (containerRef.current) {
        dispatchToHost.current({ type: 'UPDATE_HEIGHT', payload: containerRef.current.scrollHeight });
      }
    });
  }, [subject]);

  if (!subject) return null;

  return (
    <div ref={containerRef}>
      <GuaranteePreview subject={subject} />
    </div>
  );
}
