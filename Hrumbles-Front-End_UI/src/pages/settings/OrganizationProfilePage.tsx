import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, MapPin, Phone, Mail, Globe, FileText, Camera,
  Edit3, Save, X, Loader2, CheckCircle, Upload, AlertCircle,
  Hash, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STATES_IN = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];

const emptyProfile = { company_name: '', logo_url: '', thumbnail_logo_url: '', website: '', email: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', zip_code: '', country: 'India', tax_id: '', pan_number: '', gstin: '' };

const OrganizationProfilePage: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [profile, setProfile] = useState<typeof emptyProfile>(emptyProfile);
  const [orgName, setOrgName] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof emptyProfile>(emptyProfile);
  const [draftPrefix, setDraftPrefix] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (organizationId) loadProfile(); }, [organizationId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [{ data: prof }, { data: org }] = await Promise.all([
        supabase.from('hr_organization_profile').select('*').eq('organization_id', organizationId).single(),
        supabase.from('hr_organizations').select('name, invoice_prefix').eq('id', organizationId).single(),
      ]);

      if (prof) {
        const p = { company_name: prof.company_name || '', logo_url: prof.logo_url || '', thumbnail_logo_url: prof.thumbnail_logo_url || '', website: prof.website || '', email: prof.email || '', phone: prof.phone || '', address_line1: prof.address_line1 || '', address_line2: prof.address_line2 || '', city: prof.city || '', state: prof.state || '', zip_code: prof.zip_code || '', country: prof.country || 'India', tax_id: prof.tax_id || '', pan_number: prof.pan_number || '', gstin: prof.gstin || '' };
        setProfile(p);
        setDraft(p);
        setProfileId(prof.id);
        setProfileExists(true);
      } else {
        setProfileExists(false);
        setIsEditing(true); // Auto-open edit mode if no profile yet
      }

      if (org) { setOrgName(org.name || ''); setInvoicePrefix(org.invoice_prefix || ''); setDraftPrefix(org.invoice_prefix || ''); }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally { setIsLoading(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `org_${organizationId}_logo.${ext}`;
      const { error: upErr } = await supabase.storage.from('organization_profiles').upload(filename, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('organization_profiles').getPublicUrl(filename);
      setDraft(p => ({ ...p, logo_url: publicUrl }));
      toast.success('Logo uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setIsUploading(false); }
  };

  const handleSave = async () => {
    if (!draft.company_name.trim()) { toast.error('Company name is required'); return; }
    setIsSaving(true);
    try {
      const payload = { organization_id: organizationId, company_name: draft.company_name, logo_url: draft.logo_url || null, thumbnail_logo_url: draft.thumbnail_logo_url || null, website: draft.website || null, email: draft.email || null, phone: draft.phone || null, address_line1: draft.address_line1 || null, address_line2: draft.address_line2 || null, city: draft.city || null, state: draft.state || null, zip_code: draft.zip_code || null, country: draft.country || null, tax_id: draft.tax_id || null, pan_number: draft.pan_number || null, gstin: draft.gstin || null, updated_at: new Date().toISOString() };

      const { error } = profileExists
        ? await supabase.from('hr_organization_profile').update(payload).eq('id', profileId!)
        : await supabase.from('hr_organization_profile').insert([payload]);
      if (error) throw error;

      // Update invoice_prefix if changed
      if (draftPrefix !== invoicePrefix) {
        await supabase.from('hr_organizations').update({ invoice_prefix: draftPrefix || null }).eq('id', organizationId);
        setInvoicePrefix(draftPrefix);
      }

      setProfile(draft);
      setProfileExists(true);
      setIsEditing(false);
      toast.success('Profile saved successfully');
      await loadProfile();
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setIsSaving(false); }
  };

  const handleCancel = () => { setDraft(profile); setDraftPrefix(invoicePrefix); setIsEditing(false); };

  const setDraftField = (field: keyof typeof emptyProfile, value: string) => setDraft(p => ({ ...p, [field]: value }));

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>;

  const displayData = isEditing ? draft : profile;
  const completionFields = ['company_name', 'logo_url', 'email', 'phone', 'address_line1', 'city', 'state', 'tax_id'];
  const completionScore = Math.round((completionFields.filter(f => (profile as any)[f]).length / completionFields.length) * 100);

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Organization Profile</h1>
          <p className="text-sm text-gray-500">Manage your company details — shown on all invoices and documents.</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}><X className="h-4 w-4 mr-2" />Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Edit3 className="h-4 w-4 mr-2" />Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* PROFILE COMPLETION */}
      {!isEditing && (
        <Card className={`border-none shadow-sm ${completionScore === 100 ? 'bg-green-50' : 'bg-amber-50'}`}>
          <CardContent className="p-4 flex items-center gap-4">
            {completionScore === 100 ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                <span className={`text-sm font-bold ${completionScore === 100 ? 'text-green-600' : 'text-amber-600'}`}>{completionScore}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${completionScore === 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${completionScore}%` }} />
              </div>
              {completionScore < 100 && <p className="text-xs text-amber-700 mt-1">Complete your profile to show accurate details on invoices.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LOGO & COMPANY NAME */}
      <Card className="shadow-sm border-none">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {displayData.logo_url ? (
                  <img src={displayData.logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <Building2 className="h-10 w-10 text-gray-300" />
                )}
              </div>
              {isEditing && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md hover:bg-purple-700 transition-colors"
                  >
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </>
              )}
            </div>

            {/* Company name + org name */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Organization (System Name)</p>
                <p className="text-sm text-gray-500 font-medium">{orgName}</p>
              </div>
              {isEditing ? (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Company Name (on invoices) *</Label>
                  <Input value={draft.company_name} onChange={e => setDraftField('company_name', e.target.value)} placeholder="Legal company name as it appears on invoices" className="text-lg font-bold h-11" />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{profile.company_name || <span className="text-gray-300 italic font-normal">Not set</span>}</h2>
                  {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="text-purple-600 text-sm font-medium hover:underline flex items-center gap-1 mt-1"><Globe className="h-3.5 w-3.5" />{profile.website}</a>}
                </div>
              )}
            </div>

            {/* Invoice prefix badge */}
            {!isEditing && invoicePrefix && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice Prefix</p>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-sm font-bold px-3 py-1">{invoicePrefix}/25-26/001</Badge>
              </div>
            )}
          </div>

          {/* Logo URL manual input in edit mode */}
          {isEditing && (
            <div className="mt-4 space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Logo URL (or upload above)</Label>
              <Input value={draft.logo_url} onChange={e => setDraftField('logo_url', e.target.value)} placeholder="https://example.com/logo.png" className="text-xs" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CONTACT DETAILS */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-700"><Phone className="h-4 w-4 text-purple-600" />Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Email</Label><Input value={draft.email} onChange={e => setDraftField('email', e.target.value)} placeholder="billing@company.com" type="email" /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Phone</Label><Input value={draft.phone} onChange={e => setDraftField('phone', e.target.value)} placeholder="+91 98765 43210" /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Website</Label><Input value={draft.website} onChange={e => setDraftField('website', e.target.value)} placeholder="https://www.company.com" /></div>
              </>
            ) : (
              <div className="space-y-3">
                {[{ icon: Mail, label: 'Email', val: profile.email }, { icon: Phone, label: 'Phone', val: profile.phone }, { icon: Globe, label: 'Website', val: profile.website }].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0"><Icon className="h-3.5 w-3.5 text-purple-600" /></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p><p className="text-sm text-gray-800">{val || <span className="text-gray-300 italic">Not set</span>}</p></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ADDRESS */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-700"><MapPin className="h-4 w-4 text-purple-600" />Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Address Line 1</Label><Input value={draft.address_line1} onChange={e => setDraftField('address_line1', e.target.value)} placeholder="Building, street, area" /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Address Line 2</Label><Input value={draft.address_line2} onChange={e => setDraftField('address_line2', e.target.value)} placeholder="Floor, block, locality (optional)" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">City</Label><Input value={draft.city} onChange={e => setDraftField('city', e.target.value)} placeholder="City" /></div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">State</Label>
                    <select value={draft.state} onChange={e => setDraftField('state', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select state</option>
                      {STATES_IN.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">ZIP Code</Label><Input value={draft.zip_code} onChange={e => setDraftField('zip_code', e.target.value)} placeholder="e.g. 400001" /></div>
                  <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Country</Label><Input value={draft.country} onChange={e => setDraftField('country', e.target.value)} placeholder="India" /></div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin className="h-3.5 w-3.5 text-purple-600" /></div>
                <div>
                  {profile.address_line1 || profile.city ? (
                    <div className="text-sm text-gray-800 space-y-0.5">
                      {profile.address_line1 && <p>{profile.address_line1}</p>}
                      {profile.address_line2 && <p>{profile.address_line2}</p>}
                      {(profile.city || profile.state) && <p>{[profile.city, profile.state, profile.zip_code].filter(Boolean).join(', ')}</p>}
                      {profile.country && <p>{profile.country}</p>}
                    </div>
                  ) : <p className="text-sm text-gray-300 italic">No address set</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TAX & COMPLIANCE */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-700"><Shield className="h-4 w-4 text-purple-600" />Tax & Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">GSTIN</Label><Input value={draft.gstin} onChange={e => setDraftField('gstin', e.target.value.toUpperCase())} placeholder="e.g. 29AABCT1234C1Z3" className="font-mono" /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">PAN Number</Label><Input value={draft.pan_number} onChange={e => setDraftField('pan_number', e.target.value.toUpperCase())} placeholder="e.g. AABCT1234C" className="font-mono" /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 uppercase">Tax ID (general)</Label><Input value={draft.tax_id} onChange={e => setDraftField('tax_id', e.target.value)} placeholder="Fallback tax ID shown on invoices" /></div>
              </>
            ) : (
              <div className="space-y-3">
                {[{ label: 'GSTIN', val: profile.gstin, mono: true }, { label: 'PAN Number', val: profile.pan_number, mono: true }, { label: 'Tax ID', val: profile.tax_id, mono: false }].map(({ label, val, mono }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">{label}</p>
                    {val ? <span className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono bg-gray-50 px-2 py-0.5 rounded text-xs' : ''}`}>{val}</span> : <span className="text-sm text-gray-300 italic">Not set</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* INVOICE SETTINGS */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-700"><FileText className="h-4 w-4 text-purple-600" />Invoice Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Invoice Prefix</Label>
                <Input value={draftPrefix} onChange={e => setDraftPrefix(e.target.value.toUpperCase())} placeholder="e.g. TL or ACME (max 6 chars)" maxLength={6} className="font-mono font-bold tracking-wider" />
                <p className="text-[10px] text-slate-400">Invoice numbers will appear as: <span className="font-mono font-bold text-purple-600">{draftPrefix || 'PREFIX'}/25-26/001</span></p>
                {!draftPrefix && <p className="text-[10px] text-amber-600">If left blank, initials of your company name will be used automatically.</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Invoice Number Format</p>
                  {invoicePrefix ? (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
                      <p className="text-xs text-purple-600 font-bold uppercase tracking-widest mb-1">Sample Invoice Number</p>
                      <p className="text-2xl font-black text-purple-700 font-mono">{invoicePrefix}/25-26/001</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Auto-generated prefix</p>
                      <p className="text-sm text-gray-500">Based on company name initials</p>
                      <Button variant="link" className="text-purple-600 text-xs mt-1 h-auto p-0" onClick={() => setIsEditing(true)}>Set a custom prefix →</Button>
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Financial Year</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {(() => { const today = new Date(); const m = today.getMonth() + 1; const y = today.getFullYear(); const start = m <= 3 ? y - 1 : y; return `${start}–${start + 1}`; })()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SAVE BUTTON BOTTOM (sticky convenience) */}
      {isEditing && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t py-4 flex justify-end gap-3 -mx-6 px-6 shadow-lg">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}><X className="h-4 w-4 mr-2" />Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrganizationProfilePage;