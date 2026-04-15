// src/components/jobs/job/invite/WaTemplateVarsModal.tsx
//
// Shown when a recruiter picks a template that has {{N}} variables
// in the float chat or inbox chat panel — instead of sending directly,
// show an editable preview with fields for each variable, then send.
//
// Used by: V2WhatsAppFloat, WhatsAppInbox ChatPanel

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send } from 'lucide-react';

interface WaComponent {
  type:     string;
  text?:    string;
  format?:  string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
}

export interface WaTemplate {
  name:         string;
  language:     string;
  display_name: string;
  status:       string;
  category:     string;
  components?:  WaComponent[];
}

interface WaTemplateVarsModalProps {
  template:   WaTemplate | null;
  onSend:     (tpl: WaTemplate, bodyVars: string[]) => void;
  onClose:    () => void;
  isSending:  boolean;
}

// Count unique {{N}} variables in a text
function extractVarCount(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  if (!m) return 0;
  return new Set(m.map(x => x.replace(/[{}]/g, ''))).size;
}

// Check if any component has variables
export function templateHasVars(tpl: WaTemplate): boolean {
  return (tpl.components || []).some(c => {
    if (!c.text) return false;
    return /\{\{\d+\}\}/.test(c.text);
  });
}

// Render text with {{N}} replaced by actual values (for preview)
function renderPreviewNode(text: string, vars: string[], offset: number): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*|\{\{\d+\}\})/g);
  return parts.map((p, i) => {
    if (p.startsWith('*') && p.endsWith('*')) {
      return <strong key={i}>{p.slice(1, -1)}</strong>;
    }
    const vm = p.match(/^\{\{(\d+)\}\}$/);
    if (vm) {
      const n   = parseInt(vm[1]) - 1 + offset;
      const val = vars[n];
      return (
        <span key={i} style={{
          background: val ? '#DCF8C620' : '#FEF3C7',
          color:      val ? 'inherit'  : '#92400E',
          borderRadius: '3px', padding: val ? '0' : '0 2px',
          fontWeight: val ? 'inherit' : 600,
        }}>
          {val || p}
        </span>
      );
    }
    return p;
  });
}

const WaTemplateVarsModal: React.FC<WaTemplateVarsModalProps> = ({
  template, onSend, onClose, isSending,
}) => {
  const [vars, setVars] = useState<string[]>([]);

  useEffect(() => {
    if (!template) return;
    const headerVarCount = template.components?.find(c => c.type === 'HEADER')?.text
      ? extractVarCount(template.components!.find(c => c.type === 'HEADER')!.text!)
      : 0;
    const bodyVarCount = template.components?.find(c => c.type === 'BODY')?.text
      ? extractVarCount(template.components!.find(c => c.type === 'BODY')!.text!)
      : 0;
    setVars(Array(headerVarCount + bodyVarCount).fill(''));
  }, [template]);

  if (!template) return null;

  const headerComp = template.components?.find(c => c.type === 'HEADER');
  const bodyComp   = template.components?.find(c => c.type === 'BODY');
  const footerComp = template.components?.find(c => c.type === 'FOOTER');
  const btnsComp   = template.components?.find(c => c.type === 'BUTTONS');

  const headerVarCount = headerComp?.text ? extractVarCount(headerComp.text) : 0;
  const bodyVarCount   = bodyComp?.text   ? extractVarCount(bodyComp.text)   : 0;
  const totalVars      = headerVarCount + bodyVarCount;

  // Build field descriptors
  type Field = { slot: number; isHeader: boolean; varN: number; label: string };
  const fields: Field[] = [];
  for (let n = 1; n <= headerVarCount; n++) {
    fields.push({ slot: n - 1, isHeader: true,  varN: n, label: `Header variable {{${n}}}` });
  }
  for (let n = 1; n <= bodyVarCount; n++) {
    fields.push({ slot: headerVarCount + n - 1, isHeader: false, varN: n, label: `Body variable {{${n}}}` });
  }

  const allFilled = fields.every(f => vars[f.slot]?.trim());

  const handleSend = () => {
    if (!allFilled || isSending) return;
    onSend(template, vars);
  };

  const modal = (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999998 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 999999, width: 'calc(100vw - 24px)', maxWidth: '480px',
        maxHeight: '88vh',
        background: '#fff', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'inherit',
      }}>

        {/* Header */}
        <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {template.display_name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
              Fill in {totalVars} variable{totalVars !== 1 ? 's' : ''} before sending
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex' }}>
            <X size={13} color="#fff" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Variable inputs */}
          {fields.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Template Variables
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fields.map(({ slot, isHeader, varN, label }) => (
                  <div key={slot}>
                    <label style={{
                      display: 'block', marginBottom: 4,
                      fontSize: '10px', fontWeight: 700, color: isHeader ? '#92400E' : '#7C3AED',
                    }}>
                      {label}
                    </label>
                    <input
                      type="text"
                      value={vars[slot] || ''}
                      onChange={e => {
                        const next = [...vars];
                        next[slot] = e.target.value;
                        setVars(next);
                      }}
                      placeholder={isHeader ? 'e.g. Company name' : `Value for {{${varN}}}`}
                      style={{
                        width: '100%', padding: '7px 10px', borderRadius: '7px',
                        border: `1px solid ${vars[slot] ? '#D1FAE5' : '#E5E7EB'}`,
                        fontSize: '12px', color: '#111827', background: '#fff',
                        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                      }}
                      autoFocus={slot === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live preview */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Message Preview
            </p>
            <div style={{ background: '#ECE5DD', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '100%', background: '#D9FDD3',
                  borderRadius: '10px 10px 2px 10px',
                  overflow: 'hidden', fontSize: '12px', color: '#111',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}>
                  {headerComp?.text && (
                    <div style={{ padding: '8px 10px 5px', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                      {renderPreviewNode(headerComp.text, vars, 0)}
                    </div>
                  )}
                  {!headerComp?.text && headerComp?.format && headerComp.format !== 'TEXT' && (
                    <div style={{ padding: '8px 10px 5px', color: '#6B7280', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                      {headerComp.format === 'IMAGE' ? '🖼 Image' : headerComp.format === 'VIDEO' ? '🎥 Video' : '📄 Document'}
                    </div>
                  )}
                  {bodyComp?.text && (
                    <div style={{ padding: '8px 10px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {renderPreviewNode(bodyComp.text, vars, headerVarCount)}
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
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6', flexShrink: 0, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!allFilled || isSending}
            style={{
              flex: 2, padding: '9px', borderRadius: '8px', border: 'none',
              background: allFilled && !isSending ? '#25D366' : '#CBD5E1',
              color: '#fff', fontSize: '12px', fontWeight: 700,
              cursor: allFilled && !isSending ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isSending
              ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'waf-spin 0.7s linear infinite' }} /> Sending…</>
              : <><Send size={13} /> Send Template</>
            }
          </button>
        </div>
      </div>
      <style>{`@keyframes waf-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  return createPortal(modal, document.body);
};

export default WaTemplateVarsModal;