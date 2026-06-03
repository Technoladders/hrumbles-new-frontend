// src/pages/settings/TelephonySettings.tsx
// ============================================================
// Admin telephony configuration page
// Tabs: App Credentials | Recruiters | Routing Config | Blocklist
// ============================================================

import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Phone, Settings, Users, Shield, ChevronRight,
  CheckCircle, XCircle, Loader2, Plus, Trash2,
  Copy, Eye, EyeOff, RefreshCw, Wifi, WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'

const TABS = [
  { id: 'credentials', label: 'App Credentials', icon: Settings },
  { id: 'recruiters',  label: 'Recruiters',      icon: Users    },
  { id: 'routing',     label: 'Routing Config',  icon: Phone    },
  { id: 'blocklist',   label: 'Blocklist',        icon: Shield   },
] as const

type TabId = typeof TABS[number]['id']

const STATUS_COLORS = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  ON_BREAK:  'bg-amber-100 text-amber-700',
  OFFLINE:   'bg-slate-100 text-slate-600',
  ON_LEAVE:  'bg-blue-100 text-blue-700',
}

export default function TelephonySettings() {
  const [activeTab, setActiveTab] = useState<TabId>('credentials')
  const orgId = useSelector((s: any) => s.auth.organization_id)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Phone className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Telephony Settings</h1>
            <p className="text-sm text-slate-500">Configure TeleCMI WebRTC calling for your organization</p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {activeTab === 'credentials' && <CredentialsTab orgId={orgId} />}
        {activeTab === 'recruiters'  && <RecruitersTab  orgId={orgId} />}
        {activeTab === 'routing'     && <RoutingTab      orgId={orgId} />}
        {activeTab === 'blocklist'   && <BlocklistTab    orgId={orgId} />}
      </div>
    </div>
  )
}

// ── Tab: App Credentials ─────────────────────────────────────
function CredentialsTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ appid: '', secret: '', virtual_number: '', sbc_uri: 'sbcind.telecmi.com' })
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: cfg, isLoading } = useQuery({
    queryKey: ['telecmi-config', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('telecmi_routing_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()
      return data
    },
  })

  useEffect(() => {
    if (cfg) {
      setForm({
        appid: cfg.appid || '',
        secret: cfg.secret || '',
        virtual_number: cfg.virtual_number || '',
        sbc_uri: cfg.sbc_uri || 'sbcind.telecmi.com',
      })
    }
  }, [cfg])

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('telecmi_routing_config')
        .upsert({
          organization_id: orgId,
          appid: form.appid.trim(),
          secret: form.secret.trim(),
          virtual_number: form.virtual_number.trim(),
          sbc_uri: form.sbc_uri.trim(),
        }, { onConflict: 'organization_id' })

      if (error) throw error
      toast.success('Credentials saved')
      qc.invalidateQueries({ queryKey: ['telecmi-config', orgId] })
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const webhookBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

  if (isLoading) return <div className="p-6 text-slate-400 text-sm">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>TeleCMI App ID</Label>
          <Input
            value={form.appid}
            onChange={e => setForm(f => ({ ...f, appid: e.target.value }))}
            placeholder="e.g. 2222223"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Virtual Number (E.164)</Label>
          <Input
            value={form.virtual_number}
            onChange={e => setForm(f => ({ ...f, virtual_number: e.target.value }))}
            placeholder="e.g. 911203000000"
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>App Secret</Label>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={form.secret}
              onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="pr-10"
            />
            <button
              onClick={() => setShowSecret(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>SBC Region</Label>
          <select
            value={form.sbc_uri}
            onChange={e => setForm(f => ({ ...f, sbc_uri: e.target.value }))}
            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md"
          >
            <option value="sbcind.telecmi.com">India (sbcind)</option>
            <option value="sbcsg.telecmi.com">Asia (sbcsg)</option>
            <option value="sbcuk.telecmi.com">Europe (sbcuk)</option>
            <option value="sbcus.telecmi.com">Americas (sbcus)</option>
          </select>
        </div>
      </div>

      <Button
        onClick={save}
        disabled={saving || !form.appid || !form.secret}
        className="bg-violet-600 hover:bg-violet-700 text-white"
      >
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Credentials
      </Button>

      <Separator />

      {/* Webhook URLs to configure in TeleCMI */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">
          Configure these URLs in TeleCMI Dashboard
        </h3>
        <div className="space-y-3">
          {[
            { label: 'HTTP Call Flow (Routing Brain)', url: `${webhookBase}/telecmi-routing`, note: 'Phone Number → Call Flow → HTTP Script' },
            { label: 'CDR Webhook (Call Reports)',     url: `${webhookBase}/telecmi-cdr-webhook`, note: 'Phone Number → Settings → Webhooks → Call Report' },
            { label: 'Live Events Webhook',            url: `${webhookBase}/telecmi-cdr-webhook`, note: 'Phone Number → Settings → Webhooks → Notify' },
          ].map(({ label, url, note }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{note}</p>
                  <code className="text-xs text-violet-600 break-all block mt-1">{url}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied') }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Recruiters ──────────────────────────────────────────
function RecruitersTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient()
  const [provisionModal, setProvisionModal] = useState<any>(null)

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['telephony-recruiters', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, telecmi_agent_id, call_status, is_on_call, recruiter_skills, personal_mobile')
        .eq('organization_id', orgId)
        .order('first_name')
      return data || []
    },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Provision TeleCMI accounts for recruiters to enable calling.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ['telephony-recruiters', orgId] })}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm">Loading recruiters...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recruiter</TableHead>
              <TableHead>Agent ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp: any) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-slate-400">{emp.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {emp.telecmi_agent_id ? (
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-violet-700">
                      {emp.telecmi_agent_id}
                    </code>
                  ) : (
                    <span className="text-xs text-slate-400">Not provisioned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {emp.telecmi_agent_id ? (
                      <Badge className={cn('text-xs', STATUS_COLORS[emp.call_status as keyof typeof STATUS_COLORS] || STATUS_COLORS.OFFLINE)}>
                        {emp.call_status}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-slate-400">—</Badge>
                    )}
                    {emp.is_on_call && (
                      <Badge className="text-xs bg-emerald-100 text-emerald-700 animate-pulse">
                        On Call
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(emp.recruiter_skills || []).slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                    {(emp.recruiter_skills || []).length > 3 && (
                      <span className="text-[10px] text-slate-400">+{emp.recruiter_skills.length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProvisionModal(emp)}
                    className="text-xs"
                  >
                    {emp.telecmi_agent_id ? 'Re-provision' : 'Provision'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Provision Modal */}
      <ProvisionModal
        employee={provisionModal}
        onClose={() => { setProvisionModal(null); qc.invalidateQueries({ queryKey: ['telephony-recruiters', orgId] }) }}
      />
    </div>
  )
}

function ProvisionModal({ employee, onClose }: { employee: any; onClose: () => void }) {
  const [form, setForm] = useState({ extension: '', phone_number: '' })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (employee) {
      setForm({ extension: '', phone_number: employee.personal_mobile || '' })
      setResult(null)
    }
  }, [employee])

  const provision = async () => {
    if (!form.extension || !form.phone_number) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telecmi-provision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            employee_id: employee.id,
            extension: Number(form.extension),
            phone_number: form.phone_number,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setResult(data)
      toast.success(`Provisioned: ${data.agent_id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!employee} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee?.telecmi_agent_id ? 'Re-provision' : 'Provision'} TeleCMI
          </DialogTitle>
        </DialogHeader>
        {employee && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{employee.first_name} {employee.last_name}</p>
              <p className="text-slate-500">{employee.email}</p>
              {employee.telecmi_agent_id && (
                <p className="text-violet-600 font-mono text-xs mt-1">Current: {employee.telecmi_agent_id}</p>
              )}
            </div>

            {result ? (
              <div className="bg-emerald-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle className="h-4 w-4" /> Provisioned successfully
                </div>
                <p className="text-slate-600">Agent ID: <code className="text-violet-700">{result.agent_id}</code></p>
                <p className="text-slate-600">SBC: <code>{result.sbc_uri}</code></p>
                <p className="text-xs text-slate-400 mt-2">{result.note}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Extension (3 digits)</Label>
                    <Input
                      value={form.extension}
                      onChange={e => setForm(f => ({ ...f, extension: e.target.value }))}
                      placeholder="e.g. 101"
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile Number (E.164)</Label>
                    <Input
                      value={form.phone_number}
                      onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                      placeholder="919900001111"
                    />
                  </div>
                </div>
                <Button
                  onClick={provision}
                  disabled={saving || !form.extension || !form.phone_number}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {employee?.telecmi_agent_id ? 'Re-provision Account' : 'Create TeleCMI Account'}
                </Button>
              </>
            )}

            {result && (
              <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Tab: Routing Config ──────────────────────────────────────
function RoutingTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient()
  const [config, setConfig] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const { data: cfg } = useQuery({
    queryKey: ['telecmi-config', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('telecmi_routing_config').select('*').eq('organization_id', orgId).maybeSingle()
      return data
    },
  })

  useEffect(() => { if (cfg?.config) setConfig(cfg.config) }, [cfg])

  const save = async () => {
    setSaving(true)
    try {
      await supabase.from('telecmi_routing_config').update({ config }).eq('organization_id', orgId)
      toast.success('Routing config saved')
      qc.invalidateQueries({ queryKey: ['telecmi-config', orgId] })
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (!config) return <div className="p-6 text-slate-400 text-sm">Loading config...</div>

  return (
    <div className="p-6 space-y-6">
      {/* Business hours */}
      <section>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Business Hours</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Start Time</Label>
            <Input
              type="time"
              value={config.business_hours?.start || '09:00'}
              onChange={e => setConfig((c: any) => ({ ...c, business_hours: { ...c.business_hours, start: e.target.value } }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Time</Label>
            <Input
              type="time"
              value={config.business_hours?.end || '18:30'}
              onChange={e => setConfig((c: any) => ({ ...c, business_hours: { ...c.business_hours, end: e.target.value } }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Timezone</Label>
            <select
              value={config.timezone || 'Asia/Kolkata'}
              onChange={e => setConfig((c: any) => ({ ...c, timezone: e.target.value }))}
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            </select>
          </div>
        </div>
      </section>

      <Separator />

      {/* Toggles */}
      <section>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Features</h3>
        <div className="space-y-3">
          {[
            { key: 'blocklist_enabled', label: 'Blocklist filtering', desc: 'Reject calls from blocked numbers' },
            { key: 'ivr_enabled',       label: 'IVR skills menu',     desc: 'Route callers by department key-press' },
            { key: 'missed_call_notify',label: 'Missed call alerts',  desc: 'Browser notifications for missed calls' },
            { key: 'recording_enabled', label: 'Call recording',      desc: 'Record all calls (TeleCMI subscription required)' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <Switch
                checked={!!config[key]}
                onCheckedChange={v => setConfig((c: any) => ({ ...c, [key]: v }))}
              />
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* IVR Menu */}
      {config.ivr_enabled && (
        <section>
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">IVR Menu Keys</h3>
          <div className="space-y-2">
            {Object.entries(config.ivr_menu || {}).map(([digit, val]: any) => (
              <div key={digit} className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-100 text-violet-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {digit}
                </div>
                <Input
                  value={val.label}
                  onChange={e => setConfig((c: any) => ({
                    ...c,
                    ivr_menu: { ...c.ivr_menu, [digit]: { ...val, label: e.target.value, skill: e.target.value } }
                  }))}
                  placeholder="Department name"
                  className="h-8 text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400"
                  onClick={() => {
                    const m = { ...config.ivr_menu }
                    delete m[digit]
                    setConfig((c: any) => ({ ...c, ivr_menu: m }))
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextDigit = String(Object.keys(config.ivr_menu || {}).length + 1)
                setConfig((c: any) => ({
                  ...c,
                  ivr_menu: { ...c.ivr_menu, [nextDigit]: { label: '', skill: '' } }
                }))
              }}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Key
            </Button>
          </div>
        </section>
      )}

      <Button
        onClick={save}
        disabled={saving}
        className="bg-violet-600 hover:bg-violet-700 text-white"
      >
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Routing Config
      </Button>
    </div>
  )
}

// ── Tab: Blocklist ───────────────────────────────────────────
function BlocklistTab({ orgId }: { orgId: string }) {
  const qc = useQueryClient()
  const [newNumber, setNewNumber] = useState('')
  const [newReason, setNewReason] = useState('')

  const { data: blocked = [] } = useQuery({
    queryKey: ['telecmi-blocklist', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('telecmi_blocklist')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const add = async () => {
    if (!newNumber.trim()) return
    const { error } = await supabase.from('telecmi_blocklist').insert({
      organization_id: orgId,
      phone_number: newNumber.trim().replace(/\D/g, ''),
      reason: newReason.trim() || null,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Number blocked')
    setNewNumber(''); setNewReason('')
    qc.invalidateQueries({ queryKey: ['telecmi-blocklist', orgId] })
  }

  const remove = async (id: string) => {
    await supabase.from('telecmi_blocklist').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['telecmi-blocklist', orgId] })
    toast.success('Removed from blocklist')
  }

  return (
    <div className="p-6 space-y-4">
      {/* Add form */}
      <div className="flex gap-2">
        <Input
          value={newNumber}
          onChange={e => setNewNumber(e.target.value)}
          placeholder="Phone number (digits only)"
          className="flex-1"
        />
        <Input
          value={newReason}
          onChange={e => setNewReason(e.target.value)}
          placeholder="Reason (optional)"
          className="flex-1"
        />
        <Button onClick={add} disabled={!newNumber.trim()} className="bg-red-500 hover:bg-red-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> Block
        </Button>
      </div>

      {blocked.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No blocked numbers
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone Number</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(blocked as any[]).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-sm">{row.phone_number}</TableCell>
                <TableCell className="text-sm text-slate-500">{row.reason || '—'}</TableCell>
                <TableCell className="text-sm text-slate-400">
                  {new Date(row.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => remove(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}