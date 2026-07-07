interface Props {
  onSelect: (mode: 'form' | 'excel') => void;
}

export default function LandingPage({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-12">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-700">How would you like to create your guarantee?</h2>
        <p className="text-sm text-slate-500 mt-1">Choose an entry method below</p>
      </div>
      <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
        <button
          onClick={() => onSelect('form')}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-indigo-200 p-8 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        >
          <span className="text-4xl" aria-hidden>📝</span>
          <span className="font-semibold text-slate-700">Fill in Form</span>
          <span className="text-xs text-slate-400 text-center">Enter details directly in your browser</span>
        </button>
        <button
          onClick={() => onSelect('excel')}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-indigo-200 p-8 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        >
          <span className="text-4xl" aria-hidden>📊</span>
          <span className="font-semibold text-slate-700">Upload Excel Sheet</span>
          <span className="text-xs text-slate-400 text-center">Fill the provided .xlsx template and upload</span>
        </button>
      </div>
    </div>
  );
}
