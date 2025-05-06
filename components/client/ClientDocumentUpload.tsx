// app/client/components/ClientDocumentUpload.tsx
'use client';

import { useState } from 'react';

export default function ClientDocumentUpload() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    // TODO: integrate with Supabase Storage
    alert(`Uploading: ${file.name}`);
  };

  return (
    <section className="p-6 rounded-2xl shadow-md border bg-card">
      <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
      <label htmlFor="file-upload" className="block mb-2 text-sm font-medium text-gray-700">
        Choose a file to upload
      </label>
      <input
        id="file-upload"
        type="file"
        title="Select a file to upload"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleUpload}
        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
      >
        Upload
      </button>
    </section>
  );
}
