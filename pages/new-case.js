'use client';

import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function NewCasePage() {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [state, setState] = useState('');
  const [caseType, setCaseType] = useState('');
  const [description, setDescription] = useState('');
  const [preferredContact, setPreferredContact] = useState('Email');
  const [file, setFile] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cases').insert([
      {
        client_name: clientName,
        client_email: clientEmail,
        phone_number: phoneNumber,
        state,
        case_type: caseType,
        description,
        preferred_contact: preferredContact,
      },
    ]);
    if (!error) {
      alert('Case submitted successfully!');
      setClientName('');
      setClientEmail('');
      setPhoneNumber('');
      setState('');
      setCaseType('');
      setDescription('');
      setPreferredContact('Email');
      setFile(null);
      setPreviewVisible(false);
    } else {
      alert('Error submitting case.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-4 py-12">
      <div className="flex flex-col md:flex-row md:space-x-10 max-w-6xl mx-auto">
        {/* Intake Form */}
        <div className="w-full md:w-1/2 space-y-4">
          <h1 className="text-3xl font-bold mb-4">New Case Intake</h1>
          <input
            className="w-full border border-gray-400 rounded px-3 py-2"
            placeholder="Client Full Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <input
            className="w-full border border-gray-400 rounded px-3 py-2"
            placeholder="Client Email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
          <input
            className="w-full border border-gray-400 rounded px-3 py-2"
            placeholder="Phone Number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <select
            className="w-full border border-gray-400 rounded px-3 py-2"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Select State</option>
            {[
              'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
            ].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="w-full border border-gray-400 rounded px-3 py-2"
            value={caseType}
            onChange={(e) => setCaseType(e.target.value)}
          >
            <option value="">Select Case Type</option>
            <option value="Uncontested Divorce">Uncontested Divorce</option>
            <option value="Contested Divorce">Contested Divorce</option>
            <option value="Child Custody & Visitation">Child Custody & Visitation</option>
            <option value="Division of Property">Division of Property</option>
            <option value="Alimony/Spousal Support">Alimony/Spousal Support</option>
            <option value="Prenuptial/Postnuptial Agreements">Prenuptial/Postnuptial Agreements</option>
          </select>
          <textarea
            className="w-full border border-gray-400 rounded px-3 py-2"
            placeholder="Brief case description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="text-left text-gray-700 font-medium mt-2">Preferred Contact Method</div>
          <div className="flex space-x-4 mb-2">
            {['Email', 'Phone', 'Either'].map((method) => (
              <label key={method} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="contactMethod"
                  value={method}
                  checked={preferredContact === method}
                  onChange={() => setPreferredContact(method)}
                />
                <span>{method}</span>
              </label>
            ))}
          </div>
          <div className="border border-gray-400 rounded p-2">
            <label className="block text-sm text-gray-600 mb-1">Upload Related Document (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <button
            onClick={() => setPreviewVisible(true)}
            className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition w-full"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save & Submit to Active Cases'}
          </button>
        </div>

        {/* Live Preview */}
        {previewVisible && (
          <div className="w-full md:w-1/2 mt-12 md:mt-0">
            <h2 className="text-2xl font-semibold mb-4">Case Preview</h2>
            <div className="bg-white rounded-xl shadow p-4 space-y-2">
              <p><strong>Name:</strong> {clientName}</p>
              <p><strong>Email:</strong> {clientEmail}</p>
              <p><strong>Phone:</strong> {phoneNumber}</p>
              <p><strong>State:</strong> {state}</p>
              <p><strong>Case Type:</strong> {caseType}</p>
              <p><strong>Preferred Contact:</strong> {preferredContact}</p>
              <p><strong>Description:</strong> {description}</p>
              {file && <p><strong>Document:</strong> {file.name}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
