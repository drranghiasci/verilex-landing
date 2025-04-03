'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewCasePage() {
  const [preview, setPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    caseType: '',
    description: '',
    contactPreference: '',
    file: null,
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, file: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const caseTypes = [
    'Uncontested Divorce',
    'Contested Divorce',
    'Legal Separation',
    'Child Custody & Visitation',
    'Child Support',
    'Spousal Support / Alimony',
    'Division of Property',
    'Domestic Violence / Restraining Order',
    'Modification of Court Orders',
    'Prenuptial/Postnuptial Agreements'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
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

      <div className="pt-28 px-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 text-center">New Case Intake</h1>
        <form className="space-y-5">
          <input
            type="text"
            name="name"
            placeholder="Client Full Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-400 rounded-md"
          />
          <input
            type="email"
            name="email"
            placeholder="Client Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-400 rounded-md"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-400 rounded-md"
          />
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-400 rounded-md"
          >
            <option value="">Select State</option>
            {states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <select
            name="caseType"
            value={formData.caseType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-400 rounded-md"
          >
            <option value="">Select Case Type</option>
            {caseTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <textarea
            name="description"
            placeholder="Brief case description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-400 rounded-md"
          />

          {/* Contact Preference Buttons */}
          <div className="space-x-4">
            <label className="inline-flex items-center">
              <input type="radio" name="contactPreference" value="Email" onChange={handleChange} />
              <span className="ml-2">Email</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="contactPreference" value="Phone" onChange={handleChange} />
              <span className="ml-2">Phone</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="contactPreference" value="Either" onChange={handleChange} />
              <span className="ml-2">Either</span>
            </label>
          </div>

          {/* File Upload with Clear Border */}
          <div className="border border-gray-400 rounded-md px-4 py-2">
            <label className="block text-sm font-medium mb-1">Upload Related Document (optional)</label>
            <input type="file" name="file" onChange={handleChange} />
          </div>

          <button
            type="button"
            onClick={() => setPreview(true)}
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
          >
            Preview Case
          </button>
        </form>

        {/* Preview Section */}
        {preview && (
          <div className="mt-10 bg-white p-6 rounded-xl shadow-md border">
            <h2 className="text-xl font-bold mb-4">Case Preview</h2>
            <p><strong>Name:</strong> {formData.name}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Phone:</strong> {formData.phone}</p>
            <p><strong>State:</strong> {formData.state}</p>
            <p><strong>Case Type:</strong> {formData.caseType}</p>
            <p><strong>Preferred Contact:</strong> {formData.contactPreference}</p>
            <p><strong>Description:</strong> {formData.description}</p>
            {formData.file && <p><strong>Attached File:</strong> {formData.file.name}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
