'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddTaskModal from './AddTaskModal';

export default function TaskEngine() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending') // Example filter if you want "open" tasks only
      .order('due_date', { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleTaskCreated = () => {
    // Re-fetch tasks after a successful creation
    fetchTasks();
    closeModal();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow p-6 flex flex-col gap-4">
      {/* HEADER: Title + Add Task Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">🔧 Open Tasks</h2>
        <button
          onClick={openModal}
          className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800 transition"
        >
          + Add Task
        </button>
      </div>

      {/* CONTENT: Either loading spinner, no tasks, or task list */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-500">No open tasks right now.</p>
      ) : (
        <ul className="space-y-2 text-sm text-gray-800">
          {tasks.map((task) => (
            <li key={task.id} className="border-b border-gray-200 pb-2">
              <span className="font-semibold">{task.title}</span>{' '}
              {task.due_date ? (
                <span className="text-gray-600">• Due {new Date(task.due_date).toLocaleDateString()}</span>
              ) : (
                <span className="text-gray-400">• No due date</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* MODAL */}
      {showModal && (
        <AddTaskModal onClose={closeModal} onTaskCreated={handleTaskCreated} />
      )}
    </div>
  );
}
