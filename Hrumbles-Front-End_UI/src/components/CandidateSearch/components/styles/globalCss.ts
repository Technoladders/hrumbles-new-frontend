export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .cs-root *, .cs-root *::before, .cs-root *::after { box-sizing: border-box; }

  .cs-root {
    --bg:          #F2F4FA;
    --surface:     #FFFFFF;
    --sidebar:     #0B0F1A;
    --sidebar-2:   #111827;
    --accent:      #2563EB;
    --accent-2:    #1D4ED8;
    --amber:       #F59E0B;
    --green:       #10B981;
    --red:         #EF4444;
    --border:      rgba(0,0,0,0.07);
    --sb-border:   rgba(255,255,255,0.07);
    --text:        #0B0F1A;
    --text-2:      #64748B;
    --text-3:      #94A3B8;
    --font-d:      'Syne', sans-serif;
    --font-b:      'IBM Plex Sans', sans-serif;
    --font-m:      'IBM Plex Mono', monospace;
    font-family: var(--font-b);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  @keyframes cs-fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
  @keyframes cs-chipPop   { from{opacity:0;transform:scale(0.75)} to{opacity:1;transform:scale(1)} }
  @keyframes cs-slideIn   { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:none} }
  @keyframes cs-skel      { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes cs-spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes cs-dot1      { 0%,80%,100%{opacity:0} 40%{opacity:1} }
  @keyframes cs-dot2      { 0%,20%,100%{opacity:0} 60%{opacity:1} }
  @keyframes cs-dot3      { 0%,40%,100%{opacity:0} 80%{opacity:1} }

  .cs-row-in   { animation: cs-fadeUp  0.3s ease both; }
  .cs-chip-in  { animation: cs-chipPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both; }
  .cs-panel-in { animation: cs-slideIn 0.22s cubic-bezier(0.4,0,0.2,1) both; }
  .cs-skel-bg  { animation: cs-skel    1.6s ease-in-out infinite; }
  .cs-spinner  { animation: cs-spin    0.7s linear infinite; }
  .cs-dot1     { animation: cs-dot1    1.2s infinite; }
  .cs-dot2     { animation: cs-dot2    1.2s infinite; }
  .cs-dot3     { animation: cs-dot3    1.2s infinite; }

  .cs-root ::-webkit-scrollbar       { width:4px; height:4px; }
  .cs-root ::-webkit-scrollbar-track { background:transparent; }
  .cs-root ::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.13); border-radius:2px; }

  .cs-tag-hover:hover { opacity:0.8; cursor:pointer; }

  .cs-row:hover  { border-color:rgba(37,99,235,0.32)!important; }
  .cs-card:hover { border-color:rgba(37,99,235,0.32)!important; box-shadow:0 4px 20px rgba(0,0,0,0.08)!important; }

  .cs-sb-btn-pop:hover { background:rgba(255,255,255,0.09)!important; }
  .cs-qs-btn:hover     { border-color:#2563EB!important; color:#2563EB!important; background:#EFF6FF!important; }
  .cs-search-btn:not(:disabled):hover {
    background:#1D4ED8!important;
    transform:translateY(-1px)!important;
    box-shadow:0 6px 24px rgba(37,99,235,0.38)!important;
  }
`;