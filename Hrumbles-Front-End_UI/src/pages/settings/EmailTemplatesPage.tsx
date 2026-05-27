// src/pages/settings/EmailTemplatesPage.tsx
// Settings page for managing organisation email invite templates.
// Add route: <Route path="/settings/email-templates" element={<EmailTemplatesPage />} />
//
// Features:
//   - Lists global templates (read-only, with preview)
//   - Lists org templates (create / edit / delete)
//   - Scope filter tabs
//   - Live preview with sample substitution
//   - Variable chip reference panel

import React, { useState } from "react";
import {
  Plus, Star, Pencil, Trash2, Eye, ChevronDown, ChevronUp,
  Save, X, Sparkles, Check, Copy, Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  substituteVariables,
  bodyTextToHtml,
  computeExpiryLabel,
  TEMPLATE_VARIABLES,
  SCOPE_LABELS,
  type EmailTemplate,
  type TemplateScope,
  type CreateTemplateParams,
} from "@/components/CandidateSearch/hooks/useEmailTemplates";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

// ── Sample preview variables ──────────────────────────────────
const SAMPLE_VARS = {
  name:       "Priya Sharma",
  firstName:  "Priya",
  jobTitle:   "Senior Frontend Engineer",
  company:    "Acme Corp",
  expiryDate: computeExpiryLabel(7),
  location:   "Bangalore, India",
  experience: "4–7 yrs",
  skills:     "React, TypeScript, Node.js",
  salary:     "Upto 25 LPA",
  department: "Engineering",
};

const SCOPES = Object.keys(SCOPE_LABELS) as TemplateScope[];

const SCOPE_BADGE_COLORS: Record<TemplateScope, { bg: string; text: string }> = {
  general:      { bg: "#EDE9FE", text: "#6D28D9" },
  job_specific: { bg: "#DBEAFE", text: "#1D4ED8" },
  pipeline:     { bg: "#D1FAE5", text: "#065F46" },
  senior:       { bg: "#FEF3C7", text: "#92400E" },
  urgent:       { bg: "#FEE2E2", text: "#991B1B" },
};

// ── Sub-components ────────────────────────────────────────────

function ScopeBadge({ scope }: { scope: TemplateScope }) {
  const { bg, text } = SCOPE_BADGE_COLORS[scope] ?? { bg: "#F3F4F6", text: "#374151" };
  return (
    <span style={{ padding:"2px 8px", borderRadius:"99px", background:bg, color:text,
      fontSize:"10px", fontWeight:700, whiteSpace:"nowrap" }}>
      {SCOPE_LABELS[scope]}
    </span>
  );
}

function TemplatePreview({ template }: { template: EmailTemplate }) {
  const subject = substituteVariables(template.subject_line, SAMPLE_VARS);
  const html    = bodyTextToHtml(substituteVariables(template.body_text, SAMPLE_VARS));
  return (
    <div style={{ border:"1px solid #E5E7EB", borderRadius:"10px", overflow:"hidden", marginTop:"10px" }}>
      <div style={{ padding:"8px 12px", background:"#F3F4F6", borderBottom:"1px solid #E5E7EB" }}>
        <p style={{ margin:0, fontSize:"10px", fontWeight:700, color:"#6B7280", textTransform:"uppercase" }}>Preview</p>
        <p style={{ margin:"2px 0 0", fontSize:"12px", fontWeight:600, color:"#111827" }}>Subject: {subject}</p>
      </div>
      <div style={{ padding:"14px 16px", background:"#FAFAFA", fontSize:"13px", lineHeight:1.65 }}
        dangerouslySetInnerHTML={{ __html: html }}/>
      <div style={{ padding:"8px 12px", background:"#F9FAFB", borderTop:"1px solid #E5E7EB",
        fontSize:"10px", color:"#9CA3AF" }}>
        Sample data used for preview · actual values substituted at send time
      </div>
    </div>
  );
}

// ── Template card (global — read-only) ───────────────────────
function GlobalTemplateCard({ template }: { template: EmailTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const copySubject = () => {
    navigator.clipboard.writeText(template.subject_line);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ border:"1px solid #E5E7EB", borderRadius:"12px", overflow:"hidden",
      background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ padding:"12px 16px", display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", gap:"12px" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
            <Star size={12} color="#F59E0B" fill="#F59E0B"/>
            <p style={{ margin:0, fontSize:"13px", fontWeight:700, color:"#111827" }}>{template.name}</p>
            {template.is_default && (
              <span style={{ fontSize:"9px", fontWeight:700, padding:"1px 6px",
                borderRadius:"99px", background:"#EDE9FE", color:"#7C3AED" }}>Default</span>
            )}
          </div>
          {template.description && (
            <p style={{ margin:"0 0 6px", fontSize:"11px", color:"#6B7280" }}>{template.description}</p>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
            <ScopeBadge scope={template.scope as TemplateScope}/>
            <span style={{ fontSize:"10px", color:"#9CA3AF" }}>
              Subject: <em>{template.subject_line.slice(0, 60)}{template.subject_line.length > 60 ? "…" : ""}</em>
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
          <button onClick={copySubject} title="Copy subject"
            style={{ padding:"5px 8px", borderRadius:"6px", border:"1px solid #E5E7EB",
              background:"#F9FAFB", cursor:"pointer", display:"flex", alignItems:"center", gap:"3px",
              fontSize:"10px", color:"#6B7280", fontWeight:600 }}>
            {copied ? <Check size={10} color="#10B981"/> : <Copy size={10}/>}
            {copied ? "Copied" : "Copy Subject"}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            style={{ padding:"5px 8px", borderRadius:"6px", border:"1px solid #E5E7EB",
              background:"#F9FAFB", cursor:"pointer", display:"flex", alignItems:"center", gap:"3px",
              fontSize:"10px", color:"#7C3AED", fontWeight:600 }}>
            <Eye size={10}/> {expanded ? "Hide" : "Preview"}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"0 16px 16px" }}>
          <TemplatePreview template={template}/>
        </div>
      )}
    </div>
  );
}

// ── Template editor form ──────────────────────────────────────
interface EditorProps {
  initial?:     Partial<EmailTemplate>;
  organizationId: string;
  onSave:       (data: CreateTemplateParams & { id?: string }) => Promise<void>;
  onCancel:     () => void;
  saving:       boolean;
}

function TemplateEditor({ initial, onSave, onCancel, saving }: EditorProps) {
  const [name,    setName]    = useState(initial?.name         ?? "");
  const [desc,    setDesc]    = useState(initial?.description  ?? "");
  const [subject, setSubject] = useState(initial?.subject_line ?? "");
  const [body,    setBody]    = useState(initial?.body_text    ?? "");
  const [scope,   setScope]   = useState<TemplateScope>(initial?.scope as TemplateScope ?? "general");
  const [isDef,   setIsDef]   = useState(initial?.is_default   ?? false);
  const [preview, setPreview] = useState(false);

  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const insertVar = (key: string) => {
    const el = bodyRef.current;
    if (!el) { setBody(p => p + key); return; }
    const s = el.selectionStart ?? body.length, e = el.selectionEnd ?? body.length;
    const next = body.slice(0, s) + key + body.slice(e);
    setBody(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + key.length, s + key.length); }, 0);
  };

  const previewHtml = bodyTextToHtml(substituteVariables(body, SAMPLE_VARS));

  const inp: React.CSSProperties = { width:"100%", padding:"8px 10px", borderRadius:"7px",
    border:"1px solid #E5E7EB", fontSize:"12px", color:"#111827",
    background:"#fff", outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:"10px", fontWeight:700,
    color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:"4px" };

  return (
    <div style={{ border:"2px solid #7C3AED", borderRadius:"12px", overflow:"hidden",
      background:"#fff", boxShadow:"0 4px 20px rgba(124,58,237,0.15)" }}>
      {/* Editor header */}
      <div style={{ padding:"10px 14px", background:"linear-gradient(135deg,#6D28D9,#7C3AED)",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <p style={{ margin:0, fontSize:"12px", fontWeight:700, color:"#fff" }}>
          {initial?.id ? "Edit Template" : "Create New Template"}
        </p>
        <button onClick={onCancel}
          style={{ background:"rgba(255,255,255,0.15)", border:"none",
            borderRadius:"5px", padding:"4px", cursor:"pointer", display:"flex" }}>
          <X size={12} color="#fff"/>
        </button>
      </div>

      <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:"12px" }}>

        {/* Name + scope row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"10px", alignItems:"end" }}>
          <div>
            <label style={lbl}>Template Name <span style={{ color:"#EF4444" }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Tech Startup Invite" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Scope</label>
            <select value={scope} onChange={e => setScope(e.target.value as TemplateScope)}
              style={{ ...inp, width:"auto", paddingRight:"8px" }}>
              {SCOPES.map(s => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={lbl}>Description <span style={{ color:"#9CA3AF", textTransform:"none" }}>optional</span></label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="When to use this template…" style={inp}/>
        </div>

        {/* Subject */}
        <div>
          <label style={lbl}>Subject Line <span style={{ color:"#EF4444" }}>*</span></label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="e.g. You've been invited to apply — {jobTitle}" style={inp}/>
        </div>

        {/* Body */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
            <label style={{ ...lbl, margin:0 }}>Message Body <span style={{ color:"#EF4444" }}>*</span></label>
            <button onClick={() => setPreview(!preview)}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:"10px",
                color:"#7C3AED", fontWeight:600, display:"flex", alignItems:"center", gap:"3px" }}>
              <Eye size={10}/>{preview ? " Edit" : " Preview"}
            </button>
          </div>
          {preview ? (
            <div style={{ border:"1px solid #E5E7EB", borderRadius:"8px", padding:"12px",
              minHeight:"140px", background:"#FAFAFA", fontSize:"13px", lineHeight:1.65 }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}/>
          ) : (
            <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)} rows={7}
              placeholder={"Hi {firstName},\n\nYou've been invited to apply for {jobTitle}..."}
              style={{ ...inp, height:"auto", minHeight:"140px", resize:"vertical",
                lineHeight:1.65, fontFamily:"inherit" }}/>
          )}

          {/* Variable chips per scope */}
          {!preview && (
            <div style={{ marginTop:"8px" }}>
              <p style={{ margin:"0 0 6px", fontSize:"9px", fontWeight:700,
                color:"#9CA3AF", textTransform:"uppercase" }}>
                Available variables for "{SCOPE_LABELS[scope]}":
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
                {TEMPLATE_VARIABLES[scope].map(({ key, label }) => (
                  <button key={key} onClick={() => insertVar(key)}
                    style={{ padding:"3px 9px", borderRadius:"99px",
                      border:"1px solid #DDD6FE", background:"#EDE9FE",
                      color:"#7C3AED", fontSize:"10px", fontWeight:600,
                      cursor:"pointer", display:"flex", alignItems:"center", gap:"3px" }}>
                    <Sparkles size={8}/> {key}
                    <span style={{ fontSize:"9px", color:"#A78BFA" }}>· {label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Default toggle */}
        <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}>
          <input type="checkbox" checked={isDef} onChange={e => setIsDef(e.target.checked)}
            style={{ width:"14px", height:"14px", accentColor:"#7C3AED" }}/>
          <span style={{ fontSize:"12px", color:"#374151", fontWeight:500 }}>
            Set as default template (auto-selected in invite modal)
          </span>
        </label>

        {/* Actions */}
        <div style={{ display:"flex", gap:"8px", paddingTop:"4px" }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:"9px", borderRadius:"8px", border:"1px solid #E5E7EB",
              background:"#fff", fontSize:"12px", fontWeight:600, cursor:"pointer", color:"#374151" }}>
            Cancel
          </button>
          <button
            disabled={saving || !name.trim() || !subject.trim() || !body.trim()}
            onClick={() => onSave({
              id:          initial?.id,
              name:        name.trim(),
              description: desc.trim() || undefined,
              subject_line: subject.trim(),
              body_text:   body.trim(),
              scope,
              is_default:  isDef,
            })}
            style={{ flex:2, padding:"9px", borderRadius:"8px", border:"none",
              background:saving ? "#C4B5FD" : "linear-gradient(135deg,#6D28D9,#7C3AED)",
              color:"#fff", fontSize:"12px", fontWeight:700,
              cursor:saving || !name.trim() || !subject.trim() || !body.trim() ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
              boxShadow:saving ? "none" : "0 3px 12px rgba(124,58,237,0.3)",
              opacity: !name.trim() || !subject.trim() || !body.trim() ? 0.6 : 1 }}>
            <Save size={12}/> {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Org template card ─────────────────────────────────────────
function OrgTemplateCard({
  template, onEdit, onDelete, deleting,
}: { template: EmailTemplate; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [confirm,  setConfirm]  = useState(false);

  return (
    <div style={{ border:"1px solid #E5E7EB", borderRadius:"12px", overflow:"hidden",
      background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ padding:"12px 16px", display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", gap:"12px" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
            <Mail size={12} color="#7C3AED"/>
            <p style={{ margin:0, fontSize:"13px", fontWeight:700, color:"#111827" }}>{template.name}</p>
            {template.is_default && (
              <span style={{ fontSize:"9px", fontWeight:700, padding:"1px 6px",
                borderRadius:"99px", background:"#EDE9FE", color:"#7C3AED" }}>Default</span>
            )}
          </div>
          {template.description && (
            <p style={{ margin:"0 0 5px", fontSize:"11px", color:"#6B7280" }}>{template.description}</p>
          )}
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            <ScopeBadge scope={template.scope as TemplateScope}/>
            <span style={{ fontSize:"10px", color:"#9CA3AF" }}>
              {template.subject_line.slice(0, 55)}{template.subject_line.length > 55 ? "…" : ""}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:"5px", flexShrink:0, alignItems:"center" }}>
          <button onClick={() => setExpanded(!expanded)}
            style={{ padding:"5px 8px", borderRadius:"6px", border:"1px solid #E5E7EB",
              background:"#F9FAFB", cursor:"pointer", display:"flex", alignItems:"center", gap:"3px",
              fontSize:"10px", color:"#7C3AED", fontWeight:600 }}>
            <Eye size={10}/>{expanded ? " Hide" : " Preview"}
          </button>
          <button onClick={onEdit}
            style={{ padding:"5px 8px", borderRadius:"6px", border:"1px solid #E5E7EB",
              background:"#F9FAFB", cursor:"pointer", display:"flex", alignItems:"center", gap:"3px",
              fontSize:"10px", color:"#374151", fontWeight:600 }}>
            <Pencil size={10}/> Edit
          </button>
          {confirm ? (
            <div style={{ display:"flex", gap:"3px" }}>
              <button onClick={() => setConfirm(false)}
                style={{ padding:"5px 7px", borderRadius:"5px", border:"1px solid #E5E7EB",
                  background:"#fff", cursor:"pointer", fontSize:"10px", color:"#6B7280" }}>
                Cancel
              </button>
              <button onClick={() => { setConfirm(false); onDelete(); }} disabled={deleting}
                style={{ padding:"5px 7px", borderRadius:"5px", border:"none",
                  background:"#EF4444", cursor:"pointer", fontSize:"10px",
                  color:"#fff", fontWeight:700 }}>
                {deleting ? "…" : "Delete"}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)}
              style={{ padding:"5px 8px", borderRadius:"6px", border:"1px solid #FEE2E2",
                background:"#FFF5F5", cursor:"pointer", display:"flex", alignItems:"center", gap:"3px",
                fontSize:"10px", color:"#DC2626", fontWeight:600 }}>
              <Trash2 size={10}/> Delete
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"0 16px 16px" }}>
          <TemplatePreview template={template}/>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function EmailTemplatesPage() {
  const auth           = getAuthDataFromLocalStorage();
  const organizationId = auth?.organization_id ?? null;

  const { data: templates = [], isLoading } = useEmailTemplates(organizationId ?? undefined);
  const createMut = useCreateEmailTemplate(organizationId ?? "");
  const updateMut = useUpdateEmailTemplate(organizationId ?? "");
  const deleteMut = useDeleteEmailTemplate(organizationId ?? "");

  const [scopeFilter, setScopeFilter] = useState<TemplateScope | "all">("all");
  const [showCreate,  setShowCreate]  = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);

  const globalTemplates = templates.filter(t => t.is_global);
  const orgTemplates    = templates.filter(t => !t.is_global);

  const filteredGlobal = scopeFilter === "all" ? globalTemplates : globalTemplates.filter(t => t.scope === scopeFilter);
  const filteredOrg    = scopeFilter === "all" ? orgTemplates    : orgTemplates.filter(t => t.scope === scopeFilter);

  const handleSave = async (params: CreateTemplateParams & { id?: string }) => {
    try {
      if (params.id) {
        await updateMut.mutateAsync({ ...params, id: params.id });
        toast.success("Template updated");
        setEditingId(null);
      } else {
        await createMut.mutateAsync(params);
        toast.success("Template created");
        setShowCreate(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save template");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Template deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div style={{ padding:"28px 32px", maxWidth:"860px", margin:"0 auto",
      fontFamily:"inherit", minHeight:"100vh" }}>

      {/* Page header */}
      <div style={{ marginBottom:"24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"16px" }}>
          <div>
            <h1 style={{ margin:"0 0 4px", fontSize:"20px", fontWeight:800, color:"#111827" }}>
              Email Templates
            </h1>
            <p style={{ margin:0, fontSize:"13px", color:"#6B7280" }}>
              Manage email templates used when inviting candidates. Global templates are available to all
              organisations — create custom ones for your org's tone and branding.
            </p>
          </div>
          <button onClick={() => { setShowCreate(true); setEditingId(null); }}
            style={{ flexShrink:0, display:"flex", alignItems:"center", gap:"6px",
              padding:"9px 16px", borderRadius:"9px", border:"none",
              background:"linear-gradient(135deg,#6D28D9,#7C3AED)", color:"#fff",
              fontSize:"12px", fontWeight:700, cursor:"pointer",
              boxShadow:"0 3px 10px rgba(124,58,237,0.3)" }}>
            <Plus size={13}/> New Template
          </button>
        </div>
      </div>

      {/* Scope filter tabs */}
      <div style={{ display:"flex", gap:"4px", marginBottom:"20px",
        borderBottom:"2px solid #F3F4F6", paddingBottom:"0" }}>
        {(["all", ...SCOPES] as const).map(s => (
          <button key={s} onClick={() => setScopeFilter(s as any)}
            style={{ padding:"6px 14px", borderRadius:"7px 7px 0 0",
              border:"none", cursor:"pointer", fontSize:"11px", fontWeight:700,
              background:scopeFilter===s ? "#7C3AED" : "none",
              color:scopeFilter===s ? "#fff" : "#6B7280",
              marginBottom:"-2px",
              borderBottom:scopeFilter===s ? "2px solid #7C3AED" : "2px solid transparent" }}>
            {s === "all" ? "All" : SCOPE_LABELS[s as TemplateScope]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding:"40px", textAlign:"center", color:"#9CA3AF", fontSize:"13px" }}>
          Loading templates…
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"24px" }}>

          {/* ── Create form ── */}
          {showCreate && (
            <TemplateEditor
              organizationId={organizationId ?? ""}
              onSave={handleSave}
              onCancel={() => setShowCreate(false)}
              saving={createMut.isPending}
            />
          )}

          {/* ── My Templates ── */}
          <section>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:"12px" }}>
              <div>
                <h2 style={{ margin:"0 0 2px", fontSize:"14px", fontWeight:700, color:"#111827" }}>
                  My Templates
                </h2>
                <p style={{ margin:0, fontSize:"11px", color:"#6B7280" }}>
                  Custom templates for your organisation — editable and deletable.
                </p>
              </div>
              <span style={{ fontSize:"11px", color:"#9CA3AF" }}>
                {filteredOrg.length} template{filteredOrg.length !== 1 ? "s" : ""}
              </span>
            </div>
            {filteredOrg.length === 0 && !showCreate ? (
              <div style={{ padding:"28px", textAlign:"center", border:"2px dashed #E5E7EB",
                borderRadius:"12px", color:"#9CA3AF" }}>
                <Mail size={28} style={{ marginBottom:"8px", opacity:0.3 }}/>
                <p style={{ margin:"0 0 8px", fontSize:"13px" }}>No custom templates yet</p>
                <button onClick={() => setShowCreate(true)}
                  style={{ padding:"7px 16px", borderRadius:"7px", border:"none",
                    background:"#EDE9FE", color:"#7C3AED", fontSize:"12px",
                    fontWeight:700, cursor:"pointer" }}>
                  + Create your first template
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {filteredOrg.map(t => (
                  editingId === t.id ? (
                    <TemplateEditor
                      key={t.id}
                      initial={t}
                      organizationId={organizationId ?? ""}
                      onSave={handleSave}
                      onCancel={() => setEditingId(null)}
                      saving={updateMut.isPending}
                    />
                  ) : (
                    <OrgTemplateCard
                      key={t.id}
                      template={t}
                      onEdit={() => { setEditingId(t.id); setShowCreate(false); }}
                      onDelete={() => handleDelete(t.id)}
                      deleting={deleteMut.isPending && deleteMut.variables === t.id}
                    />
                  )
                ))}
              </div>
            )}
          </section>

          {/* ── Global Templates ── */}
          <section>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:"12px" }}>
              <div>
                <h2 style={{ margin:"0 0 2px", fontSize:"14px", fontWeight:700, color:"#111827" }}>
                  <Star size={13} color="#F59E0B" fill="#F59E0B" style={{ verticalAlign:"middle", marginRight:"5px" }}/>
                  Global Templates
                </h2>
                <p style={{ margin:0, fontSize:"11px", color:"#6B7280" }}>
                  Built-in professional templates available to all organisations — read-only.
                </p>
              </div>
              <span style={{ fontSize:"11px", color:"#9CA3AF" }}>
                {filteredGlobal.length} template{filteredGlobal.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {filteredGlobal.map(t => <GlobalTemplateCard key={t.id} template={t}/>)}
              {filteredGlobal.length === 0 && (
                <p style={{ textAlign:"center", color:"#9CA3AF", fontSize:"12px", padding:"20px" }}>
                  No global templates match the selected scope filter.
                </p>
              )}
            </div>
          </section>

          {/* ── Variables reference ── */}
          <section style={{ border:"1px solid #E5E7EB", borderRadius:"12px",
            background:"#F9FAFB", padding:"16px" }}>
            <h3 style={{ margin:"0 0 10px", fontSize:"12px", fontWeight:700,
              color:"#374151", textTransform:"uppercase", letterSpacing:"0.4px" }}>
              Variable Reference
            </h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"6px" }}>
              {TEMPLATE_VARIABLES.all.map(({ key, label }) => (
                <div key={key} style={{ display:"flex", alignItems:"center", gap:"8px",
                  padding:"5px 8px", background:"#fff", borderRadius:"6px",
                  border:"1px solid #E5E7EB" }}>
                  <code style={{ fontSize:"11px", fontWeight:700, color:"#7C3AED",
                    background:"#EDE9FE", padding:"1px 5px", borderRadius:"3px" }}>{key}</code>
                  <span style={{ fontSize:"11px", color:"#6B7280" }}>{label}</span>
                </div>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:"8px",
                padding:"5px 8px", background:"#fff", borderRadius:"6px",
                border:"1px solid #E5E7EB" }}>
                <code style={{ fontSize:"11px", fontWeight:700, color:"#7C3AED",
                  background:"#EDE9FE", padding:"1px 5px", borderRadius:"3px" }}>{"{location}"}</code>
                <span style={{ fontSize:"11px", color:"#6B7280" }}>Job location</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"8px",
                padding:"5px 8px", background:"#fff", borderRadius:"6px",
                border:"1px solid #E5E7EB" }}>
                <code style={{ fontSize:"11px", fontWeight:700, color:"#7C3AED",
                  background:"#EDE9FE", padding:"1px 5px", borderRadius:"3px" }}>{"{skills}"}</code>
                <span style={{ fontSize:"11px", color:"#6B7280" }}>Top skills</span>
              </div>
            </div>
            <p style={{ margin:"10px 0 0", fontSize:"10px", color:"#9CA3AF" }}>
              Job-specific variables ({"{location}"}, {"{skills}"}, {"{experience}"}, {"{salary}"}) are available
              when scope is set to <strong>Job-Specific</strong>.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

export default EmailTemplatesPage;