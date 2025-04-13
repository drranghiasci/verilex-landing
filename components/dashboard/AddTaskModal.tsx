'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AddTaskModal({
  onClose,
  onTaskCreated,
}: {
  onClose: () => void;
  onTaskCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('No user session found. Please log in.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('tasks').insert({
      user_id: user.id,
      title,
      due_date: dueDate || null,
      status: 'pending',
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      onTaskCreated(); // close modal + refresh tasks
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      {/* Centered White Card */}
      <div className="bg-white border border-gray-200 shadow-lg rounded-xl w-full max-w-md mx-auto p-6 relative">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Task</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-sm bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
