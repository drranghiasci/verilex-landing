'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../utils/supabaseClient';

export default function NewCasePage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    state: '',
    caseType: '',
    description: '',
    contactMethod: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { fullName, email, phone, state, caseType, description, contactMethod, file } = formData;

    const { data, error } = await supabase
      .from('cases')
      .insert([{ fullName, email, phone, state, caseType, description, contactMethod }]);

    if (error) {
      console.error('Error submitting case:', error);
      return;
    }

    if (file) {
      await supabase.storage.from('case-documents').upload(`${Date.now()}-${file.name}`, file);
    }

    alert('Case submitted successfully!');
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      state: '',
      caseType: '',
      description: '',
      contactMethod: '',
      file: null,
    });
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

      {/* Form Layout */}
      <div className="pt-24 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">New Case Intake</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Client Full Name"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Client Email"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone Number"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />

          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select State</option>
            {[
              'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
              'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
              'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
              'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
              'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
            ].map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select
            name="caseType"
            value={formData.caseType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select Case Type</option>
            <option value="Uncontested Divorce">Uncontested Divorce</option>
            <option value="Contested Divorce">Contested Divorce</option>
            <option value="Child Custody & Visitation">Child Custody & Visitation</option>
            <option value="Property Division">Property Division</option>
            <option value="Spousal Support">Spousal Support</option>
            <option value="Other">Other</option>
          </select>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief case description"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          ></textarea>

          <label className="block text-sm font-medium text-gray-700">Preferred Contact Method</label>
          <div className="flex items-center gap-6">
            <label><input type="radio" name="contactMethod" value="Email" onChange={handleChange} /> Email</label>
            <label><input type="radio" name="contactMethod" value="Phone" onChange={handleChange} /> Phone</label>
            <label><input type="radio" name="contactMethod" value="Either" onChange={handleChange} /> Either</label>
          </div>

          <div className="mt-4 border border-gray-300 rounded-md px-4 py-3">
            <label className="block mb-2 text-sm font-medium text-gray-700">Upload Related Document (optional)</label>
            <input
              type="file"
              name="file"
              onChange={handleChange}
              className="block w-full text-sm text-gray-700"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
          >
            Save & Submit to Active Cases
          </button>

          <div className="pb-32"></div>
        </form>
      </div>
    </div>
  );
}
