import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewCase() {
  const [form, setForm] = useState({
    clientName: '',
    caseType: '',
    location: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.from('cases').insert([
      {
        client_name: form.clientName,
        case_type: form.caseType,
        location: form.location,
      },
    ]);

    if (error) {
      console.error('Error inserting case:', error);
      setMessage('❌ Error creating case.');
    } else {
      setMessage('✅ Case submitted successfully!');
      setForm({ clientName: '', caseType: '', location: '' });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6">New Divorce Intake</h1>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div>
            <label className="block font-medium mb-1">Client Name</label>
            <input
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              required
              className="w-full border px-4 py-2 rounded"
              placeholder="e.g., Jane Doe"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Case Type</label>
            <select
              name="caseType"
              value={form.caseType}
              onChange={handleChange}
              required
              className="w-full border px-4 py-2 rounded"
            >
              <option value="">Select one</option>
              <option value="Uncontested Divorce">Uncontested Divorce</option>
              <option value="Contested Divorce">Contested Divorce</option>
              <option value="Custody Modification">Custody Modification</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              required
              className="w-full border px-4 py-2 rounded"
              placeholder="e.g., Georgia"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
          >
            {loading ? 'Submitting...' : 'Submit Case'}
          </button>

          {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
        </form>
      </main>
    </div>
  );
}
