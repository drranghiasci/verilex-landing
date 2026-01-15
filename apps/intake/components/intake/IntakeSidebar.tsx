
import { useMemo } from 'react';
import { globalStyles } from './styles';

type IntakeSidebarProps = {
    open: boolean;
    payload: Record<string, any>;
    firmName?: string;
    onToggle: () => void;
};

export default function IntakeSidebar({ open, payload, firmName, onToggle }: IntakeSidebarProps) {
    // Simple flat list of fields for now. 
    // In a real implementation, we would derive this from the schema.
    const fields = useMemo(() => {
        return Object.entries(payload).filter(([key, value]) => {
            // Filter out internal fields
            if (key.startsWith('_')) return false;
            if (!value) return false;
            return true;
        });
    }, [payload]);

    return (
        <>
            <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <h3>Case Summary</h3>
                    <button onClick={onToggle} className="toggle-btn">
                        {open ? '→' : '←'}
                    </button>
                </div>

                <div className="sidebar-content">
                    {fields.length === 0 ? (
                        <div className="empty-state">
                            <p>No information collected yet.</p>
                        </div>
                    ) : (
                        <div className="field-list">
                            {fields.map(([key, value]) => (
                                <div key={key} className="field-item">
                                    <div className="field-label">{key.replace(/_/g, ' ')}</div>
                                    <div className="field-value">{String(value)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            <style jsx>{`
        .sidebar {
          position: fixed;
          right: 0;
          top: 60px; /* Below header */
          bottom: 0;
          width: 320px;
          background: var(--surface-1);
          border-left: 1px solid var(--border);
          backdrop-filter: blur(20px);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 90;
          display: flex;
          flex-direction: column;
        }

        .sidebar.closed {
          transform: translateX(100%);
        }

        .sidebar-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sidebar-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-1);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .toggle-btn {
          background: transparent;
          border: none;
          color: var(--text-2);
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        .toggle-btn:hover {
          background: var(--surface-2);
          color: var(--text-0);
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .empty-state {
          color: var(--text-2);
          font-size: 13px;
          text-align: center;
          margin-top: 40px;
        }

        .field-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-label {
          font-size: 11px;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .field-value {
          font-size: 14px;
          color: var(--text-1);
          word-break: break-word;
        }
      `}</style>
        </>
    );
}
