
export const globalStyles = `
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
  button { font-family: inherit; }
`;
