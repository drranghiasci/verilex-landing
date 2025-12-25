// app/client/components/ClientCaseStatus.tsx
'use client';

export default function ClientCaseStatus() {
  return (
    <section className="p-6 rounded-2xl shadow-md border bg-card">
      <h2 className="text-xl font-semibold mb-2">Case Status</h2>
      <p className="text-muted-foreground">Your case is currently: <span className="font-medium text-primary">Under Review</span></p>
    </section>
  );
}
