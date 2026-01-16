
import { useMemo } from 'react';
import { globalStyles } from './styles';
import { unwrapAssertion, isAssertionMetadata } from '../../../../lib/intake/assertionTypes';

type IntakeSidebarProps = {
  open: boolean;
  payload: Record<string, any>;
  firmName?: string;
  onToggle: () => void;
};

export default function IntakeSidebar({ open, payload = {}, firmName, onToggle }: IntakeSidebarProps) {
  // Extract fields and unwrap assertion metadata for display
  const fields = useMemo(() => {
    if (!payload) return [];
    return Object.entries(payload)
      .filter(([key, value]) => {
        if (key.startsWith('_')) return false;
        if (key === 'intake_channel') return false;
        // Check the unwrapped value, not the wrapper
        const rawValue = unwrapAssertion(value);
        if (!rawValue) return false;
        return true;
      })
      .map(([key, value]) => ({
        key,
        displayValue: String(unwrapAssertion(value)),
        hasMetadata: isAssertionMetadata(value),
        sourceType: isAssertionMetadata(value) ? value.source_type : null,
      }));
  }, [payload]);

  return (
    <>
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <div className="trigger-zone" />

        <div className="sidebar-inner">
          <div className="sidebar-header">
            <h3>Client Assertions</h3>
          </div>

          <div className="sidebar-content">
            {fields.length === 0 ? (
              <div className="empty-state">
                <p>No information collected yet.</p>
              </div>
            ) : (
              <div className="field-list">
                {fields.map(({ key, displayValue, sourceType }) => (
                  <div key={key} className="field-item">
                    <div className="field-label">
                      {key.replace(/_/g, ' ')}
                      {sourceType && <span className="source-badge">{sourceType}</span>}
                    </div>
                    <div className="field-value">{displayValue}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <span>Client-Provided • Not Legal Advice</span>
          </div>
        </div>
      </aside>

      <style jsx>{`
        .sidebar {
          position: fixed;
          right: 0;
          top: 0; 
          bottom: 0;
          width: 24px; /* Narrower trigger zone */
          height: 100vh;
          background: transparent; /* Invisible trigger */
          border-left: none; /* No border in collapsed state */
          z-index: 90;
          display: flex;
          overflow: hidden;
          cursor: pointer;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s;
        }

        .sidebar:hover {
          width: 320px;
          background: rgba(10, 10, 15, 0.95); /* Solid on expand */
          backdrop-filter: blur(20px);
          box-shadow: -10px 0 40px rgba(0,0,0,0.5);
          border-left: 1px solid var(--border);
        }

        .trigger-zone {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 100%;
            z-index: 91;
            background: transparent;
        }

        /* Logic for mobile open prop override */
        .sidebar.mobile-open {
            width: 320px;
            background: var(--surface-1);
            border-left: 1px solid var(--border);
        }

        .vertical-text {
            display: none; 
        }

        /* Hide tab text or make it very subtle vertical line */
        .vertical-text {
            display: none; /* Hide visible text in collapsed state per request "white box" removal */
        }
        
        /* Optional: Add a subtle indicator line on hover maybe? 
           For now, purely invisible trigger zone as requested (no "white box").
        */

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

        .source-badge {
          display: inline-block;
          font-size: 9px;
          padding: 2px 4px;
          margin-left: 6px;
          background: rgba(59, 130, 246, 0.2);
          color: rgba(59, 130, 246, 0.9);
          border-radius: 3px;
          text-transform: lowercase;
          vertical-align: middle;
        }
      `}</style>
    </>
  );
}
