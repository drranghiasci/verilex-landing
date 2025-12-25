// app/client/page.tsx
'use client';

import ClientCaseStatus from '../../components/client/ClientCaseStatus'; // Ensure this file exists at the specified path
import ClientDocumentUpload from '../../components/client/ClientDocumentUpload';

export default function ClientDashboard() {
  return (
    <div className="space-y-10">
      <ClientCaseStatus />
      <ClientDocumentUpload />
    </div>
  );
}
