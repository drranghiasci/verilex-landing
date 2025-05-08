// app/client/layout.tsx
// ✅ app/layout.tsx
import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">VeriLex Client Portal</h1>
      <main className="w-full max-w-3xl">{children}</main>
    </div>
  );
}
