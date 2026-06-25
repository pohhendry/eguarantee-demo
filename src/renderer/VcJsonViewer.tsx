import { useState } from 'react';

interface Props {
  vc: object;
  label: string;
}

export default function VcJsonViewer({ vc, label }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
      >
        <span>{label}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <pre className="bg-slate-900 text-slate-300 text-xs p-4 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
          {JSON.stringify(vc, null, 2)}
        </pre>
      )}
    </div>
  );
}
