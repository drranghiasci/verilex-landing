"use client";

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewCasePage() {
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [caseType, setCaseType] = useState('');
  const [description, setDescription] = useState('');
  const [contactMethod, setContactMethod] = useState('Email');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage('');

    if (!clientName || !email || !phone || !state || !caseType) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      // Upload file to Supabase Storage if selected
      let uploadedFileURL = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('case-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('case-documents')
          .getPublicUrl(fileName);

        uploadedFileURL = publicUrlData.publicUrl;
      }

      // Insert case data
      const { error: insertError } = await supabase.from('cases').insert([
        {
          client_name: clientName,
          client_email: email,
          client_phone: phone,
          state,
          case_type: caseType,
          description,
          preferred_contact: contactMethod,
          file_url: uploadedFileURL,
        },
      ]);

      if (insertError) throw insertError;

      setMessage('Case submitted successfully!');
      setClientName('');
      setEmail('');
      setPhone('');
      setState('');
      setCaseType('');
      setDescription('');
      setContactMethod('Email');
      setFile(null);
    } catch (err) {
      console.error(err);
      setError('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-4">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50 py-3 px-6 flex justify-between items-center">
        <div className="text-xl font-extrabold tracking-tight text-gray-900">VeriLex AI</div>
        <div className="space-x-6 text-sm font-medium">
          <Link href="/">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Home</span>
          </Link>
          <Link href="/dashboard">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Dashboard</span>
          </Link>
          <Link href="/settings">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Settings</span>
          </Link>
        </div>
      </nav>

      <div className="pt-28 max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-8 text-center">New Case Intake</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            placeholder="Client Full Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="email"
            placeholder="Client Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select State</option>
            {[
              "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
              "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
              "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
              "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
              "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
              "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
              "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
              "Wisconsin", "Wyoming"
            ].map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select Case Type</option>
            <option value="Uncontested Divorce">Uncontested Divorce</option>
            <option value="Contested Divorce">Contested Divorce</option>
            <option value="Child Custody & Visitation">Child Custody & Visitation</option>
            <option value="Spousal Support">Spousal Support</option>
            <option value="Property Division">Property Division</option>
            <option value="Prenuptial/Postnuptial">Prenuptial/Postnuptial</option>
            <option value="Other">Other</option>
          </select>
          <textarea
            placeholder="Brief case description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input type="radio" name="contactMethod" value="Email" checked={contactMethod === 'Email'} onChange={() => setContactMethod('Email')} />
                Email
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="contactMethod" value="Phone" checked={contactMethod === 'Phone'} onChange={() => setContactMethod('Phone')} />
                Phone
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="contactMethod" value="Either" checked={contactMethod === 'Either'} onChange={() => setContactMethod('Either')} />
                Either
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Related Document (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full px-4 py-2 border border-gray-300 rounded-md" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
          >
            {loading ? 'Submitting...' : 'Submit Case'}
          </button>

          {error && <p className="text-red-600 text-center mt-4">{error}</p>}
          {message && <p className="text-green-600 text-center mt-4">{message}</p>}
        </form>
      </div>
    </div>
  );
}
