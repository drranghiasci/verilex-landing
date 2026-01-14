import Head from 'next/head';
import type { CSSProperties, ReactNode } from 'react';
import IntakeFooter from './IntakeFooter';
import IntakeHeader from './IntakeHeader';

const globalStyles = `
  :root {
    --g1: #000000;
    --g2: #13001f;
    --g3: #1a0b2e;
    --bg: #030005;
    --surface-0: rgba(20, 20, 25, 0.40);
    --surface-1: rgba(25, 25, 35, 0.25);
    --surface-2: rgba(30, 30, 45, 0.30);
    --border: rgba(255, 255, 255, 0.08);
    --border-highlight: rgba(255, 255, 255, 0.15);
    --muted: rgba(255, 255, 255, 0.5);
    --muted-2: rgba(255, 255, 255, 0.3);
    --text: rgba(255, 255, 255, 0.95);
    --text-0: #ffffff;
    --text-1: rgba(255, 255, 255, 0.9);
    --text-2: rgba(255, 255, 255, 0.6);
    --accent: #7c3aed;
    --accent-light: #a78bfa;
    --accent-glow: rgba(139, 92, 246, 0.5);
    --danger: #f87171;
    --success: #34d399;
    --firm-accent: var(--accent-light);
    --glass-blur: 20px;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: var(--text);
    background: 
      radial-gradient(circle at 10% 10%, var(--g2), transparent 45%),
      radial-gradient(circle at 80% 20%, var(--g3), transparent 50%),
      radial-gradient(circle at 40% 90%, var(--g2), transparent 40%),
      var(--bg);
    background-attachment: fixed;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  h1, h2, h3, h4 { margin: 0; color: var(--text-0); }
  a { color: inherit; }
  .page { padding: clamp(20px, 3vw, 36px); }

  .shell {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
  }

  .shell__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    padding: 20px 24px;
    border-radius: 20px;
    background: var(--surface-1);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--border);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }

  .shell__eyebrow {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--accent-light);
    margin: 0 0 6px;
    font-weight: 600;
  }

  .shell__logo {
    max-height: 36px;
    max-width: 200px;
    object-fit: contain;
  }

  .shell__title {
    font-size: clamp(24px, 3.2vw, 34px);
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(to right, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .status-pill {
    font-size: 12px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-0);
    color: var(--text-2);
    white-space: nowrap;
    backdrop-filter: blur(4px);
  }

  .status-pill--draft {
    border-color: rgba(167, 139, 250, 0.3);
    color: var(--accent-light);
    background: rgba(167, 139, 250, 0.1);
  }

  .status-pill--submitted {
    border-color: rgba(52, 211, 153, 0.3);
    color: var(--success);
    background: rgba(52, 211, 153, 0.1);
  }

  .shell__content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .shell__footer {
    font-size: 12px;
    color: var(--text-2);
    padding: 20px 24px;
    border-radius: 20px;
    background: var(--surface-1);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--border);
    display: grid;
    gap: 6px;
  }

  .flow {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .locked {
    border: 1px solid rgba(52, 211, 153, 0.35);
    background: rgba(52, 211, 153, 0.08);
  }

  .locked__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .locked__badge {
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(52, 211, 153, 0.18);
    color: var(--success);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .locked__footer {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
    font-size: 13px;
  }

  .flow__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    padding: 24px;
    border-radius: 20px;
    background: var(--surface-1);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--border);
  }

  .flow__meta {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 14px;
  }

  .flow__body {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 24px;
  }

  .flow__panels {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    gap: 24px;
    align-items: start;
  }

  .chat-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .card, .stage, .steps {
    background: var(--surface-1);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .chat-panel__card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface-1);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 20px;
  }

  .chat-panel__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .chat-panel__questions {
    display: grid;
    gap: 16px;
  }

  .chat-panel__question {
    display: grid;
    gap: 10px;
  }

  .chat__helper {
    font-size: 12px;
    color: var(--muted);
  }

  .chat__response {
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    font-size: 13px;
    color: var(--text-1);
  }

  .chat-panel__transcript {
    display: grid;
    gap: 10px;
    max-height: 320px;
    overflow: auto;
    padding-right: 4px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  .chat-panel__bubble {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 16px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    font-size: 14px;
    line-height: 1.5;
  }

  .chat-panel__avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-1);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-light);
  }

  .chat-panel__bubble.is-client .chat-panel__avatar {
    background: rgba(139, 92, 246, 0.2);
    color: #fff;
    order: 2; /* Avatar on right */
  }

  .chat-panel__content {
    padding-top: 2px;
  }

  .chat-panel__bubble.is-client {
    border-color: var(--accent-glow);
    background: rgba(139, 92, 246, 0.1);
    color: var(--text-0);
    align-self: flex-end; /* Note: Parent flex direction is column, so this aligns right */
    flex-direction: row; /* Ensure flex direction is row */
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: fit-content;
    position: sticky;
    top: 20px;
    padding: 16px;
  }

  .steps h3 { font-size: 18px; margin-bottom: 6px; }

  .steps__item {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: inherit;
    transition: all 0.2s ease;
  }

  .steps__item:hover {
    background: var(--surface-1);
    border-color: var(--border);
  }

  .steps__item.is-active {
    background: var(--surface-2);
    border-color: var(--firm-accent);
    box-shadow: 0 0 15px -5px var(--accent-glow);
  }

  .steps__item.is-active .steps__index {
    background: var(--firm-accent);
    color: #fff;
    box-shadow: 0 0 10px var(--accent-glow);
  }

  .steps__index {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface-0);
    font-size: 12px;
    color: var(--text-1);
    transition: all 0.2s ease;
  }

  .steps__title { font-size: 13px; }
  .steps__alert { color: var(--accent-light); font-weight: 700; }
  .steps__footer { margin-top: 8px; font-size: 12px; color: var(--text-2); }

  .stage { padding: clamp(20px, 3vw, 32px); }
  .step { display: flex; flex-direction: column; gap: 20px; }
  .step__header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  
  .step__eyebrow {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent-light);
    margin: 0 0 4px;
    font-weight: 600;
  }

  .step__title {
    font-size: clamp(24px, 3vw, 32px);
    font-weight: 700;
    text-shadow: 0 0 30px rgba(0,0,0,0.5);
  }

  .step__summary { margin: 6px 0 0; font-size: 13px; color: var(--text-2); }

  .step__badge {
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-0);
    color: var(--text-2);
  }

  .step__narrative {
    border-radius: 14px;
    padding: 16px;
    border: 1px dashed var(--accent-light);
    background: rgba(139, 92, 246, 0.1);
  }

  .chat__prompt { font-weight: 600; margin-bottom: 8px; color: var(--text-1); }

  .chat__input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    font-family: inherit;
    background: rgba(0, 0, 0, 0.3);
    color: var(--text);
    transition: all 0.2s ease;
  }

  .chat__input:focus {
    outline: none;
    border-color: var(--firm-accent);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    background: rgba(0, 0, 0, 0.5);
  }

  .chat__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }

  .chat__status { font-size: 12px; color: var(--success); }
  .chat__status.error { color: var(--danger); }
  
  .step__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .field { display: flex; flex-direction: column; gap: 8px; }

  .field__label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-1);
  }

  .field__required {
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--accent-light);
    color: #fff;
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .field__notes { font-size: 11px; color: var(--muted-2); }
  .field__error { font-size: 11px; color: var(--danger); }
  
  .address-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .address-grid__item { display: flex; flex-direction: column; gap: 6px; }
  .address-grid__label { font-size: 12px; color: var(--muted); }

  .multi-select {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }

  .multi-select__option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-1);
    padding: 8px;
    border-radius: 8px;
    transition: background 0.1s;
  }
  
  .multi-select__option:hover { background: var(--surface-2); }

  .field__inline {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
  }

  .input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: rgba(0, 0, 0, 0.3);
    font-family: inherit;
    color: var(--text);
    transition: all 0.2s ease;
  }

  .input:focus {
    outline: none;
    border-color: var(--firm-accent);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    background: rgba(0, 0, 0, 0.5);
  }

  .input--invalid, .field--invalid .input { border-color: var(--danger); }

  .toggle { display: flex; gap: 8px; background: var(--surface-0); border-radius: 999px; border: 1px solid var(--border); padding: 4px; }

  .toggle__btn {
    flex: 1;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    padding: 6px 12px;
    font-family: inherit;
    cursor: pointer;
    color: var(--text-2);
    font-size: 13px;
    transition: all 0.2s ease;
  }

  .toggle__btn:hover { color: var(--text-1); }

  .toggle__btn.is-active {
    background: var(--firm-accent);
    color: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }

  .list { display: flex; flex-direction: column; gap: 12px; }

  .list__row, .list__card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface-0);
  }

  .list__card-header {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-2);
  }

  .list__add, .list__remove {
    align-self: flex-start;
    border: none;
    background: none;
    color: var(--accent-light);
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
  }

  .list__remove { color: var(--danger); }

  .review {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 16px 0;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid rgba(139, 92, 246, 0.3);
    background: rgba(139, 92, 246, 0.05);
  }

  .review__header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .review__title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-0); }
  .review__count { font-size: 12px; color: var(--text-2); }
  .review__list { display: flex; flex-direction: column; gap: 10px; }

  .review__item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface-0);
  }

  .review__message { font-size: 13px; }
  .review__section { display: grid; gap: 10px; }
  .review__transcript { display: grid; gap: 8px; }
  .review__message-meta { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-2); }
  .review__message-body { font-size: 13px; }
  .review__issues { display: grid; gap: 10px; }

  .review__issue {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface-0);
  }

  .review__issue-title { font-weight: 600; font-size: 13px; }
  .review__issue-message { font-size: 12px; color: var(--text-2); }
  .review__issue-section { font-size: 11px; color: var(--text-2); }
  .review__jump, .review__action { border: none; background: none; color: var(--accent-light); font-weight: 600; cursor: pointer; padding: 0; }

  .warning__header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
  .warning__title { margin: 0; font-size: 15px; font-weight: 600; }
  .warning__count { font-size: 12px; color: var(--text-2); }
  .warning__list { display: grid; gap: 10px; }

  .warning__item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(139, 92, 246, 0.3);
    background: rgba(139, 92, 246, 0.08);
  }

  .warning__message { font-size: 13px; }
  .warning__action { border: none; background: none; color: var(--accent-light); font-weight: 600; cursor: pointer; padding: 0; }
  .warning__actions { display: flex; flex-wrap: wrap; gap: 8px; }

  .actions {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }

  .primary, .secondary {
    border-radius: 12px;
    padding: 12px 24px;
    font-family: inherit;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .primary {
    border: 1px solid var(--firm-accent);
    background: var(--firm-accent);
    color: #fff;
    box-shadow: 0 4px 12px var(--accent-glow);
  }

  .primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px var(--accent-glow);
  }

  .primary:disabled, .secondary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

  .secondary {
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-1);
  }

  .secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--text-2);
  }

  .banner {
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 14px;
    border: 1px solid transparent;
    backdrop-filter: blur(10px);
  }

  .banner.error {
    background: rgba(248, 113, 113, 0.15);
    border-color: rgba(248, 113, 113, 0.3);
    color: #fca5a5;
  }

  .banner.success {
    background: rgba(52, 211, 153, 0.15);
    border-color: rgba(52, 211, 153, 0.35);
    color: #86efac;
  }

  .banner.info {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: #a5b4fc;
  }

  .safety { display: grid; gap: 10px; }
  .safety__title { margin: 0; font-size: 15px; }
  .safety__line { margin: 0; font-size: 13px; }
  .safety__actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .safety__hide { color: var(--accent-light); }

  .card {
    background: var(--surface-1);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 520px;
  }

  .pill {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-0);
    font-size: 12px;
    color: var(--text-2);
  }

  .muted { color: var(--text-2); font-size: 14px; }
  
  .mono {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    word-break: break-all;
    color: var(--accent-light);
    opacity: 0.9;
  }

  @media (max-width: 980px) {
    .shell__header { flex-direction: column; align-items: flex-start; }
    .flow__body { grid-template-columns: 1fr; }
    .flow__panels { grid-template-columns: 1fr; }
    .steps { position: static; flex-direction: row; flex-wrap: wrap; margin-bottom: 24px; top: 0; z-index: 10; padding: 12px; }
    .steps__item { flex: 1 1 180px; }
    .flow__header { flex-direction: column; }
  }
`;

type IntakeShellProps = {
  title: string;
  children: ReactNode;
  status?: 'draft' | 'submitted' | null;
  firmName?: string | null;
  branding?: {
    logo_url?: string;
    accent_color?: string;
  } | null;
};

export default function IntakeShell({ title, children, status, firmName, branding }: IntakeShellProps) {
  const safeAccent =
    branding?.accent_color && /^#[0-9A-Fa-f]{6}$/.test(branding.accent_color)
      ? branding.accent_color
      : undefined;
  const style = safeAccent
    ? ({ '--firm-accent': safeAccent } as CSSProperties)
    : undefined;

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className={`page ${safeAccent ? 'custom-accent' : ''}`}>
        <div className="shell">
          <IntakeHeader status={status} firmName={firmName ?? undefined} branding={branding ?? undefined} />
          <div className="shell__content">{children}</div>
          <IntakeFooter />
        </div>
      </div>
      <style jsx global>
        {globalStyles}
      </style>
    </>
  );
}
