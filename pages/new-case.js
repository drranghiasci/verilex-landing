'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
    case_type: '',
    preferred_contact: '',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase.from('cases').insert([formData]);

    if (error) {
      console.error(error);
      setErrorMessage('There was an error submitting the case.');
    } else {
      setSuccessMessage('Case submitted successfully and added to Active Cases.');
      setFormData({
        client_name: '',
        client_email: '',
        phone_number: '',
        state: '',
        case_type: '',
        preferred_contact: '',
        description: '',
      });
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 pt-24 max-w-3xl mx-auto">
      {/* Back to Dashboard */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-black transition">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">New Divorce Case Intake</h1>
      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        <div>
          <label className="block font-medium mb-1">Client Name</label>
          <input
            type="text"
            name="client_name"
            value={formData.client_name}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Client Email</label>
          <input
            type="email"
            name="client_email"
            value={formData.client_email}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Case Type</label>
          <input
            type="text"
            name="case_type"
            value={formData.case_type}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Preferred Contact Method</label>
          <select
            name="preferred_contact"
            value={formData.preferred_contact}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          >
            <option value="">Select</option>
            <option value="Email">Email</option>
            <option value="Phone">Phone</option>
            <option value="Either">Either</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Brief Case Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition"
        >
          {submitting ? 'Submitting...' : 'Save & Submit to Active Cases'}
        </button>

        {successMessage && <p className="text-green-600 mt-4">{successMessage}</p>}
        {errorMessage && <p className="text-red-600 mt-4">{errorMessage}</p>}
      </form>
    </div>
  );
}
