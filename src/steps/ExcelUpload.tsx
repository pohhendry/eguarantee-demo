import { useState, useCallback } from 'react';
import type { GuaranteeFormData } from '../form/schema';
import { guaranteeSchema } from '../form/schema';
import { parseExcel } from '../excel/parseExcel';
import { mapToSchema } from '../excel/mapToSchema';

interface Props {
  onSubmit: (data: GuaranteeFormData) => void;
  onValidChange: (isValid: boolean, data: GuaranteeFormData) => void;
  isSubmitting: boolean;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'error'; errors: string[] }
  | { status: 'valid'; data: GuaranteeFormData };

export default function ExcelUpload({ onSubmit, onValidChange, isSubmitting }: Props) {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [fileName, setFileName] = useState<string | null>(null);

  async function processFile(file: File) {
    setState({ status: 'idle' });
    setFileName(file.name);

    if (!file.name.endsWith('.xlsx')) {
      onValidChange(false, {} as GuaranteeFormData);
      setState({ status: 'error', errors: ['File must be a .xlsx file.'] });
      return;
    }
    if (file.size > 1_048_576) {
      onValidChange(false, {} as GuaranteeFormData);
      setState({ status: 'error', errors: ['File must be under 1 MB.'] });
      return;
    }

    try {
      const raw = await parseExcel(file);
      const mapped = mapToSchema(raw);
      const result = guaranteeSchema.safeParse(mapped);

      if (!result.success) {
        const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        onValidChange(false, {} as GuaranteeFormData);
        setState({ status: 'error', errors });
        return;
      }

      setState({ status: 'valid', data: result.data });
      onValidChange(true, result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file.';
      onValidChange(false, {} as GuaranteeFormData);
      setState({ status: 'error', errors: [msg] });
    }
  }

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <a
        href="/guarantee-template.xlsx"
        download
        className="self-start text-xs text-indigo-600 underline hover:text-indigo-800"
      >
        ↓ Download Excel template
      </a>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('excel-input')?.click()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-indigo-300 p-10 text-center hover:bg-indigo-50 transition-colors"
      >
        <input
          id="excel-input"
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleInput}
        />
        {fileName ? (
          <p className="text-sm font-medium text-slate-700">{fileName}</p>
        ) : (
          <>
            <p className="text-sm text-slate-400">Drag &amp; drop your .xlsx file here</p>
            <p className="text-xs text-slate-300 mt-1">or click to browse</p>
          </>
        )}
      </div>

      {state.status === 'error' && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-bold text-red-700 mb-1">Please fix the following errors in your Excel file:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs text-red-600">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {state.status === 'valid' && (
        <button
          onClick={() => onSubmit(state.data)}
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing…' : 'Generate & Sign'}
        </button>
      )}
    </div>
  );
}
