// @ts-nocheck
// src/pages/candidates/CandidateApplicationPage.tsx
// Public page — no auth. /apply/:inviteToken
//
// Changes from previous version:
//  1. Resume upload → calls parse-invite-resume → prefills all form fields
//  2. Two new fields: Current Company + Current Designation
//  3. Form submit → process-invite-application (new function, no timeframe gate)
//  4. "Prefilled from resume" badge on auto-filled fields
//  5. Pipeline invites still use process-candidate-invite (unchanged)

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { City, State } from 'country-state-city';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import {
  FileText, User, Briefcase, DollarSign, ShieldCheck,
  Upload, X, MapPin, Link, Clock, CalendarDays,
  CheckCircle2, ChevronRight, Loader2, AlertTriangle, IndianRupee,
  Sparkles, Building2,
} from 'lucide-react';

console.log('[CandidateApplicationPage] MODULE LOADED ✅');

// ── Constants ─────────────────────────────────────────────────────────────────
const NOTICE_PERIODS = ['Immediate', '15 days', '30 days', '45 days', '60 days', '90 days'];
const EXP_YEARS      = Array.from({ length: 31 }, (_, i) => String(i));
const EXP_MONTHS     = Array.from({ length: 12 }, (_, i) => String(i));

// ── Design tokens ─────────────────────────────────────────────────────────────
const P = {
  p900: '#3B0764', p800: '#4C1D95', p700: '#5B21B6', p600: '#6D28D9',
  p500: '#7C3AED', p400: '#8B5CF6', p100: '#EDE9FE', p50:  '#F5F3FF',
  border: '#DDD6FE',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB',
  gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  green50: '#F0FDF4', green200: '#86EFAC', green800: '#065F46',
  red50: '#FFF5F5', red300: '#FCA5A5', red500: '#EF4444',
  amber50: '#FFFBEB', amber200: '#FDE68A', amber800: '#92400E',
  teal50: '#F0FDFA', teal200: '#99F6E4', teal700: '#0F766E',
};
const GRAD = `linear-gradient(135deg, ${P.p600}, ${P.p500})`;

const ipt = (err = false) => ({
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: `1.5px solid ${err ? P.red300 : P.gray200}`,
  fontSize: '13px', color: P.gray900,
  background: err ? P.red50 : '#fff',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
});

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = P.p500 }) {
  return <Loader2 size={size} color={color} style={{ animation: 'cap-spin 0.7s linear infinite', flexShrink: 0 }} />;
}

// ── "Prefilled from resume" badge ─────────────────────────────────────────────
function ParsedBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      marginLeft: '6px', fontSize: '9px', fontWeight: 700,
      padding: '2px 6px', borderRadius: '99px',
      background: P.teal50, color: P.teal700,
      border: `1px solid ${P.teal200}`,
    }}>
      <Sparkles size={8} /> From resume
    </span>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Sec({ icon: Icon, title, subtitle, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px', background: GRAD,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: `0 3px 10px rgba(124,58,237,0.35)`,
        }}>
          <Icon size={16} color="#fff" strokeWidth={2.2} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: P.gray900, lineHeight: 1.2 }}>{title}</h3>
          {subtitle && <p style={{ margin: 0, fontSize: '11px', color: P.gray400 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ background: P.gray50, borderRadius: '10px', border: `1px solid ${P.gray100}`, padding: '16px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Fld({ label, required, error, children, span2 = false, parsed = false }) {
  return (
    <div style={{ gridColumn: span2 ? '1 / -1' : undefined }}>
      <label style={{
        display: 'block', fontSize: '11px', fontWeight: 700,
        color: error ? P.red500 : P.gray700,
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
      }}>
        {label}
        {required && <span style={{ color: P.red500, marginLeft: '3px' }}>*</span>}
        {parsed && <ParsedBadge />}
      </label>
      {children}
      {error && (
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: P.red500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

// ── City search ───────────────────────────────────────────────────────────────
function CitySearchInput({ value, onChange, error }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const indianStates = useMemo(() => State.getStatesOfCountry('IN'), []);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const search = (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    const lq = q.toLowerCase();
    const stateHits = indianStates.filter(s => s.name.toLowerCase().includes(lq)).slice(0, 5).map(s => ({ label: s.name, sub: 'State' }));
    const cityHits  = q.length >= 3
      ? City.getAllCities().filter(c => c.countryCode === 'IN' && c.name.toLowerCase().includes(lq)).slice(0, 14).map(c => ({ label: c.name, sub: 'City' }))
      : [];
    const seen = new Set();
    setResults([...stateHits, ...cityHits].filter(r => { const k = r.label.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 20));
  };

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="cap-inp"
        value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => { if (results.length) setOpen(true); }}
        placeholder="Type to search city or state…"
        style={ipt(!!error)}
        autoComplete="off"
      />
      {open && results.length > 0 && <LocationDropdown results={results} onSelect={r => { setQuery(r.label); onChange(r.label); setOpen(false); }} />}
      {query.length === 1 && <p style={{ margin: '4px 0 0', fontSize: '11px', color: P.gray400 }}>Type 2+ characters to search</p>}
    </div>
  );
}

// ── Multi-city ────────────────────────────────────────────────────────────────
function MultiCityInput({ values, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const indianStates = useMemo(() => State.getStatesOfCountry('IN'), []);

  const search = (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    const lq = q.toLowerCase();
    const stateHits = indianStates.filter(s => s.name.toLowerCase().includes(lq) && !values.includes(s.name)).slice(0, 5).map(s => ({ label: s.name, sub: 'State' }));
    const cityHits  = q.length >= 3
      ? City.getAllCities().filter(c => c.countryCode === 'IN' && c.name.toLowerCase().includes(lq) && !values.includes(c.name)).slice(0, 12).map(c => ({ label: c.name, sub: 'City' }))
      : [];
    const seen = new Set();
    setResults([...stateHits, ...cityHits].filter(r => { const k = r.label.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 18));
  };

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={wrapRef}>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {values.map(v => (
            <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px 3px 10px', borderRadius: '99px', background: P.p100, color: P.p600, fontSize: '11px', fontWeight: 600, border: `1px solid ${P.border}` }}>
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.gray400, padding: '0 1px', lineHeight: 1, display: 'flex' }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          className="cap-inp"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); setOpen(true); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Search and add cities or states…"
          style={ipt(false)}
          autoComplete="off"
        />
        {open && results.length > 0 && (
          <LocationDropdown results={results} onSelect={r => { onChange([...values, r.label]); setQuery(''); setResults([]); setOpen(false); }} />
        )}
      </div>
    </div>
  );
}

// ── Shared location dropdown ──────────────────────────────────────────────────
function LocationDropdown({ results, onSelect }) {
  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999, background: '#fff', border: `1px solid ${P.gray200}`, borderRadius: '10px', boxShadow: '0 10px 28px rgba(0,0,0,0.13)', maxHeight: '230px', overflowY: 'auto' }}>
      {results.map((r, i) => (
        <button key={i} type="button"
          onMouseDown={e => { e.preventDefault(); onSelect(r); }}
          style={{ width: '100%', padding: '9px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', borderBottom: i < results.length - 1 ? `1px solid ${P.gray100}` : 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = P.p50}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', flexShrink: 0, background: r.sub === 'State' ? P.p100 : '#F3E8FF', color: r.sub === 'State' ? P.p600 : P.p800 }}>
            {r.sub}
          </span>
          <span style={{ color: P.gray900, fontWeight: 500 }}>{r.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateApplicationPage() {
  const { inviteToken } = useParams();

  const [pageState,   setPageState]  = useState('loading');
  const [errorMsg,    setErrorMsg]   = useState('');
  const [inviteData,  setInviteData] = useState(null);
  const [submitting,  setSubmitting] = useState(false);
  const [resumeUrl,   setResumeUrl]  = useState('');
  const [resumeFile,  setResumeFile] = useState('');
  const [uploading,   setUploading]  = useState(false);
  const [parsing,     setParsing]    = useState(false);   // AI resume parse in progress
  const [parseError,  setParseError] = useState('');      // non-fatal parse warning
  const [descOpen,    setDescOpen]   = useState(false);
  const [errs,        setErrs]       = useState({});
  const [consented,   setConsented]  = useState(false);

  // Track which fields were prefilled by AI so we can show the badge
  const [parsedFields, setParsedFields]   = useState<Set<string>>(new Set());
  // Raw AI output stored to pass to edge function for audit
  const [resumeParsedData, setResumeParsedData] = useState<Record<string, any> | null>(null);
  // Full resume text (passed to edge function for hr_talent_pool.resume_text)
  const [resumeText, setResumeText] = useState('');

  // Form fields
  const [firstName,           setFirstName]           = useState('');
  const [lastName,            setLastName]             = useState('');
  const [email,               setEmail]               = useState('');
  const [phone,               setPhone]               = useState('');
  const [currentLocation,     setCurrentLocation]     = useState('');
  const [preferredLocations,  setPreferredLocations]  = useState([]);
  const [totalExpYears,       setTotalExpYears]       = useState('');
  const [totalExpMonths,      setTotalExpMonths]      = useState('');
  const [relevantExpYears,    setRelevantExpYears]    = useState('');
  const [relevantExpMonths,   setRelevantExpMonths]   = useState('');
  const [currentSalary,       setCurrentSalary]       = useState('');
  const [expectedSalary,      setExpectedSalary]      = useState('');
  const [noticePeriod,        setNoticePeriod]        = useState('');
  const [lastWorkingDay,      setLastWorkingDay]       = useState('');
  const [linkedInUrl,         setLinkedInUrl]         = useState('');
  const [currentCompany,      setCurrentCompany]      = useState('');     // NEW
  const [currentDesignation,  setCurrentDesignation]  = useState('');     // NEW

  // ── Load invite ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inviteToken) { setErrorMsg('Invalid invite link.'); setPageState('error'); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('candidate_invites')
          .select(`
            id, status, expires_at, candidate_name, candidate_email,
            job_id, organization_id, created_by, invite_source, candidate_id,
            hr_jobs!candidate_invites_job_id_fkey(
              id, title, location, experience, skills, description,
              hiring_mode, job_type_category
            ),
            hr_organizations!candidate_invites_organization_id_fkey(name)
          `)
          .eq('invite_token', inviteToken)
          .single();

        if (error || !data) { setErrorMsg('This invite link is invalid or no longer exists.'); setPageState('error'); return; }
        if (new Date(data.expires_at) < new Date()) { setErrorMsg('This invite link has expired.'); setPageState('error'); return; }
        if (data.status === 'applied') { setErrorMsg('You have already submitted your consent for this position.'); setPageState('error'); return; }

        setInviteData(data);
        if (data.candidate_email) setEmail(data.candidate_email);
        if (data.candidate_name) {
          const parts = data.candidate_name.trim().split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
        supabase.functions.invoke('mark-invite-opened', { body: { token: inviteToken } }).catch(() => {});
        setPageState('form');
      } catch { setErrorMsg('Something went wrong. Please contact the recruiter.'); setPageState('error'); }
    })();
  }, [inviteToken]);

  // ── Prefill from AI parse result ──────────────────────────────────────────
  // Prefills a field ONLY if the field is currently empty.
  // Tracks which fields were AI-filled for the badge.
  const prefillFromParsed = (fields: Record<string, any>) => {
    const filled = new Set<string>();

    const trySet = (key: string, setter: (v: string) => void, val: any) => {
      if (val !== null && val !== undefined && val !== '') {
        setter(String(val));
        filled.add(key);
      }
    };
    const trySetIfEmpty = (key: string, current: string, setter: (v: string) => void, val: any) => {
      if (!current.trim() && val !== null && val !== undefined && val !== '') {
        setter(String(val));
        filled.add(key);
      }
    };

    // Always prefill these from resume (authoritative)
    if (fields.firstName)          { trySet('firstName',          setFirstName,          fields.firstName); }
    if (fields.lastName)           { trySet('lastName',           setLastName,           fields.lastName); }
    if (fields.currentCompany)     { trySet('currentCompany',     setCurrentCompany,     fields.currentCompany); }
    if (fields.currentDesignation) { trySet('currentDesignation', setCurrentDesignation, fields.currentDesignation); }
    if (fields.linkedInUrl)        { trySet('linkedInUrl',        setLinkedInUrl,        fields.linkedInUrl); }

    // Only prefill these if currently empty (invite may have pre-populated them)
    trySetIfEmpty('email',          email,          setEmail,          fields.email);
    trySetIfEmpty('phone',          phone || '',    setPhone,          fields.phone);
    trySetIfEmpty('currentLocation',currentLocation,setCurrentLocation,fields.currentLocation);
    trySetIfEmpty('noticePeriod',   noticePeriod,   setNoticePeriod,   fields.noticePeriod);

    // Salary — only if empty
    if (!currentSalary  && fields.currentSalary  != null) { setCurrentSalary(String(fields.currentSalary));  filled.add('currentSalary'); }
    if (!expectedSalary && fields.expectedSalary != null) { setExpectedSalary(String(fields.expectedSalary)); filled.add('expectedSalary'); }

    // Experience — only if not yet selected
    if (totalExpYears === '' && fields.totalExpYears != null) {
      setTotalExpYears(String(Math.max(0, Math.floor(fields.totalExpYears))));
      filled.add('totalExpYears');
    }
    if (totalExpMonths === '' && fields.totalExpMonths != null) {
      setTotalExpMonths(String(Math.max(0, Math.min(11, Math.floor(fields.totalExpMonths)))));
      filled.add('totalExpMonths');
    }

    setParsedFields(filled);
  };

  // ── Resume upload + AI parse ───────────────────────────────────────────────
  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      alert('PDF or DOCX only.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { alert('Max file size is 5 MB.'); return; }

    setUploading(true);
    setParseError('');
    setParsedFields(new Set());

    try {
      // Step 1: Upload to storage
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `invite-resumes/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from('candidate_resumes').upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('candidate_resumes').getPublicUrl(path);
      setResumeUrl(urlData.publicUrl);
      setResumeFile(file.name);

      // Step 2: AI parse for prefill (non-fatal)
      // Must use fetch directly — supabase.functions.invoke serialises the body
      // as JSON which loses binary file content, resulting in an empty body.
      setParsing(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || (supabase as any).supabaseUrl;
        const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || (supabase as any).supabaseKey;

        const parseRes = await fetch(
          `${SUPABASE_URL}/functions/v1/parse-invite-resume`,
          {
            method:  'POST',
            headers: {
              'Content-Type':  file.type,
              'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON}`,
              'apikey':        SUPABASE_ANON,
            },
            body: file,   // raw File bytes — no serialisation
          }
        );

        const parseData = await parseRes.json();

        if (!parseRes.ok || !parseData?.success) {
          const msg = parseData?.error || `Parse error ${parseRes.status}`;
          console.warn('[CandidateApplicationPage] resume parse non-fatal:', msg);
          setParseError('Could not parse resume — please fill in your details manually.');
        } else {
          setResumeParsedData(parseData.fields);
          prefillFromParsed(parseData.fields);
        }
      } catch (pe: any) {
        console.warn('[CandidateApplicationPage] parse exception:', pe.message);
        setParseError('Could not parse resume — please fill in your details manually.');
      } finally {
        setParsing(false);
      }

    } catch (e) {
      alert('Upload failed: ' + (e.message || 'Unknown'));
      setUploading(false);
    } finally {
      setUploading(false);
    }
  };

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!firstName.trim())               e.firstName          = 'First name is required';
    if (!lastName.trim())                e.lastName           = 'Last name is required';
    if (!email.trim())                   e.email              = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email            = 'Enter a valid email';
    if (!phone)                          e.phone              = 'Phone number is required';
    if (!currentLocation.trim())         e.currentLocation    = 'Current location is required';
    if (preferredLocations.length === 0) e.preferredLocations = 'Select at least one preferred location';
    if (totalExpYears === '')             e.totalExpYears      = 'Select years of experience';
    if (!currentSalary)                  e.currentSalary      = 'Current salary is required';
    if (!expectedSalary)                 e.expectedSalary     = 'Expected salary is required';
    if (isPipeline && !consented)        e.consent            = 'You must check the authorization box to continue';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate() || !inviteToken) return;
    setSubmitting(true);

    try {
      const formData = {
        firstName:              firstName.trim(),
        lastName:               lastName.trim(),
        email:                  email.trim(),
        phone:                  phone || undefined,
        currentLocation:        currentLocation || undefined,
        preferredLocations:     preferredLocations.length ? preferredLocations : undefined,
        totalExperience:        totalExpYears !== '' ? parseInt(totalExpYears, 10) : undefined,
        totalExperienceMonths:  totalExpMonths !== '' ? parseInt(totalExpMonths, 10) : undefined,
        relevantExperience:     relevantExpYears !== '' ? parseInt(relevantExpYears, 10) : undefined,
        relevantExperienceMonths: relevantExpMonths !== '' ? parseInt(relevantExpMonths, 10) : undefined,
        currentSalary:          currentSalary  ? parseFloat(currentSalary)  : undefined,
        expectedSalary:         expectedSalary ? parseFloat(expectedSalary) : undefined,
        noticePeriod:           noticePeriod   || undefined,
        lastWorkingDay:         lastWorkingDay || undefined,
        linkedInId:             linkedInUrl.trim() || undefined,
        resume:                 resumeUrl || undefined,
        // New fields
        currentCompany:         currentCompany.trim()     || undefined,
        currentDesignation:     currentDesignation.trim() || undefined,
        // AI parsed fields (skills, resumeText passed through for talent pool)
        skills:                 resumeParsedData?.skills  || [],
        resumeText:             resumeText || '',
        resumeParsedFields:     resumeParsedData          || null,
        ...(isPipeline ? { consentGiven: true, consentAt: new Date().toISOString() } : {}),
      };

      if (isPipeline) {
        // Pipeline still uses the original edge function — unchanged
        const { data, error } = await supabase.functions.invoke('process-candidate-invite', { body: { inviteToken, formData } });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
      } else {
        // Non-pipeline: use new targeted function (no timeframe gate, saves all fields)
        const { data, error } = await supabase.functions.invoke('process-invite-application', { body: { inviteToken, formData } });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
      }

      setPageState('success');
    } catch (e) {
      alert(e.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const job        = inviteData?.hr_jobs;
  const orgName    = inviteData?.hr_organizations?.name || 'the hiring team';
  const isPipeline = inviteData?.invite_source === 'pipeline';
  const locs       = job?.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
  const expMin     = job?.experience?.min?.value;
  const expMax     = job?.experience?.max?.value;
  const expText    = expMin != null && expMax != null ? `${expMin}–${expMax} yrs` : expMin != null ? `${expMin}+ yrs` : expMax != null ? `Up to ${expMax} yrs` : null;
  const descFull   = job?.description || '';
  const descShort  = descFull.length > 380 ? descFull.slice(0, 380) + '…' : descFull;
  const inrFmt     = (v) => v ? `₹ ${new Intl.NumberFormat('en-IN').format(Number(v))}` : '';

  const p = (key: string) => parsedFields.has(key); // shorthand for badge

  // ── Loading / Error / Success states ──────────────────────────────────────
  if (pageState === 'loading') return (
    <Shell><CenterBox>
      <Spinner size={32} />
      <p style={{ color: P.gray500, fontSize: '14px', margin: 0 }}>Validating your invite link…</p>
    </CenterBox></Shell>
  );

  if (pageState === 'error') return (
    <Shell><CenterBox>
      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <AlertTriangle size={28} color="#EF4444" />
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: P.gray900 }}>Link Unavailable</h2>
      <p style={{ color: P.gray500, maxWidth: '380px', lineHeight: 1.7, margin: 0, fontSize: '14px', textAlign: 'center' }}>{errorMsg}</p>
    </CenterBox></Shell>
  );

  if (pageState === 'success') return (
    <Shell><CenterBox>
      <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
        <CheckCircle2 size={36} color="#fff" />
      </div>
      <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: 800, color: P.gray900 }}>
        {isPipeline ? 'Consent Submitted!' : 'Application Submitted!'}
      </h2>
      <p style={{ color: P.gray500, maxWidth: '440px', lineHeight: 1.75, margin: '0 0 28px', fontSize: '14px', textAlign: 'center' }}>
        {isPipeline
          ? <><strong style={{ color: P.p500 }}>{orgName}</strong> will now present your profile for <strong style={{ color: P.p500 }}>{job?.title}</strong>. The recruiter will be in touch shortly.</>
          : <>Thank you for applying for <strong style={{ color: P.p500 }}>{job?.title}</strong>. The hiring team will review and reach out soon.</>
        }
      </p>
      <div style={{ padding: '12px 22px', borderRadius: '10px', background: P.p50, border: `1px solid ${P.border}` }}>
        <p style={{ margin: 0, fontSize: '12px', color: P.p500, fontWeight: 600 }}>Powered by Xrilic.ai · Candidate Platform</p>
      </div>
    </CenterBox></Shell>
  );

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <Shell>
      <style>{`
        @keyframes cap-spin { to { transform: rotate(360deg); } }
        .cap-inp:focus { border-color: ${P.p500} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .cap-upload:hover { border-color: ${P.p500} !important; background: ${P.p50} !important; }
        .cap-phone .PhoneInput { display: flex; align-items: center; gap: 0; }
        .cap-phone .PhoneInputCountry {
          padding: 0 10px; border: 1.5px solid ${P.gray200}; border-right: none;
          border-radius: 8px 0 0 8px; background: ${P.gray50};
          height: 40px; display: flex; align-items: center;
        }
        .cap-phone .PhoneInputCountry:focus-within { border-color: ${P.p500}; }
        .cap-phone input[type=tel] {
          flex: 1; padding: 9px 12px; border: 1.5px solid ${P.gray200};
          border-left: none; border-radius: 0 8px 8px 0;
          font-size: 13px; color: ${P.gray900}; outline: none;
          font-family: inherit; height: 40px; box-sizing: border-box;
        }
        .cap-phone input[type=tel]:focus { border-color: ${P.p500}; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .cap-phone-err .PhoneInputCountry { border-color: ${P.red300}; background: ${P.red50}; }
        .cap-phone-err input[type=tel] { border-color: ${P.red300}; background: ${P.red50}; }
        @media (max-width: 700px) {
          .cap-cols    { flex-direction: column !important; }
          .cap-sidebar { width: 100% !important; position: relative !important; max-height: none !important; border-right: none !important; border-bottom: 1px solid ${P.border} !important; }
          .cap-form    { max-height: none !important; }
          .cap-grid    { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="cap-cols" style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch' }}>

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="cap-sidebar" style={{
          width: '350px', flexShrink: 0,
          background: `linear-gradient(160deg, ${P.p50} 0%, ${P.p100} 100%)`,
          borderRight: `1px solid ${P.border}`,
          padding: '32px 24px', position: 'sticky', top: 0,
          maxHeight: '100vh', overflowY: 'auto',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '99px', background: 'white', border: `1px solid ${P.border}`, boxShadow: `0 2px 8px rgba(124,58,237,0.12)` }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: GRAD }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: P.p500 }}>Xrilic.ai</span>
            </div>
          </div>

          {job ? (<>
            <h2 style={{ margin: '0 0 12px', fontSize: '21px', fontWeight: 800, color: P.p800, lineHeight: 1.3 }}>{job.title}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {isPipeline && <JTag text="Consent Required" bg="#FEF3C7" color={P.amber800} />}
              {job.hiring_mode && <JTag text={job.hiring_mode} bg="white" color={P.gray700} />}
              {job.job_type_category && <JTag text={job.job_type_category} bg="white" color={P.gray700} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {locs.length > 0 && <MetaChip icon={MapPin}>{locs.join(' · ')}</MetaChip>}
              {expText && <MetaChip icon={Briefcase}>{expText} experience required</MetaChip>}
            </div>
            {isPipeline && (
              <div style={{ background: P.amber50, border: `1px solid ${P.amber200}`, borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 5px', fontSize: '12px', fontWeight: 700, color: P.amber800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={13} /> Consent Required
                </p>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#78350F', lineHeight: 1.65 }}>
                  <strong>{orgName}</strong> would like to present your profile for this position.
                </p>
              </div>
            )}
            <div style={{ height: '1px', background: `rgba(109,40,217,0.12)`, margin: '0 0 20px' }} />
            {job.skills?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <SideLabel>Required Skills</SideLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {job.skills.map((s, i) => (
                    <span key={i} style={{ padding: '4px 10px', borderRadius: '99px', background: 'white', color: P.p800, fontSize: '11px', fontWeight: 500, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {descFull && (
              <div>
                <SideLabel>About the Role</SideLabel>
                <p style={{ margin: 0, fontSize: '12px', color: P.p800, lineHeight: 1.75, whiteSpace: 'pre-line', opacity: 0.85 }}>
                  {descOpen ? descFull : descShort}
                </p>
                {descFull.length > 380 && (
                  <button onClick={() => setDescOpen(!descOpen)} style={{ marginTop: '8px', background: 'none', border: 'none', color: P.p500, fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {descOpen ? '↑ Show less' : '↓ Read more'}
                  </button>
                )}
              </div>
            )}
          </>) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: P.p400, opacity: 0.6 }}>
              <Briefcase size={36} style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Loading job details…</p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Form ──────────────────────────────────────────── */}
        <div className="cap-form" style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: '100vh', padding: '32px 32px 56px', background: '#fff' }}>

          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', flexShrink: 0 }}>
                {isPipeline ? <ShieldCheck size={22} color="#fff" /> : <FileText size={22} color="#fff" />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: P.gray900 }}>
                  {isPipeline ? 'Authorize Your Profile' : 'Submit Your Application'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: P.gray400 }}>
                  {isPipeline
                    ? `Confirm your details, then authorize ${orgName} to share your profile`
                    : 'Upload your resume to auto-fill the form, then review and submit'}
                </p>
              </div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              {(isPipeline
                ? ['Resume', 'Personal', 'Current Role', 'Professional', 'Compensation', 'Authorize']
                : ['Resume', 'Personal', 'Current Role', 'Professional', 'Compensation']
              ).map((s, i, arr) => (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', fontWeight: 700, boxShadow: `0 2px 6px rgba(124,58,237,0.3)` }}>{i + 1}</div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: P.p600 }}>{s}</span>
                  </div>
                  {i < arr.length - 1 && <ChevronRight size={12} color={P.gray200} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* ── 1. Resume ── */}
            <Sec icon={FileText} title="Resume" subtitle="Upload your CV — AI will auto-fill the form below (PDF or DOCX, max 5 MB)">
              <input id="res-inp" type="file" accept=".pdf,.docx,.doc" onChange={handleResumeChange} disabled={uploading || parsing} style={{ display: 'none' }} />

              {/* Parse progress banner */}
              {parsing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', marginBottom: '12px', borderRadius: '10px', background: P.p50, border: `1px solid ${P.border}` }}>
                  <Spinner size={16} />
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: P.p700 }}>Analysing resume with AI…</p>
                    <p style={{ margin: 0, fontSize: '11px', color: P.p400 }}>Fields below will be filled automatically in a moment</p>
                  </div>
                </div>
              )}

              {/* Parse success banner — shown after AI fills fields */}
              {!parsing && parsedFields.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', marginBottom: '12px', borderRadius: '10px', background: P.teal50, border: `1px solid ${P.teal200}` }}>
                  <Sparkles size={16} color={P.teal700} />
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: P.teal700 }}>
                      {parsedFields.size} field{parsedFields.size !== 1 ? 's' : ''} prefilled from your resume
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#0D9488' }}>Review and edit anything that needs updating</p>
                  </div>
                </div>
              )}

              {/* Parse warning */}
              {parseError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', background: P.amber50, border: `1px solid ${P.amber200}` }}>
                  <AlertTriangle size={14} color={P.amber800} />
                  <p style={{ margin: 0, fontSize: '11px', color: P.amber800 }}>{parseError}</p>
                </div>
              )}

              {resumeUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: `1.5px solid ${P.green200}`, borderRadius: '10px', background: P.green50 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} color={P.green800} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: P.green800 }}>Resume uploaded</p>
                      <p style={{ margin: '1px 0 0', fontSize: '11px', color: P.gray500 }}>{resumeFile}</p>
                    </div>
                  </div>
                  <label htmlFor="res-inp" style={{ fontSize: '12px', color: P.p500, fontWeight: 700, cursor: uploading || parsing ? 'not-allowed' : 'pointer', padding: '6px 12px', borderRadius: '7px', border: `1px solid ${P.border}`, background: 'white', opacity: uploading || parsing ? 0.5 : 1 }}>
                    Replace
                  </label>
                </div>
              ) : (
                <label htmlFor="res-inp" className="cap-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 16px', border: `2px dashed ${P.border}`, borderRadius: '12px', cursor: uploading ? 'not-allowed' : 'pointer', background: P.gray50, transition: 'all 0.15s' }}>
                  {uploading ? (
                    <><Spinner size={28} /><span style={{ fontSize: '13px', color: P.p500, fontWeight: 600 }}>Uploading…</span></>
                  ) : (
                    <>
                      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: P.p100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload size={24} color={P.p500} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: P.gray700 }}>Upload resume to auto-fill the form</p>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: P.gray400 }}>PDF or DOCX · Maximum 5 MB · AI-powered field extraction</p>
                      </div>
                      <span style={{ padding: '8px 20px', borderRadius: '8px', background: GRAD, color: 'white', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
                        Browse Files
                      </span>
                    </>
                  )}
                </label>
              )}
            </Sec>

            {/* ── 2. Personal Details ── */}
            <Sec icon={User} title="Personal Details" subtitle="Your name and contact information">
              <div className="cap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Fld label="First Name" required error={errs.firstName} parsed={p('firstName')}>
                  <input className="cap-inp" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" style={ipt(!!errs.firstName)} />
                </Fld>
                <Fld label="Last Name" required error={errs.lastName} parsed={p('lastName')}>
                  <input className="cap-inp" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" style={ipt(!!errs.lastName)} />
                </Fld>
                <Fld label="Email Address" required error={errs.email} parsed={p('email')}>
                  <input className="cap-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={ipt(!!errs.email)} />
                </Fld>
                <Fld label="Phone Number" required error={errs.phone} parsed={p('phone')}>
                  <div className={`cap-phone${errs.phone ? ' cap-phone-err' : ''}`}>
                    <PhoneInput international defaultCountry="IN" placeholder="Enter phone number" value={phone} onChange={setPhone} />
                  </div>
                </Fld>
                <Fld label="Current Location" required error={errs.currentLocation} parsed={p('currentLocation')}>
                  <CitySearchInput value={currentLocation} onChange={setCurrentLocation} error={errs.currentLocation} />
                </Fld>
                <Fld label="Preferred Locations" required error={errs.preferredLocations}>
                  <MultiCityInput values={preferredLocations} onChange={setPreferredLocations} />
                  {errs.preferredLocations && (
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: P.red500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={11} /> {errs.preferredLocations}
                    </p>
                  )}
                </Fld>
              </div>
            </Sec>

            {/* ── 3. Current Role (NEW SECTION) ── */}
            <Sec icon={Building2} title="Current Role" subtitle="Your current employer and position">
              <div className="cap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Fld label="Current Company" parsed={p('currentCompany')}>
                  <input className="cap-inp" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="e.g. Infosys, TCS…" style={ipt(false)} />
                </Fld>
                <Fld label="Current Designation" parsed={p('currentDesignation')}>
                  <input className="cap-inp" value={currentDesignation} onChange={e => setCurrentDesignation(e.target.value)} placeholder="e.g. Senior Engineer" style={ipt(false)} />
                </Fld>
                <Fld label="LinkedIn Profile URL" span2 parsed={p('linkedInUrl')}>
                  <div style={{ position: 'relative' }}>
                    <Link size={14} color={P.gray400} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input className="cap-inp" type="url" value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" style={{ ...ipt(false), paddingLeft: '34px' }} />
                  </div>
                </Fld>
              </div>
            </Sec>

            {/* ── 4. Professional Background ── */}
            <Sec icon={Briefcase} title="Professional Background" subtitle="Your experience and work history">
              <div className="cap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Fld label="Total Experience (Years)" required error={errs.totalExpYears} parsed={p('totalExpYears')}>
                  <select className="cap-inp" value={totalExpYears} onChange={e => setTotalExpYears(e.target.value)} style={ipt(!!errs.totalExpYears)}>
                    <option value="">Select years…</option>
                    {EXP_YEARS.map(y => <option key={y} value={y}>{y} {y === '1' ? 'year' : 'years'}</option>)}
                  </select>
                </Fld>
                <Fld label="Total Experience (Months)" parsed={p('totalExpMonths')}>
                  <select className="cap-inp" value={totalExpMonths} onChange={e => setTotalExpMonths(e.target.value)} style={ipt(false)}>
                    <option value="">Select months…</option>
                    {EXP_MONTHS.map(m => <option key={m} value={m}>{m} {m === '1' ? 'month' : 'months'}</option>)}
                  </select>
                </Fld>
                <Fld label="Relevant Experience (Years)">
                  <select className="cap-inp" value={relevantExpYears} onChange={e => setRelevantExpYears(e.target.value)} style={ipt(false)}>
                    <option value="">Select years…</option>
                    {EXP_YEARS.map(y => <option key={y} value={y}>{y} {y === '1' ? 'year' : 'years'}</option>)}
                  </select>
                </Fld>
                <Fld label="Relevant Experience (Months)">
                  <select className="cap-inp" value={relevantExpMonths} onChange={e => setRelevantExpMonths(e.target.value)} style={ipt(false)}>
                    <option value="">Select months…</option>
                    {EXP_MONTHS.map(m => <option key={m} value={m}>{m} {m === '1' ? 'month' : 'months'}</option>)}
                  </select>
                </Fld>
              </div>
            </Sec>

            {/* ── 5. Compensation & Logistics ── */}
            <Sec icon={IndianRupee} title="Compensation & Logistics" subtitle="Salary expectations and availability">
              <div className="cap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Fld label="Current Salary (₹ / year)" required error={errs.currentSalary} parsed={p('currentSalary')}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 600, color: P.gray500, pointerEvents: 'none' }}>₹</span>
                    <input className="cap-inp" type="number" min="0" value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g. 800000" style={{ ...ipt(!!errs.currentSalary), paddingLeft: '24px' }} />
                  </div>
                  {currentSalary && <p style={{ margin: '4px 0 0', fontSize: '11px', color: P.gray500 }}>{inrFmt(currentSalary)}</p>}
                </Fld>
                <Fld label="Expected Salary (₹ / year)" required error={errs.expectedSalary} parsed={p('expectedSalary')}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 600, color: P.gray500, pointerEvents: 'none' }}>₹</span>
                    <input className="cap-inp" type="number" min="0" value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} placeholder="e.g. 1200000" style={{ ...ipt(!!errs.expectedSalary), paddingLeft: '24px' }} />
                  </div>
                  {expectedSalary && <p style={{ margin: '4px 0 0', fontSize: '11px', color: P.gray500 }}>{inrFmt(expectedSalary)}</p>}
                </Fld>
                <Fld label="Notice Period" parsed={p('noticePeriod')}>
                  <div style={{ position: 'relative' }}>
                    <Clock size={14} color={P.gray400} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select className="cap-inp" value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)} style={{ ...ipt(false), paddingLeft: '34px' }}>
                      <option value="">Select…</option>
                      {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </Fld>
                <Fld label="Last Working Day">
                  <div style={{ position: 'relative' }}>
                    <CalendarDays size={14} color={P.gray400} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input className="cap-inp" type="date" value={lastWorkingDay} onChange={e => setLastWorkingDay(e.target.value)} style={{ ...ipt(false), paddingLeft: '34px' }} />
                  </div>
                </Fld>
              </div>
            </Sec>

            {/* ── 6. Pipeline: Consent ── */}
            {isPipeline && (
              <Sec icon={ShieldCheck} title="Authorization & Consent" subtitle={`Authorize ${orgName} to present your profile`}>
                <div style={{ background: P.p50, borderRadius: '8px', border: `1px solid ${P.border}`, padding: '14px 16px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: P.p600 }}>What will be shared with the client:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {['Your resume / CV', 'Name, email, and phone number', 'Current and expected salary', 'Total experience and skills', 'Notice period and availability'].map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12.5px', color: P.gray700 }}>
                        <CheckCircle2 size={14} color={P.p500} style={{ flexShrink: 0 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '16px', borderRadius: '10px', border: `2px solid ${consented ? P.p500 : errs.consent ? P.red300 : P.gray200}`, background: consented ? P.p50 : errs.consent ? P.red50 : '#fff', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={consented}
                    onChange={e => { setConsented(e.target.checked); if (e.target.checked) setErrs(prev => ({ ...prev, consent: undefined })); }}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: P.p500, flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div>
                    <p style={{ margin: '0 0 5px', fontSize: '13px', fontWeight: 700, color: P.gray900 }}>
                      I authorize {orgName} to share my profile
                    </p>
                    <p style={{ margin: 0, fontSize: '11.5px', color: P.gray500, lineHeight: 1.65 }}>
                      I confirm the information above is accurate and authorize <strong>{orgName}</strong> to present my resume and profile for the <strong>{job?.title}</strong> position. I understand this is not a job offer.
                    </p>
                  </div>
                </label>
                {errs.consent && <p style={{ margin: '7px 0 0', fontSize: '11px', color: P.red500, display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={11} /> {errs.consent}</p>}
              </Sec>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={submitting || uploading || parsing || (isPipeline && !consented)}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                background: (submitting || uploading || parsing || (isPipeline && !consented)) ? '#C4B5FD' : GRAD,
                color: '#fff', fontSize: '15px', fontWeight: 800,
                cursor: (submitting || uploading || parsing || (isPipeline && !consented)) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: (submitting || uploading || parsing || (isPipeline && !consented)) ? 'none' : '0 6px 20px rgba(124,58,237,0.38)',
                transition: 'all 0.2s', letterSpacing: '0.2px',
              }}
            >
              {submitting
                ? <><Spinner size={18} color="#fff" /> Submitting…</>
                : parsing
                ? <><Spinner size={18} color="#fff" /> Analysing resume…</>
                : isPipeline
                ? <><ShieldCheck size={18} /> Authorize &amp; Submit</>
                : <><FileText size={18} /> Submit Application</>
              }
            </button>

            <p style={{ textAlign: 'center', color: P.gray400, fontSize: '11.5px', marginTop: '14px', lineHeight: 1.6 }}>
              🔒 Your information is shared only with {orgName} and kept private.
            </p>
          </form>
        </div>
      </div>
    </Shell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Shell({ children }) {
  return <div style={{ minHeight: '100vh', background: P.p50, fontFamily: "'Inter','Segoe UI',sans-serif" }}>{children}</div>;
}
function CenterBox({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', padding: '24px' }}>{children}</div>;
}
function JTag({ text, bg, color }) {
  return <span style={{ padding: '4px 10px', borderRadius: '99px', background: bg, color, fontSize: '11px', fontWeight: 600, border: '1px solid rgba(0,0,0,0.06)' }}>{text}</span>;
}
function MetaChip({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.8)', border: `1px solid ${P.border}`, fontSize: '12.5px', color: P.p800, fontWeight: 500 }}>
      <Icon size={13} color={P.p500} style={{ flexShrink: 0 }} />
      {children}
    </div>
  );
}
function SideLabel({ children }) {
  return <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 700, color: P.p500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</p>;
}