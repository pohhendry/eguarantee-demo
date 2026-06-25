import GuaranteeForm from './form/GuaranteeForm';
export default function App() {
  return (
    <div className="max-w-md mx-auto mt-8 p-4">
      <GuaranteeForm
        onSubmit={(d) => console.log(d)}
        onValidChange={(v, d) => console.log(v, d)}
        isSubmitting={false}
      />
    </div>
  );
}
