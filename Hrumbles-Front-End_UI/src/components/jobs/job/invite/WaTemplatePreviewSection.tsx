// src/components/jobs/job/invite/WaTemplatePreviewSection.tsx
//
// Fully DYNAMIC WA template preview — no hardcoding.
// Reads any org's template components to render editable var fields
// and an accurate WhatsApp bubble preview.
//
// Variable slot layout mirrors buildComponents() in edge function:
//   slot[0]      → HEADER {{1}} (if header has vars)
//   slot[1..N]   → BODY   {{1..N}}
//   (URL token slot is the last in waTplVars but not shown as a user-editable field)

import React from 'react';

interface WaComponent {
  type:     string;
  text?:    string;
  format?:  string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
}

interface WaTemplate {
  name:         string;
  language:     string;
  display_name: string;
  status:       string;
  category:     string;
  components?:  WaComponent[];
}

interface WaTemplatePreviewSectionProps {
  waCfg:            any;
  waTpl:            string;
  waTplVars:        string[];
  setWaTplVars:     (vars: string[]) => void;
  showWaPreview:    boolean;
  setShowWaPreview: (v: boolean) => void;
  inp:              React.CSSProperties;
  lbl:              React.CSSProperties;
}

function extractVarCount(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  if (!m) return 0;
  return new Set(m.map(x => x.replace(/[{}]/g, ''))).size;
}

function renderPreview(text: string, vars: string[], offset: number): React.ReactNode {
  // Split on bold markers and {{N}} markers
  const parts = text.split(/(\*[^*]+\*|\{\{\d+\}\})/g);
  return parts.map((p, i) => {
    if (p.startsWith('*') && p.endsWith('*')) {
      return <strong key={i}>{p.slice(1, -1)}</strong>;
    }
    const vm = p.match(/^\{\{(\d+)\}\}$/);
    if (vm) {
      const n = parseInt(vm[1]) - 1 + offset;
      const val = vars[n];
      return (
        <span key={i} style={{
          background: val ? 'transparent' : '#FEF3C7',
          color: val ? 'inherit' : '#92400E',
          borderRadius: '3px', padding: val ? '0' : '0 2px',
        }}>
          {val || p}
        </span>
      );
    }
    return p;
  });
}

const WaTemplatePreviewSection: React.FC<WaTemplatePreviewSectionProps> = ({
  waCfg, waTpl, waTplVars, setWaTplVars,
  showWaPreview, setShowWaPreview, inp, lbl,
}) => {
  if (!waCfg || !waTpl) return null;

  const templates: WaTemplate[] = waCfg.templates ?? [];
  const tpl = templates.find(t => t.name === waTpl);
  if (!tpl) return null;

  const headerComp = tpl.components?.find(c => c.type === 'HEADER');
  const bodyComp   = tpl.components?.find(c => c.type === 'BODY');
  const footerComp = tpl.components?.find(c => c.type === 'FOOTER');
  const btnsComp   = tpl.components?.find(c => c.type === 'BUTTONS');

  const headerVarCount = headerComp?.text ? extractVarCount(headerComp.text) : 0;
  const bodyVarCount   = bodyComp?.text   ? extractVarCount(bodyComp.text)   : 0;
  const totalEditableVars = headerVarCount + bodyVarCount;

  // Build editable field descriptors
  type VarField = { slot: number; label: string; hint: string; isHeader: boolean; varN: number };
  const varFields: VarField[] = [];
  let slot = 0;
  for (let n = 1; n <= headerVarCount; n++) {
    varFields.push({ slot: slot++, label: `Header {{${n}}}`, hint: 'e.g. Company name', isHeader: true, varN: n });
  }
  for (let n = 1; n <= bodyVarCount; n++) {
    varFields.push({ slot: slot++, label: `Body {{${n}}}`, hint: `Variable ${n}`, isHeader: false, varN: n });
  }

  const headerOffset = 0;
  const bodyOffset   = headerVarCount;

  return (
    <div>
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setShowWaPreview(!showWaPreview)}
        style={{
          width: '100%', padding: '7px 10px', borderRadius: '7px',
          border: showWaPreview ? '1.5px solid #7C3AED' : '1px solid #E5E7EB',
          background: showWaPreview ? '#EDE9FE' : '#F9FAFB',
          color: showWaPreview ? '#7C3AED' : '#6B7280',
          fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>👁</span>
          Preview · {tpl.display_name}
          {totalEditableVars > 0 && (
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '99px', background: '#7C3AED', color: '#fff' }}>
              {totalEditableVars} var{totalEditableVars !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        <span>{showWaPreview ? '▲' : '▼'}</span>
      </button>

      {showWaPreview && (
        <div style={{ border: '1px solid #DDD6FE', borderRadius: '8px', overflow: 'hidden', marginTop: '6px' }}>

          {/* Variable editor */}
          {totalEditableVars > 0 && (
            <div style={{ padding: '10px 12px', background: '#FAFAFA', borderBottom: '1px solid #EDE9FE' }}>
              <p style={{ ...lbl, marginBottom: '6px', fontSize: '10px' }}>
                Fill in template variables
              </p>
              {varFields.map(({ slot: s, label, hint, isHeader }) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                  <span style={{
                    fontSize: '9px', fontWeight: 700,
                    color: isHeader ? '#92400E' : '#7C3AED',
                    background: isHeader ? '#FEF3C7' : '#EDE9FE',
                    padding: '2px 5px', borderRadius: '4px',
                    whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'monospace',
                    minWidth: '44px', textAlign: 'center',
                  }}>
                    {isHeader ? 'Header' : label.split(' ')[1]}
                  </span>
                  <input
                    type="text"
                    value={waTplVars[s] || ''}
                    onChange={e => {
                      const next = [...waTplVars];
                      next[s] = e.target.value;
                      setWaTplVars(next);
                    }}
                    placeholder={hint}
                    style={{ ...inp, padding: '4px 8px', fontSize: '11px', flex: 1 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bubble preview */}
          <div style={{ padding: '10px 12px', background: '#ECE5DD' }}>
            <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#5a4a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Preview
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '100%', background: '#D9FDD3',
                borderRadius: '10px 10px 2px 10px',
                overflow: 'hidden', fontSize: '12px', color: '#111',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}>
                {headerComp?.text && (
                  <div style={{ padding: '8px 10px 5px', fontWeight: 700, fontSize: '12px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    {renderPreview(headerComp.text, waTplVars, headerOffset)}
                  </div>
                )}
                {!headerComp?.text && headerComp?.format && headerComp.format !== 'TEXT' && (
                  <div style={{ padding: '8px 10px 5px', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    {headerComp.format === 'IMAGE' ? '🖼 Image' : headerComp.format === 'VIDEO' ? '🎥 Video' : '📄 Document'}
                  </div>
                )}
                {bodyComp?.text && (
                  <div style={{ padding: '8px 10px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {renderPreview(bodyComp.text, waTplVars, bodyOffset)}
                  </div>
                )}
                {footerComp?.text && (
                  <div style={{ padding: '2px 10px 8px', fontSize: '10px', color: '#888' }}>
                    {footerComp.text}
                  </div>
                )}
                {btnsComp?.buttons && btnsComp.buttons.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    {btnsComp.buttons.map((btn, i) => (
                      <div key={i} style={{
                        padding: '6px 10px', textAlign: 'center',
                        color: btn.type === 'PHONE_NUMBER' ? '#25D366' : '#0a7cff',
                        fontSize: '11px',
                        borderBottom: i < btnsComp.buttons!.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      }}>
                        {btn.type === 'PHONE_NUMBER' ? `📞 ${btn.text}` : `🔗 ${btn.text}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaTemplatePreviewSection;