import { forwardRef } from 'react';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const TextareaField = forwardRef<HTMLTextAreaElement, Props>(({ label, error, ...rest }, ref) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-600">{label} *</label>
    <textarea
      ref={ref}
      rows={2}
      className={`rounded-md border px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 resize-none ${
        error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
      }`}
      {...rest}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
TextareaField.displayName = 'TextareaField';
export default TextareaField;
