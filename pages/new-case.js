'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import ErrorBoundary from '../components/ErrorBoundary';
import { COUNTY_MAP } from '../utils/countyMap';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export default function NewCasePage() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    phone_number: '',
    state: '',
    county: '',
    case_type: '',
    preferred_contact: '',
    description: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'state' && { county: '' }) // Reset county when state changes
    }));
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
        county: '',
        case_type: '',
        preferred_contact: '',
        description: ''
      });
    }

    setSubmitting(false);
  };

  const filteredCounties = formData.state && COUNTY_MAP[formData.state]
    ? COUNTY_MAP[formData.state].filter(county =>
        county.toLowerCase().includes(formData.county.toLowerCase())
      )
    : [];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-8 pt-24 max-w-6xl mx-auto">
        <Link href="/dashboard">
          <span className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4">
            ← Back to Dashboard
          </span>
        </Link>

        <h1 className="text-4xl font-extrabold mb-6">Client Intake</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-4 py-2"
            >
              <option value="">Select a state</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {formData.state && COUNTY_MAP[formData.state] && (
            <div>
              <label className="block font-medium mb-1">County</label>
              <input
                type="text"
                name="county"
                value={formData.county}
                onChange={handleChange}
                placeholder="Start typing to search..."
                className="w-full border border-gray-300 rounded-md px-4 py-2 mb-2"
              />
              <select
                name="county"
                value={formData.county}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-4 py-2"
              >
                <option value="">Select a county</option>
                {filteredCounties.map((county) => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
            </div>
          )}

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

          <div className="border border-gray-300 p-4 rounded-lg">
            <label className="block font-medium mb-2">Upload Documents</label>
            <div className="border border-dashed border-gray-400 p-4 rounded-md text-center text-sm text-gray-600">
              Choose file
            </div>
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
    </ErrorBoundary>
  );
}
