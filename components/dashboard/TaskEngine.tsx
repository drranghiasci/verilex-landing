'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AddTaskModal from '@/components/dashboard/AddTaskModal';

export default function TaskEngine() {
  const supabase = createClientComponentClient();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleTaskCreated = () => {
    fetchTasks();
    closeModal();
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow p-6 flex flex-col gap-4 transition-colors duration-300">
      {/* HEADER: Title + Add Task Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">🔧 Open Tasks</h2>
        <button
          onClick={openModal}
          className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800 dark:hover:bg-zinc-700 transition"
        >
          + Add Task
        </button>
      </div>

      {/* CONTENT: Either loading spinner, no tasks, or task list */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No open tasks right now.</p>
      ) : (
        <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
          {tasks.map((task) => (
            <li key={task.id} className="border-b border-gray-200 dark:border-zinc-700 pb-2">
              <span className="font-semibold">{task.title}</span>{' '}
              {task.due_date ? (
                <span className="text-gray-600 dark:text-zinc-400">• Due {new Date(task.due_date).toLocaleDateString()}</span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">• No due date</span>
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
