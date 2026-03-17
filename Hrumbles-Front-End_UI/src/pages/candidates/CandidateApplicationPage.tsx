// @ts-nocheck
// src/pages/candidates/CandidateApplicationPage.jsx
// Public page — no auth. Accessed via /apply/:inviteToken
// Redesigned: clean two-column layout, modern form, progress steps, professional styling.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

console.log('[CandidateApplicationPage] MODULE LOADED ✅');

const LOCATIONS = [
  'Bangalore','Mumbai','Delhi','Hyderabad','Pune','Chennai',
  'Kolkata','Ahmedabad','Gurugram','Noida','Kochi','Jaipur',
  'Chandigarh','Indore','Coimbatore','Remote','Others',
];
const NOTICE_PERIODS = ['Immediate','15 days','30 days','45 days','60 days','90 days'];
const EXP_YEARS  = Array.from({ length: 31 }, (_, i) => String(i));
const EXP_MONTHS = Array.from({ length: 12 }, (_, i) => String(i));

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 20, color = '#7B43F1' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, flexShrink: 0,
      border: `2.5px solid ${color}30`, borderTopColor: color,
      borderRadius: '50%', animation: 'cap-spin 0.7s linear infinite',
    }} />
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Fld({ label, required, error, children, span2 = false }) {
  return (
    <div style={{ gridColumn: span2 ? '1 / -1' : undefined }}>
      <label style={{
        display: 'block', fontSize: '11.5px', fontWeight: 700,
        color: error ? '#DC2626' : '#374151',
        textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px',
      }}>
        {label}
        {required && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

// ── Input style factory ───────────────────────────────────────────────────────
const ipt = (err = false) => ({
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: `1.5px solid ${err ? '#FCA5A5' : '#E5E7EB'}`,
  fontSize: '13px', color: '#111827',
  background: err ? '#FFF5F5' : '#fff',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
});

// ── Section wrapper ───────────────────────────────────────────────────────────
function Sec({ icon, title, subtitle, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '15px',
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{title}</h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF' }}>{subtitle}</p>
        </div>
      </div>
      <div style={{
        background: '#FAFAFA', borderRadius: '10px', border: '1px solid #F3F4F6',
        padding: '16px',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateApplicationPage() {
  const { inviteToken } = useParams();

  const [pageState,    setPageState]   = useState('loading');
  const [errorMsg,     setErrorMsg]    = useState('');
  const [inviteData,   setInviteData]  = useState(null);
  const [isSubmitting, setSubmitting]  = useState(false);
  const [resumeUrl,    setResumeUrl]   = useState('');
  const [resumeFile,   setResumeFile]  = useState('');
  const [uploading,    setUploading]   = useState(false);
  const [descOpen,     setDescOpen]    = useState(false);
  const [errs,         setErrs]        = useState({});

  // Form fields
  const [firstName,           setFirstName]           = useState('');
  const [lastName,            setLastName]             = useState('');
  const [email,               setEmail]               = useState('');
  const [phone,               setPhone]               = useState('');
  const [currentLocation,     setCurrentLocation]     = useState('');
  const [totalExpYears,       setTotalExpYears]        = useState('');
  const [totalExpMonths,      setTotalExpMonths]       = useState('');
  const [currentCompany,      setCurrentCompany]       = useState('');
  const [currentDesignation,  setCurrentDesignation]   = useState('');
  const [currentSalary,       setCurrentSalary]        = useState('');
  const [expectedSalary,      setExpectedSalary]       = useState('');
  const [noticePeriod,        setNoticePeriod]         = useState('');
  const [linkedInUrl,         setLinkedInUrl]          = useState('');

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
            )
          `)
          .eq('invite_token', inviteToken)
          .single();

        if (error || !data) { setErrorMsg('This invite link is invalid or no longer exists.'); setPageState('error'); return; }
        if (new Date(data.expires_at) < new Date()) { setErrorMsg('This invite link has expired.'); setPageState('error'); return; }
        if (data.status === 'applied') { setErrorMsg('You have already submitted your application.'); setPageState('error'); return; }

        setInviteData(data);
        if (data.candidate_email) setEmail(data.candidate_email);
        if (data.candidate_name) {
          const parts = data.candidate_name.trim().split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
        supabase.functions.invoke('mark-invite-opened', { body: { token: inviteToken } }).catch(() => {});
        setPageState('form');
      } catch {
        setErrorMsg('Something went wrong. Please contact the recruiter.');
        setPageState('error');
      }
    })();
  }, [inviteToken]);

  // ── Resume upload ────────────────────────────────────────────────────────────
  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { alert('PDF or DOCX only.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Max file size is 5 MB.'); return; }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `invite-resumes/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from('candidate_resumes').upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('candidate_resumes').getPublicUrl(path);
      setResumeUrl(urlData.publicUrl);
      setResumeFile(file.name);
    } catch (e) {
      alert('Upload failed: ' + (e.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!firstName.trim())            e.firstName        = 'First name is required';
    if (!lastName.trim())             e.lastName         = 'Last name is required';
    if (!email.trim())                e.email            = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email       = 'Enter a valid email';
    if (!phone.trim())                e.phone            = 'Phone number is required';
    if (!currentLocation)             e.currentLocation  = 'Please select your location';
    if (totalExpYears === '')          e.totalExpYears    = 'Please select years of experience';
    if (!currentSalary)               e.currentSalary    = 'Current salary is required';
    if (!expectedSalary)              e.expectedSalary   = 'Expected salary is required';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate() || !inviteToken) return;
    setSubmitting(true);
    try {
      const formData = {
        firstName: firstName.trim(), lastName: lastName.trim(),
        email: email.trim(), phone: phone.trim() || undefined,
        currentLocation: currentLocation || undefined,
        totalExperience: totalExpYears !== '' ? parseInt(totalExpYears, 10) : undefined,
        totalExperienceMonths: totalExpMonths !== '' ? parseInt(totalExpMonths, 10) : undefined,
        currentCompany: currentCompany.trim() || undefined,
        currentDesignation: currentDesignation.trim() || undefined,
        currentSalary: currentSalary ? parseFloat(currentSalary) : undefined,
        expectedSalary: expectedSalary ? parseFloat(expectedSalary) : undefined,
        noticePeriod: noticePeriod || undefined,
        linkedInId: linkedInUrl.trim() || undefined,
        resume: resumeUrl || undefined,
      };
      const { data, error } = await supabase.functions.invoke('process-candidate-invite', {
        body: { inviteToken, formData },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setPageState('success');
    } catch (e) {
      alert(e.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const job        = inviteData?.hr_jobs;
  const isPipeline = inviteData?.invite_source === 'pipeline';
  const locs       = job?.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
  const expMin     = job?.experience?.min?.value;
  const expMax     = job?.experience?.max?.value;
  const expText    = expMin != null && expMax != null ? `${expMin}–${expMax} yrs`
                   : expMin != null ? `${expMin}+ yrs`
                   : expMax != null ? `Up to ${expMax} yrs` : null;
  const descFull   = job?.description || '';
  const descShort  = descFull.length > 380 ? descFull.slice(0, 380) + '…' : descFull;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (pageState === 'loading') return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <Spinner size={36} />
        <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Validating your invite link…</p>
      </div>
    </Shell>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (pageState === 'error') return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>
          ⚠️
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#111827' }}>Link Unavailable</h2>
        <p style={{ color: '#6B7280', maxWidth: '380px', lineHeight: 1.7, margin: 0, fontSize: '14px' }}>{errorMsg}</p>
      </div>
    </Shell>
  );

  // ── Success ──────────────────────────────────────────────────────────────────
  if (pageState === 'success') return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '24px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '18px',
          background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
        }}>
          ✅
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: 800, color: '#111827' }}>
          {isPipeline ? 'Profile Updated!' : 'Application Submitted!'}
        </h2>
        <p style={{ color: '#6B7280', maxWidth: '440px', lineHeight: 1.75, margin: '0 0 28px', fontSize: '14px' }}>
          {isPipeline
            ? 'Thank you! Your profile has been updated. Our recruiter will review and be in touch soon.'
            : <>Thank you for applying for <strong style={{ color: '#7C3AED' }}>{job?.title}</strong>. The hiring team will review your application and reach out to you.</>
          }
        </p>
        <div style={{ padding: '14px 24px', borderRadius: '10px', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#7C3AED', fontWeight: 600 }}>
            Powered by Xrilic.ai · Candidate Platform
          </p>
        </div>
      </div>
    </Shell>
  );

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <style>{`
        @keyframes cap-spin { to { transform: rotate(360deg); } }
        .cap-inp:focus { border-color: #7C3AED !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .cap-upload:hover { border-color: #7C3AED !important; background: #FAF5FF !important; }
        @media (max-width: 700px) {
          .cap-cols    { flex-direction: column !important; }
          .cap-sidebar { width: 100% !important; position: relative !important; max-height: none !important; border-right: none !important; border-bottom: 1px solid #EDE9FE !important; }
          .cap-form    { max-height: none !important; }
          .cap-grid    { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="cap-cols" style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch' }}>

        {/* ── LEFT: Job details ───────────────────────────────────────────────── */}
        <div className="cap-sidebar" style={{
          width: '360px', flexShrink: 0,
          background: 'linear-gradient(160deg, #F5F0FF 0%, #EDE9FE 100%)',
          borderRight: '1px solid #DDD6FE',
          padding: '32px 24px', position: 'sticky', top: 0,
          maxHeight: '100vh', overflowY: 'auto',
        }}>

          {/* Branding */}
          {/* <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '6px 12px', borderRadius: '99px',
              background: 'white', border: '1px solid #DDD6FE',
              boxShadow: '0 2px 6px rgba(124,58,237,0.1)',
            }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', letterSpacing: '0.3px' }}>Xrilic.ai</span>
            </div>
          </div> */}

          {job ? (
            <>
              {/* Job title */}
              <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 800, color: '#1E1B4B', lineHeight: 1.3 }}>
                {job.title}
              </h2>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                {isPipeline && <JTag text="Profile Update" bg="#D1FAE5" color="#065F46" />}
                {job.hiring_mode && <JTag text={job.hiring_mode} bg="white" color="#374151" />}
                {job.job_type_category && <JTag text={job.job_type_category} bg="white" color="#374151" />}
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
                {locs.length > 0 && (
                  <MetaChip icon="📍">{locs.join(' · ')}</MetaChip>
                )}
                {expText && (
                  <MetaChip icon="💼">{expText} experience required</MetaChip>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(109,40,217,0.12)', margin: '0 0 20px' }} />

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <SideLabel>Required Skills</SideLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {job.skills.map((s, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: '99px',
                        background: 'white', color: '#4C1D95',
                        fontSize: '11px', fontWeight: 500,
                        border: '1px solid #DDD6FE',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {descFull && (
                <div>
                  <SideLabel>About the Role</SideLabel>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#4C1D95', lineHeight: 1.75, whiteSpace: 'pre-line', opacity: 0.85 }}>
                    {descOpen ? descFull : descShort}
                  </p>
                  {descFull.length > 380 && (
                    <button onClick={() => setDescOpen(!descOpen)} style={{
                      marginTop: '8px', background: 'none', border: 'none',
                      color: '#7C3AED', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', gap: '3px',
                    }}>
                      {descOpen ? '↑ Show less' : '↓ Read more'}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#7C3AED', opacity: 0.5 }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>💼</div>
              <p style={{ margin: 0, fontSize: '13px' }}>Loading job details…</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Form ─────────────────────────────────────────────────────── */}
        <div className="cap-form" style={{
          flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: '100vh',
          padding: '32px 32px 56px', background: '#fff',
        }}>

          {/* Form header */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
              }}>
                {isPipeline ? '🔄' : '📋'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                  {isPipeline ? 'Update Your Profile' : 'Submit Your Application'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>
                  {isPipeline
                    ? 'Verify and update your details — takes 2 minutes'
                    : 'Complete the form below — takes about 3 minutes'}
                </p>
              </div>
            </div>

            {/* Progress hint */}
            <div style={{ marginTop: '14px', display: 'flex', gap: '6px' }}>
              {['Resume', 'Personal', 'Professional'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'white', fontWeight: 700,
                  }}>{i + 1}</div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED' }}>{s}</span>
                  {i < 2 && <span style={{ fontSize: '10px', color: '#D1D5DB' }}>›</span>}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* ── Section 1: Resume ──────────────────────────────────────────── */}
            <Sec icon="📎" title="Resume" subtitle="Upload your CV — PDF or DOCX, max 5 MB">
              <input id="res-inp" type="file" accept=".pdf,.docx,.doc"
                onChange={handleResumeChange} disabled={uploading}
                style={{ display: 'none' }} />

              {resumeUrl ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', border: '1.5px solid #86EFAC',
                  borderRadius: '10px', background: '#F0FDF4',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📄</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#065F46' }}>
                        Resume uploaded
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#6B7280' }}>
                        {resumeFile}
                      </p>
                    </div>
                  </div>
                  <label htmlFor="res-inp" style={{
                    fontSize: '12px', color: '#7B43F1', fontWeight: 700, cursor: 'pointer',
                    padding: '6px 12px', borderRadius: '7px', border: '1px solid #DDD6FE',
                    background: 'white',
                  }}>
                    Replace
                  </label>
                </div>
              ) : (
                <label htmlFor="res-inp" className="cap-upload" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  padding: '32px 16px', border: '2px dashed #DDD6FE', borderRadius: '12px',
                  cursor: uploading ? 'not-allowed' : 'pointer', background: '#FAFAFA',
                  transition: 'all 0.15s',
                }}>
                  {uploading ? (
                    <><Spinner size={28} /><span style={{ fontSize: '13px', color: '#7C3AED', fontWeight: 600 }}>Uploading…</span></>
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                        📎
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#374151' }}>Click to upload your resume</p>
                        <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#9CA3AF' }}>PDF or DOCX · Maximum 5 MB</p>
                      </div>
                      <span style={{
                        padding: '7px 18px', borderRadius: '8px',
                        background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                        color: 'white', fontSize: '12px', fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                      }}>
                        Browse Files
                      </span>
                    </>
                  )}
                </label>
              )}
            </Sec>

            {/* ── Section 2: Personal ────────────────────────────────────────── */}
            <Sec icon="👤" title="Personal Details" subtitle="Your name and contact information">
              <div className="cap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Fld label="First Name" required error={errs.firstName}>
                  <input className="cap-inp" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" style={ipt(!!errs.firstName)} />
                </Fld>
                <Fld label="Last Name" required error={errs.lastName}>
                  <input className="cap-inp" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" style={ipt(!!errs.lastName)} />
                </Fld>
                <Fld label="Email Address" required error={errs.email}>
                  <input className="cap-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={ipt(!!errs.email)} />
                </Fld>
                <Fld label="Phone Number" required error={errs.phone}>
                  <input className="cap-inp" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" style={ipt(!!errs.phone)} />
                </Fld>
                <Fld label="Current Location" required error={errs.currentLocation} span2>
                  <select className="cap-inp" value={currentLocation} onChange={e => setCurrentLocation(e.target.value)} style={ipt(!!errs.currentLocation)}>
                    <option value="">Select your city…</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Fld>
              </div>
            </Sec>

            {/* ── Section 3: Professional ─────────────────────────────────────── */}
            <Sec icon="💼" title="Professional Background" subtitle="Your experience and current role details">
              <div className="cap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                <Fld label="Years of Experience" required error={errs.totalExpYears}>
                  <select className="cap-inp" value={totalExpYears} onChange={e => setTotalExpYears(e.target.value)} style={ipt(!!errs.totalExpYears)}>
                    <option value="">Select years…</option>
                    {EXP_YEARS.map(y => <option key={y} value={y}>{y} {y === '1' ? 'year' : 'years'}</option>)}
                  </select>
                </Fld>
                <Fld label="Months (optional)">
                  <select className="cap-inp" value={totalExpMonths} onChange={e => setTotalExpMonths(e.target.value)} style={ipt(false)}>
                    <option value="">Select months…</option>
                    {EXP_MONTHS.map(m => <option key={m} value={m}>{m} {m === '1' ? 'month' : 'months'}</option>)}
                  </select>
                </Fld>

                <Fld label="Current Company">
                  <input className="cap-inp" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="e.g. Infosys" style={ipt(false)} />
                </Fld>
                <Fld label="Current Designation">
                  <input className="cap-inp" value={currentDesignation} onChange={e => setCurrentDesignation(e.target.value)} placeholder="e.g. Senior Engineer" style={ipt(false)} />
                </Fld>

                <Fld label="Current Salary (₹ / year)" required error={errs.currentSalary}>
                  <input className="cap-inp" type="number" min="0" value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g. 800000" style={ipt(!!errs.currentSalary)} />
                </Fld>
                <Fld label="Expected Salary (₹ / year)" required error={errs.expectedSalary}>
                  <input className="cap-inp" type="number" min="0" value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} placeholder="e.g. 1200000" style={ipt(!!errs.expectedSalary)} />
                </Fld>

                <Fld label="Notice Period">
                  <select className="cap-inp" value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)} style={ipt(false)}>
                    <option value="">Select…</option>
                    {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Fld>
                <Fld label="LinkedIn URL">
                  <input className="cap-inp" type="url" value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" style={ipt(false)} />
                </Fld>
              </div>
            </Sec>

            {/* ── Submit ──────────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                background: (isSubmitting || uploading)
                  ? '#C4B5FD'
                  : 'linear-gradient(135deg,#5B21B6,#7C3AED)',
                color: '#fff', fontSize: '15px', fontWeight: 800,
                cursor: (isSubmitting || uploading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: (isSubmitting || uploading) ? 'none' : '0 6px 20px rgba(124,58,237,0.4)',
                transition: 'all 0.2s',
                letterSpacing: '0.2px',
              }}
            >
              {isSubmitting
                ? <><Spinner size={18} color="#fff" /> Submitting…</>
                : isPipeline ? '🔄  Update My Profile' : '✉️  Submit Application'}
            </button>

            <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '11.5px', marginTop: '14px', lineHeight: 1.6 }}>
              🔒 Your information is shared only with the hiring team and kept private.
            </p>
          </form>
        </div>
      </div>
    </Shell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F3FF', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
      {children}
    </div>
  );
}

function JTag({ text, bg, color }) {
  return (
    <span style={{
      padding: '4px 10px', borderRadius: '99px', background: bg, color,
      fontSize: '11px', fontWeight: 600, border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {text}
    </span>
  );
}

function MetaChip({ icon, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '7px 12px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(109,40,217,0.12)',
      fontSize: '12.5px', color: '#4C1D95', fontWeight: 500,
    }}>
      <span style={{ fontSize: '14px' }}>{icon}</span>
      {children}
    </div>
  );
}

function SideLabel({ children }) {
  return (
    <p style={{
      margin: '0 0 8px', fontSize: '10px', fontWeight: 700,
      color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      {children}
    </p>
  );
}