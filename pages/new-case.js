'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewCasePage() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    phone_number: '',
    state: '',
    location: '',
    case_type: '',
    legal_area: '',
    preferred_contact: '',
    description: '',
    uploaded_file: null
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'uploaded_file') {
      setFormData((prev) => ({ ...prev, uploaded_file: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    let fileUrl = null;
    if (formData.uploaded_file) {
      const { data, error } = await supabase.storage
        .from('case-documents')
        .upload(`cases/${Date.now()}_${formData.uploaded_file.name}`, formData.uploaded_file);

      if (error) {
        setErrorMessage('Failed to upload file.');
        setSubmitting(false);
        return;
      }
      fileUrl = data.path;
    }

    const { error } = await supabase.from('cases').insert([
      { ...formData, uploaded_file: fileUrl }
    ]);

    if (error) {
      setErrorMessage('Error submitting case.');
    } else {
      setSuccessMessage('Case submitted successfully!');
      setFormData({
        client_name: '',
        client_email: '',
        phone_number: '',
        state: '',
        location: '',
        case_type: '',
        legal_area: '',
        preferred_contact: '',
        description: '',
        uploaded_file: null
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 pt-24 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-blue-600 text-sm mb-6 inline-block">← Back to Dashboard</Link>
      <h1 className="text-3xl font-bold mb-6">Enhanced Client Intake</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <input name="client_name" placeholder="Client Full Name" value={formData.client_name} onChange={handleChange} required className="w-full border rounded px-4 py-2" />
        <input name="client_email" placeholder="Client Email" value={formData.client_email} onChange={handleChange} required className="w-full border rounded px-4 py-2" />
        <input name="phone_number" placeholder="Phone Number" value={formData.phone_number} onChange={handleChange} className="w-full border rounded px-4 py-2" />
        <select name="state" value={formData.state} onChange={handleChange} required className="w-full border rounded px-4 py-2">
          <option value="">Select State</option>
          {['Alabama','Alaska','Arizona','California','New York','Texas'].map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        <input name="location" placeholder="City or County" value={formData.location} onChange={handleChange} className="w-full border rounded px-4 py-2" />
        <select name="legal_area" value={formData.legal_area} onChange={handleChange} required className="w-full border rounded px-4 py-2">
          <option value="">Select Legal Area</option>
          <option value="Divorce">Divorce</option>
          <option value="Custody">Custody</option>
          <option value="Contracts">Contracts</option>
          <option value="Estate Planning">Estate Planning</option>
        </select>
        <input name="case_type" placeholder="Case Type (e.g. Contested)" value={formData.case_type} onChange={handleChange} className="w-full border rounded px-4 py-2" />
        <select name="preferred_contact" value={formData.preferred_contact} onChange={handleChange} className="w-full border rounded px-4 py-2">
          <option value="">Preferred Contact</option>
          <option value="Email">Email</option>
          <option value="Phone">Phone</option>
          <option value="Either">Either</option>
        </select>
        <textarea name="description" placeholder="Case Description" value={formData.description} onChange={handleChange} rows="4" className="w-full border rounded px-4 py-2" />
        <div>
          <label className="block font-medium mb-1">Upload Related Document</label>
          <input type="file" name="uploaded_file" onChange={handleChange} className="w-full" />
        </div>
        <button type="submit" disabled={submitting} className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800">
          {submitting ? 'Submitting...' : 'Save & Submit'}
        </button>
        {successMessage && <p className="text-green-600">{successMessage}</p>}
        {errorMessage && <p className="text-red-600">{errorMessage}</p>}
      </form>
    </div>
  );
}
