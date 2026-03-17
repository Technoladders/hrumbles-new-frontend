// src/components/settings/WhatsAppSettings.tsx
// Per-org WhatsApp Business API configuration.
// Accessed from the organization settings menu.
// Stores credentials in hr_organizations.whatsapp_config (jsonb).

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  MessageSquare, Check, X, RefreshCw, Eye, EyeOff,
  ExternalLink, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WATemplate {
  name:         string;
  language:     string;
  display_name: string;
  status:       string;
  category:     string;
  components:   Array<{ type: string; text?: string; [key: string]: any }>;
}

interface WAConfig {
  phone_number_id:          string;
  access_token:             string;
  business_account_id:      string;
  display_phone_number:     string;
  is_active:                boolean;
  templates:                WATemplate[];
  default_template_name:    string;
  default_template_language: string;
}

const EMPTY_CONFIG: WAConfig = {
  phone_number_id:           '',
  access_token:              '',
  business_account_id:       '',
  display_phone_number:      '',
  is_active:                 false,
  templates:                 [],
  default_template_name:     '',
  default_template_language: 'en_US',
};

// ── Component ──────────────────────────────────────────────────────────────────

const WhatsAppSettings: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [config,         setConfig]         = useState<WAConfig>(EMPTY_CONFIG);
  const [isSaving,       setIsSaving]       = useState(false);
  const [isTesting,      setIsTesting]      = useState(false);
  const [isSyncing,      setIsSyncing]      = useState(false);
  const [testResult,     setTestResult]     = useState<'success' | 'error' | null>(null);
  const [testMsg,        setTestMsg]        = useState('');
  const [showToken,      setShowToken]      = useState(false);
  const [isLoading,      setIsLoading]      = useState(true);
  const [expandTemplate, setExpandTemplate] = useState<string | null>(null);

  // ── Load existing config ──────────────────────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      const { data } = await supabase
        .from('hr_organizations')
        .select('whatsapp_config')
        .eq('id', organizationId)
        .single();

      if (data?.whatsapp_config) {
        setConfig({ ...EMPTY_CONFIG, ...data.whatsapp_config });
      }
      setIsLoading(false);
    })();
  }, [organizationId]);

  // ── Save config ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!config.phone_number_id || !config.access_token || !config.business_account_id) {
      toast.error('Phone Number ID, Access Token and WABA ID are required');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('hr_organizations')
        .update({ whatsapp_config: config })
        .eq('id', organizationId);

      if (error) throw error;
      toast.success('WhatsApp configuration saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Test connection ───────────────────────────────────────────────────────
  const handleTest = async () => {
    if (!config.phone_number_id || !config.access_token) {
      toast.error('Enter Phone Number ID and Access Token first');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${config.phone_number_id}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${config.access_token}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      setConfig(prev => ({
        ...prev,
        display_phone_number: data.display_phone_number || prev.display_phone_number,
      }));
      setTestResult('success');
      setTestMsg(`Connected ✓ — ${data.verified_name} (${data.display_phone_number})`);
    } catch (err: any) {
      setTestResult('error');
      setTestMsg(err.message || 'Connection failed');
    } finally {
      setIsTesting(false);
    }
  };

  // ── Sync templates from Meta ──────────────────────────────────────────────
  const handleSyncTemplates = async () => {
    if (!config.business_account_id || !config.access_token) {
      toast.error('Enter WABA ID and Access Token first');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${config.business_account_id}/message_templates?status=APPROVED&limit=100`,
        { headers: { Authorization: `Bearer ${config.access_token}` } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const templates: WATemplate[] = (data.data || []).map((t: any) => ({
        name:         t.name,
        language:     t.language,
        display_name: t.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        status:       t.status,
        category:     t.category,
        components:   t.components || [],
      }));

      setConfig(prev => ({ ...prev, templates }));
      toast.success(`${templates.length} approved template${templates.length !== 1 ? 's' : ''} synced`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync templates');
    } finally {
      setIsSyncing(false);
    }
  };

  const upd = (key: keyof WAConfig, val: any) =>
    setConfig(prev => ({ ...prev, [key]: val }));

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
        <div style={spinStyle} />
        <p style={{ marginTop: '12px', fontSize: '13px' }}>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageSquare size={20} color="#16a34a" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
            WhatsApp Business API
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>
            Configure Meta Cloud API to send WhatsApp invites to candidates
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Active</label>
          <button
            onClick={() => upd('is_active', !config.is_active)}
            style={{
              width: '40px', height: '22px', borderRadius: '99px', border: 'none',
              background: config.is_active ? '#16a34a' : '#D1D5DB',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: '3px',
              left: config.is_active ? '21px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* Credentials card */}
      <Card title="API Credentials" subtitle="From Meta Business Manager → WhatsApp → API Setup">

        <Field label="Phone Number ID" required
          hint="Found in: Meta Business Manager → WhatsApp → API Setup">
          <input
            value={config.phone_number_id}
            onChange={e => upd('phone_number_id', e.target.value)}
            placeholder="e.g. 123456789012345"
            style={ipt}
          />
        </Field>

        <Field label="WhatsApp Business Account ID (WABA ID)" required
          hint="Business Settings → WhatsApp Accounts → select account → see Account ID">
          <input
            value={config.business_account_id}
            onChange={e => upd('business_account_id', e.target.value)}
            placeholder="e.g. 987654321098765"
            style={ipt}
          />
        </Field>

        <Field label="Permanent Access Token" required
          hint="System User Token with whatsapp_business_messaging + whatsapp_business_management permissions">
          <div style={{ position: 'relative' }}>
            <input
              type={showToken ? 'text' : 'password'}
              value={config.access_token}
              onChange={e => upd('access_token', e.target.value)}
              placeholder="EAAxxxxx..."
              style={{ ...ipt, paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              style={{ position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {/* Test result */}
        {testResult && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
            background: testResult === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${testResult === 'success' ? '#86EFAC' : '#FECACA'}`,
          }}>
            {testResult === 'success'
              ? <CheckCircle2 size={15} color="#16a34a" />
              : <AlertCircle  size={15} color="#DC2626" />}
            <span style={{
              fontSize: '13px', fontWeight: 600,
              color: testResult === 'success' ? '#15803D' : '#DC2626',
            }}>
              {testMsg}
            </span>
          </div>
        )}

        {/* Test + Save row */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button onClick={handleTest} disabled={isTesting} style={outBtn}>
            {isTesting ? <><Spin /> Testing...</> : 'Test Connection'}
          </button>
          <button onClick={handleSave} disabled={isSaving} style={primBtn}>
            {isSaving ? <><Spin color="#fff" /> Saving...</> : 'Save Credentials'}
          </button>
        </div>
      </Card>

      {/* Template card */}
      <Card
        title="Message Templates"
        subtitle="Sync approved templates from your WhatsApp Business Account"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="https://business.facebook.com/wa/manage/message-templates/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <ExternalLink size={12} /> Manage in Meta
            </a>
            <button onClick={handleSyncTemplates} disabled={isSyncing} style={outBtn}>
              {isSyncing
                ? <><Spin /> Syncing...</>
                : <><RefreshCw size={13} /> Sync Templates</>}
            </button>
          </div>
        }
      >
        {config.templates.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>
            <MessageSquare size={28} style={{ marginBottom: '8px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '13px' }}>
              No templates synced yet. Click "Sync Templates" to pull approved templates from Meta.
            </p>
          </div>
        ) : (
          <>
            {/* Default template selector */}
            <Field label="Default Template for Invites">
              <select
                value={config.default_template_name}
                onChange={e => upd('default_template_name', e.target.value)}
                style={ipt}
              >
                <option value="">— Select a default template —</option>
                {config.templates.map(t => (
                  <option key={`${t.name}_${t.language}`} value={t.name}>
                    {t.display_name} ({t.language}) — {t.category}
                  </option>
                ))}
              </select>
            </Field>

            {/* Template list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {config.templates.map(t => {
                const key      = `${t.name}_${t.language}`;
                const isOpen   = expandTemplate === key;
                const bodyComp = t.components?.find(c => c.type === 'BODY');
                const isDefault = config.default_template_name === t.name;

                return (
                  <div key={key} style={{
                    border: `1px solid ${isDefault ? '#DDD6FE' : '#F3F4F6'}`,
                    borderRadius: '8px',
                    background: isDefault ? '#FAFAFE' : '#FAFAFA',
                    overflow: 'hidden',
                  }}>
                    {/* Row */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', cursor: 'pointer' }}
                      onClick={() => setExpandTemplate(isOpen ? null : key)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                            {t.display_name}
                          </span>
                          {isDefault && (
                            <span style={{ padding: '1px 7px', borderRadius: '99px',
                              background: '#EDE9FE', color: '#7C3AED', fontSize: '10px', fontWeight: 700 }}>
                              Default
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                          {t.name} · {t.language} · {t.category}
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                        background: t.status === 'APPROVED' ? '#D1FAE5' : '#FEF3C7',
                        color:      t.status === 'APPROVED' ? '#065F46' : '#D97706',
                      }}>
                        {t.status}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); upd('default_template_name', t.name); upd('default_template_language', t.language); }}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                          border: '1px solid #E5E7EB', background: isDefault ? '#EDE9FE' : '#fff',
                          color: isDefault ? '#7C3AED' : '#6B7280', cursor: 'pointer',
                        }}
                      >
                        {isDefault ? '✓ Default' : 'Set Default'}
                      </button>
                      {isOpen ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                    </div>

                    {/* Expanded preview */}
                    {isOpen && bodyComp && (
                      <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 14px',
                        background: '#F9FAFB' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700,
                          color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Body Preview
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.7,
                          whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                          {bodyComp.text}
                        </p>
                        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#9CA3AF' }}>
                          Variables like {'{{1}}'} are filled in automatically when sending.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save after setting default */}
            <button onClick={handleSave} disabled={isSaving}
              style={{ ...primBtn, marginTop: '16px', width: '100%' }}>
              {isSaving ? <><Spin color="#fff" /> Saving...</> : 'Save Template Settings'}
            </button>
          </>
        )}
      </Card>

      {/* Guide card */}
      <Card title="Setup Guide" subtitle="How to get your Meta API credentials">
        <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            <>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#7C3AED' }}>Meta Business Manager</a> → Settings → System Users → Create System User</>,
            <>Assign WhatsApp Business Account to the System User with <strong>Full Control</strong></>,
            <>Generate a token with permissions: <code style={code}>whatsapp_business_messaging</code> and <code style={code}>whatsapp_business_management</code></>,
            <>Copy the <strong>Phone Number ID</strong> from WhatsApp → API Setup (not the phone number itself)</>,
            <>Copy the <strong>WABA ID</strong> from WhatsApp → Accounts — it is labeled "Account ID"</>,
            <>Create message templates in <strong>Message Templates</strong> tab (category: Utility), wait for approval, then sync here</>,
          ].map((step, i) => (
            <li key={i} style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.7 }}>
              {step}
            </li>
          ))}
        </ol>
      </Card>

    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, subtitle, action, children }: {
  title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F3F4F6',
      padding: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '16px', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>{title}</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>{subtitle}</p>
        </div>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700,
        color: '#374151', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9CA3AF' }}>{hint}</p>}
    </div>
  );
}

function Spin({ color = '#7C3AED' }: { color?: string }) {
  return (
    <span style={{ display: 'inline-block', width: '13px', height: '13px',
      border: `2px solid ${color}30`, borderTopColor: color,
      borderRadius: '50%', animation: 'wa-spin 0.7s linear infinite', flexShrink: 0 }} />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ipt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827',
  background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const outBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: '8px', border: '1px solid #E5E7EB',
  background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
};

const primBtn: React.CSSProperties = {
  padding: '10px 20px', borderRadius: '8px', border: 'none',
  background: '#7B43F1', color: '#fff', fontSize: '13px', fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
};

const spinStyle: React.CSSProperties = {
  width: '24px', height: '24px', border: '3px solid #EDE9FE',
  borderTopColor: '#7B43F1', borderRadius: '50%',
  animation: 'wa-spin 0.7s linear infinite', margin: '0 auto',
  display: 'block',
};

const code: React.CSSProperties = {
  padding: '1px 5px', borderRadius: '4px', background: '#F3F4F6',
  fontSize: '11px', fontFamily: 'monospace', color: '#374151',
};

// inject keyframe
if (typeof document !== 'undefined' && !document.getElementById('wa-spin-style')) {
  const s = document.createElement('style');
  s.id = 'wa-spin-style';
  s.textContent = '@keyframes wa-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

export default WhatsAppSettings;