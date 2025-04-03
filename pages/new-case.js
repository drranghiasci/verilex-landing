'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewCasePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    caseType: '',
    description: '',
    contactMethod: '',
  });
  const [file, setFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('case-uploads')
        .upload(fileName, file);

      if (error) {
        alert('File upload failed.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('case-uploads')
        .getPublicUrl(fileName);

      setUploadedFileUrl(publicUrlData.publicUrl);
    }

    setShowPreview(true);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/submit-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, fileUrl: uploadedFileUrl }),
      });

      if (response.ok) {
        setSubmitted(true);
        setShowPreview(false);
      } else {
        alert('Failed to submit case.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting case.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8">New Case Intake</h1>

        {submitted ? (
          <div className="bg-green-100 border border-green-400 text-green-800 p-6 rounded-md">
            ✅ Case submitted successfully! It will appear in your dashboard.
          </div>
        ) : (
          <>
            {!showPreview ? (
              <form onSubmit={handlePreview} className="space-y-6">
                <input type="text" name="name" placeholder="Client Full Name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded" required />
                <input type="email" name="email" placeholder="Client Email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border rounded" required />
                <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border rounded" required />
                <select name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-2 border rounded" required>
                  <option value="">Select State</option>
                  <option value="AL">Alabama</option>
                  <option value="GA">Georgia</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                </select>
                <select name="caseType" value={formData.caseType} onChange={handleChange} className="w-full px-4 py-2 border rounded" required>
                  <option value="">Select Case Type</option>
                  <option value="Uncontested Divorce">Uncontested Divorce</option>
                  <option value="Contested Divorce">Contested Divorce</option>
                  <option value="Other">Other</option>
                </select>
                <textarea name="description" placeholder="Brief case description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-4 py-2 border rounded" required />
                <div className="space-x-4">
                  <label><input type="radio" name="contactMethod" value="Email" checked={formData.contactMethod === 'Email'} onChange={handleChange} required /> Email</label>
                  <label><input type="radio" name="contactMethod" value="Phone" checked={formData.contactMethod === 'Phone'} onChange={handleChange} /> Phone</label>
                  <label><input type="radio" name="contactMethod" value="Either" checked={formData.contactMethod === 'Either'} onChange={handleChange} /> Either</label>
                </div>
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="w-full px-4 py-2 border rounded" />
                <button type="submit" className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition">
                  Preview Case
                </button>
              </form>
            ) : (
              <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
                <h2 className="text-2xl font-bold mb-4">Case Preview</h2>
                <ul className="space-y-2 text-gray-700 text-lg">
                  <li><strong>Client Name:</strong> {formData.name}</li>
                  <li><strong>Email:</strong> {formData.email}</li>
                  <li><strong>Phone:</strong> {formData.phone}</li>
                  <li><strong>State:</strong> {formData.state}</li>
                  <li><strong>Case Type:</strong> {formData.caseType}</li>
                  <li><strong>Description:</strong> {formData.description}</li>
                  <li><strong>Preferred Contact:</strong> {formData.contactMethod}</li>
                  {uploadedFileUrl && (
                    <li>
                      <strong>Uploaded File:</strong>{' '}
                      <a href={uploadedFileUrl} className="text-blue-600 underline" target="_blank">
                        View File
                      </a>
                    </li>
                  )}
                </ul>
                <div className="flex justify-between">
                  <button onClick={() => setShowPreview(false)} className="text-gray-600 hover:text-black transition">
                    ← Edit
                  </button>
                  <button onClick={handleSubmit} className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition">
                    Confirm & Submit
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
