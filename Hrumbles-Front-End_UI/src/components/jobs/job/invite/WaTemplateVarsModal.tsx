// src/components/jobs/job/invite/WaTemplateVarsModal.tsx
//
// RETHEMED: Removed WhatsApp branding (green #25D366, WA logo).
// Now uses Hrumbles brand purple (#7C3AED / #6D28D9) theme.
// Renamed references from "WhatsApp" to neutral "message" language.
// All functionality identical.

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

function extractVarCount(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  if (!m) return 0;
  return new Set(m.map(x => x.replace(/[{}]/g, ''))).size;
}

export function templateHasVars(tpl: WaTemplate): boolean {
  return (tpl.components || []).some(c => {
    if (!c.text) return false;
    return /\{\{\d+\}\}/.test(c.text);
  });
}

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
          background: val ? 'transparent' : '#FEF3C7',
          color:      val ? 'inherit'     : '#92400E',
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
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999998 }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 999999, width: 'calc(100vw - 24px)', maxWidth: '460px',
        maxHeight: '88vh',
        background: '#fff', borderRadius: '14px', boxShadow: '0 20px 60px rgba(109,40,217,0.18)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'inherit',
      }}>

        {/* Header — brand purple gradient */}
        <div style={{
          background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          {/* Template icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {template.display_name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
              Fill in {totalVars} variable{totalVars !== 1 ? 's' : ''} before sending
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px',
            padding: '5px', cursor: 'pointer', display: 'flex',
          }}>
            <X size={13} color="#fff" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Variable inputs */}
          {fields.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Template Variables
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fields.map(({ slot, isHeader, varN, label }) => (
                  <div key={slot}>
                    <label style={{
                      display: 'block', marginBottom: 4,
                      fontSize: '10px', fontWeight: 700,
                      color: isHeader ? '#92400E' : '#7C3AED',
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
                        border: `1px solid ${vars[slot] ? '#DDD6FE' : '#E5E7EB'}`,
                        background: vars[slot] ? '#FAFAFE' : '#fff',
                        fontSize: '12px', color: '#111827',
                        outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      autoFocus={slot === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live preview — neutral parchment bg, not WhatsApp green */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
              Message Preview
            </p>
            <div style={{ background: '#F3F4F6', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '100%',
                  background: '#EDE9FE',          /* brand purple tint instead of WA green */
                  borderRadius: '10px 10px 2px 10px',
                  overflow: 'hidden', fontSize: '12px', color: '#111',
                  boxShadow: '0 1px 3px rgba(109,40,217,0.12)',
                  border: '1px solid #DDD6FE',
                }}>
                  {headerComp?.text && (
                    <div style={{ padding: '8px 10px 5px', fontWeight: 700, borderBottom: '1px solid rgba(109,40,217,0.1)' }}>
                      {renderPreviewNode(headerComp.text, vars, 0)}
                    </div>
                  )}
                  {!headerComp?.text && headerComp?.format && headerComp.format !== 'TEXT' && (
                    <div style={{ padding: '8px 10px 5px', color: '#6B7280', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                      {headerComp.format === 'IMAGE' ? '🖼 Image' : headerComp.format === 'VIDEO' ? '🎥 Video' : '📄 Document'}
                    </div>
                  )}
                  {bodyComp?.text && (
                    <div style={{ padding: '8px 10px', lineHeight: 1.7, whiteSpace: 'pre-line' as const }}>
                      {renderPreviewNode(bodyComp.text, vars, headerVarCount)}
                    </div>
                  )}
                  {footerComp?.text && (
                    <div style={{ padding: '2px 10px 8px', fontSize: '10px', color: '#9CA3AF' }}>
                      {footerComp.text}
                    </div>
                  )}
                  {btnsComp?.buttons && btnsComp.buttons.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(109,40,217,0.1)' }}>
                      {btnsComp.buttons.map((btn, i) => (
                        <div key={i} style={{
                          padding: '6px 10px', textAlign: 'center' as const,
                          color: btn.type === 'PHONE_NUMBER' ? '#059669' : '#7C3AED',
                          fontSize: '11px', fontWeight: 600,
                          borderBottom: i < btnsComp.buttons!.length - 1 ? '1px solid rgba(109,40,217,0.08)' : 'none',
                        }}>
                          {btn.type === 'PHONE_NUMBER' ? `📞 ${btn.text}` : `🔗 ${btn.text}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Attribution */}
              {/* <div style={{ marginTop: 6, textAlign: 'right' as const, fontSize: 9, color: '#9CA3AF' }}>
                Powered by WhatsApp Business API
              </div> */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #F3F4F6',
          flexShrink: 0, display: 'flex', gap: 8,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '9px', borderRadius: '8px',
            border: '1px solid #E5E7EB', background: '#fff',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!allFilled || isSending}
            style={{
              flex: 2, padding: '9px', borderRadius: '8px', border: 'none',
              background: allFilled && !isSending
                ? 'linear-gradient(135deg,#6D28D9,#7C3AED)'
                : '#E5E7EB',
              color: allFilled && !isSending ? '#fff' : '#9CA3AF',
              fontSize: '12px', fontWeight: 700,
              cursor: allFilled && !isSending ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: allFilled && !isSending ? '0 3px 10px rgba(109,40,217,0.25)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {isSending
              ? <><Ring /> Sending…</>
              : <><Send size={13} /> Send Message</>
            }
          </button>
        </div>
      </div>
      <style>{`@keyframes tvm-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  return createPortal(modal, document.body);
};

function Ring() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12, flexShrink: 0,
      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
      borderRadius: '50%', animation: 'tvm-spin 0.7s linear infinite',
    }} />
  );
}

export default WaTemplateVarsModal;