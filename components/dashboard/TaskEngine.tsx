'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface Task {
  id: string;
  case_id: string;
  title: string;
  status: string;
  due_date: string | null;
  case_title?: string; // Optional if joined
}

export default function TaskEngine() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, case_id, title, status, due_date,
          cases (client_name)
        `)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error loading tasks:', error);
      } else {
        const enriched = data.map((task) => ({
          ...task,
          case_title: task.cases?.[0]?.client_name ?? 'Unknown Case',
        }));
        setTasks(enriched);
      }

      setLoading(false);
    };

    fetchTasks();
  }, []);

  const markComplete = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', id);

    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'done' } : t)));
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow text-sm text-gray-500">Loading tasks...</div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">📌 Open Tasks</h2>
      <ul className="space-y-3">
        {tasks.length === 0 ? (
          <li className="text-gray-500 text-sm">No open tasks right now.</li>
        ) : (
          tasks
            .filter((t) => t.status !== 'done')
            .map((task) => (
              <li
                key={task.id}
                className="flex justify-between items-start border-b border-gray-100 pb-3"
              >
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-gray-500">
                    {task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                    {' · '}
                    <Link
                      href={`/active-cases/${task.case_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {task.case_title}
                    </Link>
                  </p>
                </div>
                <button
                  onClick={() => markComplete(task.id)}
                  className="text-xs bg-black text-white px-2 py-1 rounded hover:bg-gray-800 transition"
                >
                  Mark Done
                </button>
              </li>
            ))
        )}
      </ul>
    </div>
  );
}
