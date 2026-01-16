
import { useMemo } from 'react';
import { globalStyles } from './styles';

type IntakeSidebarProps = {
  open: boolean;
  payload: Record<string, any>;
  firmName?: string;
  onToggle: () => void;
};

export default function IntakeSidebar({ open, payload = {}, firmName, onToggle }: IntakeSidebarProps) {
  // Simple flat list of fields for now. 
  // In a real implementation, we would derive this from the schema.
  const fields = useMemo(() => {
    if (!payload) return [];
    return Object.entries(payload).filter(([key, value]) => {
      // Filter out internal fields and system fields we don't want to show yet
      if (key.startsWith('_')) return false;
      if (key === 'intake_channel') return false; // Per requirements: do not show
      if (!value) return false;
      return true;
    });
  }, [payload]);

  return (
    <>
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <div className="sidebar-tab">
          <span className="vertical-text">Case Summary</span>
        </div>

        <div className="sidebar-inner">
          <div className="sidebar-header">
            <h3>Case Summary</h3>
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

          <div className="sidebar-footer">
            <span>AI-Generated • Read Only</span>
          </div>
        </div>
      </aside>

      <style jsx>{`
        .sidebar {
          position: fixed;
          right: 0;
          top: 0; 
          bottom: 0;
          width: 48px; /* Collapsed width - visible tab */
          height: 100vh;
          background: rgba(10, 10, 15, 0.6); /* Transparent dark when collapsed */
          border-left: 1px solid var(--border);
          backdrop-filter: blur(10px);
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s;
          z-index: 90;
          display: flex;
          overflow: hidden;
          cursor: pointer;
        }

        .sidebar:hover {
          width: 320px;
          background: rgba(10, 10, 15, 0.95); /* Solid on expand */
          box-shadow: -10px 0 40px rgba(0,0,0,0.5);
        }

        /* Logic for mobile open prop */
        .sidebar.mobile-open {
            width: 320px; /* Force open on mobile trigger */
            background: var(--surface-1);
        }

        .sidebar-tab {
            width: 48px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-right: 1px solid transparent;
            transition: opacity 0.3s;
        }
        
        .sidebar:hover .sidebar-tab {
            opacity: 0; /* Hide tab content when expanded? Or keep it? Let's hide to be clean */
            width: 0;
            border-right: none;
        }

        .vertical-text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            white-space: nowrap;
            color: var(--text-2);
            font-size: 12px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 600;
        }

        .sidebar-inner {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 320px; /* Ensure content layout doesn't squash during transition */
            opacity: 0;
            transition: opacity 0.2s;
            padding-top: 60px; /* Match header height roughly */
        }

        .sidebar:hover .sidebar-inner, 
        .sidebar.mobile-open .sidebar-inner {
            opacity: 1;
            transition-delay: 0.1s;
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid var(--border);
          background: transparent;
        }
        
        .sidebar-footer {
            padding: 12px;
            text-align: center;
            font-size: 10px;
            color: var(--text-2);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-top: 1px solid var(--border);
            background: rgba(0,0,0,0.1);
        }

        .sidebar-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-1);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
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
          opacity: 0.7;
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
          font-family: var(--font-mono); 
        }
      `}</style>
    </>
  );
}
