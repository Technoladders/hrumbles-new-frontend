// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

console.log('[CandidateApplicationPage] MODULE LOADED ✅');

const LOCATIONS = ['Bangalore','Mumbai','Delhi','Hyderabad','Pune','Chennai','Kolkata','Ahmedabad','Gurugram','Noida','Kochi','Jaipur','Chandigarh','Indore','Coimbatore','Remote','Others'];
const NOTICE_PERIODS = ['Immediate','15 days','30 days','45 days','60 days','90 days'];
const EXP_YEARS  = Array.from({ length: 31 }, (_, i) => String(i));
const EXP_MONTHS = Array.from({ length: 12 }, (_, i) => String(i));

function Spinner({ size = 24, color = '#7B43F1' }) {
  return <span style={{ display:'inline-block', width:size, height:size, border:`3px solid ${color}30`, borderTopColor:color, borderRadius:'50%', animation:'cap-spin 0.7s linear infinite', flexShrink:0 }} />;
}

function iStyle(err) {
  return { width:'100%', padding:'10px 12px', borderRadius:'8px', border:`1px solid ${err ? '#FCA5A5' : '#E5E7EB'}`, fontSize:'13px', color:'#111827', background: err ? '#FFF5F5' : '#fff', outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
}

function Fld({ label, required, error, fullWidth, children }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'#374151', marginBottom:'5px' }}>
        {label}{required && <span style={{ color:'#EF4444', marginLeft:'3px' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin:'4px 0 0 0', fontSize:'11px', color:'#EF4444' }}>{error}</p>}
    </div>
  );
}

function Sec({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom:'24px' }}>
      <div style={{ marginBottom:'14px' }}>
        <h3 style={{ margin:'0 0 2px 0', fontSize:'15px', fontWeight:700, color:'#111827' }}>{title}</h3>
        <p style={{ margin:0, fontSize:'12px', color:'#9CA3AF' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function CandidateApplicationPage() {
  const { inviteToken } = useParams();
  const [pageState, setPageState]   = useState('loading');
  const [errorMsg,  setErrorMsg]    = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeUrl, setResumeUrl]   = useState('');
  const [resumeFile, setResumeFile] = useState('');
  const [uploading, setUploading]   = useState(false);
  const [descOpen, setDescOpen]     = useState(false);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [email, setEmail]           = useState('');
  const [phone, setPhone]           = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [totalExpYears, setTotalExpYears]     = useState('');
  const [totalExpMonths, setTotalExpMonths]   = useState('');
  const [currentCompany, setCurrentCompany]   = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [currentSalary, setCurrentSalary]     = useState('');
  const [expectedSalary, setExpectedSalary]   = useState('');
  const [noticePeriod, setNoticePeriod]       = useState('');
  const [linkedInUrl, setLinkedInUrl]         = useState('');
  const [errs, setErrs]                       = useState({});

  useEffect(() => {
    if (!inviteToken) { setErrorMsg('Invalid invite link.'); setPageState('error'); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('candidate_invites')
          .select('id,status,expires_at,candidate_name,candidate_email,job_id,organization_id,created_by,invite_source,candidate_id,hr_jobs!candidate_invites_job_id_fkey(id,title,location,experience,skills,description,hiring_mode,job_type_category)')
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
      } catch(e) { setErrorMsg('Something went wrong. Please contact the recruiter.'); setPageState('error'); }
    })();
  }, [inviteToken]);

  const handleResumeChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) { alert('PDF or DOCX only.'); return; }
    if (file.size > 5*1024*1024) { alert('Max 5 MB.'); return; }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `invite-resumes/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from('candidate_resumes').upload(path, file, { cacheControl:'3600', upsert:false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('candidate_resumes').getPublicUrl(path);
      setResumeUrl(urlData.publicUrl);
      setResumeFile(file.name);
    } catch(e) { alert('Upload failed: ' + (e.message || 'Unknown')); }
    finally { setUploading(false); }
  };

  const validate = () => {
    const e = {};
    if (!firstName.trim())    e.firstName = 'Required';
    if (!lastName.trim())     e.lastName  = 'Required';
    if (!email.trim())        e.email     = 'Required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!phone.trim())        e.phone     = 'Required';
    if (!currentLocation)     e.currentLocation = 'Required';
    if (totalExpYears === '')  e.totalExpYears   = 'Required';
    if (!currentSalary)       e.currentSalary   = 'Required';
    if (!expectedSalary)      e.expectedSalary  = 'Required';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !inviteToken) return;
    setIsSubmitting(true);
    try {
      const formData = {
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(),
        phone: phone.trim() || undefined, currentLocation: currentLocation || undefined,
        totalExperience: totalExpYears !== '' ? parseInt(totalExpYears, 10) : undefined,
        totalExperienceMonths: totalExpMonths !== '' ? parseInt(totalExpMonths, 10) : undefined,
        currentCompany: currentCompany.trim() || undefined,
        currentDesignation: currentDesignation.trim() || undefined,
        currentSalary: currentSalary ? parseFloat(currentSalary) : undefined,
        expectedSalary: expectedSalary ? parseFloat(expectedSalary) : undefined,
        noticePeriod: noticePeriod || undefined, linkedInId: linkedInUrl.trim() || undefined,
        resume: resumeUrl || undefined,
      };
      const { data, error } = await supabase.functions.invoke('process-candidate-invite', { body: { inviteToken, formData } });
      if (error) throw new Error(error.message);
      if (data && data.error) throw new Error(data.error);
      setPageState('success');
    } catch(e) { alert(e.message || 'Submission failed.'); }
    finally { setIsSubmitting(false); }
  };

  if (pageState === 'loading') return (
    <Wrap><div style={{ textAlign:'center', padding:'80px 24px' }}><Spinner size={36} /><p style={{ color:'#6B7280', marginTop:'16px' }}>Validating your invite...</p></div></Wrap>
  );
  if (pageState === 'error') return (
    <Wrap><div style={{ textAlign:'center', padding:'60px 24px' }}>
      <div style={{ fontSize:'40px', marginBottom:'16px' }}>⚠️</div>
      <h2 style={{ color:'#111827', margin:'0 0 8px 0' }}>Unable to open application</h2>
      <p style={{ color:'#6B7280', maxWidth:'360px', margin:'0 auto', lineHeight:1.6 }}>{errorMsg}</p>
    </div></Wrap>
  );
  if (pageState === 'success') {
    const isPipe = inviteData && inviteData.invite_source === 'pipeline';
    const sJob   = inviteData && inviteData.hr_jobs;
    return (
      <Wrap><div style={{ textAlign:'center', padding:'60px 24px' }}>
        <div style={{ fontSize:'52px', marginBottom:'16px' }}>✅</div>
        <h2 style={{ color:'#111827', margin:'0 0 8px 0', fontSize:'22px', fontWeight:800 }}>
          {isPipe ? 'Profile Updated!' : 'Application Submitted!'}
        </h2>
        <p style={{ color:'#6B7280', maxWidth:'420px', margin:'0 auto', lineHeight:1.7, fontSize:'14px' }}>
          {isPipe
            ? 'Thank you! Your profile has been updated. Our recruiter will be in touch shortly.'
            : <>Thank you for applying for <strong>{sJob && sJob.title}</strong>. The recruiter will review and get back to you.</>
          }
        </p>
      </div></Wrap>
    );
  }

  const job       = inviteData && inviteData.hr_jobs;
  const locs      = job && job.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
  const expMin    = job && job.experience && job.experience.min && job.experience.min.value;
  const expMax    = job && job.experience && job.experience.max && job.experience.max.value;
  const expText   = (expMin != null && expMax != null) ? `${expMin}–${expMax} yrs` : expMin != null ? `${expMin}+ yrs` : expMax != null ? `Up to ${expMax} yrs` : null;
  const isPipeline = inviteData && inviteData.invite_source === 'pipeline';
  const descFull  = (job && job.description) || '';
  const descShort = descFull.length > 400 ? descFull.slice(0, 400) + '...' : descFull;

  return (
    <Wrap>
      <style>{`@keyframes cap-spin { to { transform: rotate(360deg); } } @media(max-width:680px){ .app-cols { flex-direction: column !important; } .app-left { width:100% !important; position:relative !important; max-height:none !important; } .app-right { max-height:none !important; } }`}</style>
      <div className="app-cols" style={{ display:'flex', minHeight:'100vh' }}>

        {/* LEFT — Job details */}
        <div className="app-left" style={{ width:'38%', flexShrink:0, background:'#F8F7FF', borderRight:'1px solid #EDE9FE', padding:'28px 24px', position:'sticky', top:0, maxHeight:'100vh', overflowY:'auto' }}>
          <div style={{ marginBottom:'20px' }}>
            <span style={{ display:'inline-block', background:'#7B43F1', padding:'5px 14px', borderRadius:'99px', color:'#fff', fontSize:'11px', fontWeight:700 }}>Powered by Xrilic.ai</span>
          </div>
          {job ? (<>
            <h2 style={{ margin:'0 0 10px 0', fontSize:'20px', fontWeight:800, color:'#111827', lineHeight:1.3 }}>{job.title}</h2>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'16px' }}>
              {/* {job.hiring_mode && <Tag bg="#EDE9FE" color="#7C3AED" text={job.hiring_mode} />}
              {job.job_type_category && <Tag bg="#DBEAFE" color="#1D4ED8" text={job.job_type_category} />} */}
              {isPipeline && <Tag bg="#D1FAE5" color="#065F46" text="Profile Update" />}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' }}>
              {locs.length > 0 && <Meta icon="📍">{locs.join(' · ')}</Meta>}
              {expText           && <Meta icon="💼">{expText} experience</Meta>}
            </div>
            {job.skills && job.skills.length > 0 && (
              <div style={{ marginBottom:'20px' }}>
                <Lbl>Required Skills</Lbl>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {job.skills.map((s, i) => <span key={i} style={{ padding:'4px 10px', borderRadius:'99px', background:'#fff', color:'#374151', fontSize:'11px', fontWeight:500, border:'1px solid #DDD6FE' }}>{s}</span>)}
                </div>
              </div>
            )}
            {descFull && (
              <div>
                <Lbl>About the Role</Lbl>
                <p style={{ margin:0, fontSize:'12px', color:'#6B7280', lineHeight:1.75, whiteSpace:'pre-line' }}>{descOpen ? descFull : descShort}</p>
                {descFull.length > 400 && (
                  <button onClick={() => setDescOpen(!descOpen)} style={{ marginTop:'8px', background:'none', border:'none', color:'#7C3AED', fontSize:'12px', fontWeight:600, cursor:'pointer', padding:0 }}>
                    {descOpen ? '↑ Show less' : '↓ Read more'}
                  </button>
                )}
              </div>
            )}
          </>) : (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>💼</div>
              <p style={{ margin:0, fontSize:'13px' }}>Loading job details...</p>
            </div>
          )}
        </div>

        {/* RIGHT — Form */}
        <div className="app-right" style={{ flex:1, minWidth:'300px', overflowY:'auto', maxHeight:'100vh', padding:'28px 28px 48px', background:'#fff' }}>
          <div style={{ marginBottom:'24px' }}>
            <h3 style={{ margin:'0 0 4px 0', fontSize:'18px', fontWeight:800, color:'#111827' }}>
              {isPipeline ? 'Update Your Profile' : 'Your Application'}
            </h3>
            <p style={{ margin:0, fontSize:'13px', color:'#9CA3AF' }}>
              {isPipeline ? 'Please verify and update your details below.' : 'Complete the form below — takes about 3 minutes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <Sec title="Resume" subtitle="Upload your CV (PDF or DOCX, max 5 MB)">
              <input id="res-inp" type="file" accept=".pdf,.docx,.doc" onChange={handleResumeChange} disabled={uploading} style={{ display:'none' }} />
              {resumeUrl ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', border:'1px solid #86EFAC', borderRadius:'8px', background:'#F0FDF4' }}>
                  <span style={{ fontSize:'13px', color:'#065F46', fontWeight:500 }}>✓ {resumeFile || 'Resume uploaded'}</span>
                  <label htmlFor="res-inp" style={{ fontSize:'13px', color:'#7B43F1', fontWeight:600, cursor:'pointer' }}>Replace</label>
                </div>
              ) : (
                <label htmlFor="res-inp" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'28px 16px', border:'2px dashed #DDD6FE', borderRadius:'10px', cursor: uploading ? 'not-allowed' : 'pointer', background:'#FAFAFA' }}>
                  {uploading ? <Spinner size={24} /> : <><span style={{ fontSize:'28px' }}>📎</span><span style={{ fontSize:'14px', fontWeight:600, color:'#374151' }}>Click to upload resume</span><span style={{ fontSize:'12px', color:'#9CA3AF' }}>PDF or DOCX · Max 5 MB</span></>}
                </label>
              )}
            </Sec>

            <Sec title="Personal Details" subtitle="Your basic contact information">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <Fld label="First Name" required error={errs.firstName}><input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" style={iStyle(!!errs.firstName)} /></Fld>
                <Fld label="Last Name" required error={errs.lastName}><input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" style={iStyle(!!errs.lastName)} /></Fld>
                <Fld label="Email Address" required error={errs.email}><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={iStyle(!!errs.email)} /></Fld>
                <Fld label="Phone Number" required error={errs.phone}><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" style={iStyle(!!errs.phone)} /></Fld>
                <Fld label="Current Location" required error={errs.currentLocation} fullWidth>
                  <select value={currentLocation} onChange={e => setCurrentLocation(e.target.value)} style={iStyle(!!errs.currentLocation)}>
                    <option value="">Select city...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Fld>
              </div>
            </Sec>

            <Sec title="Professional Background" subtitle="Your experience and current role">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <Fld label="Experience (Years)" required error={errs.totalExpYears}>
                  <select value={totalExpYears} onChange={e => setTotalExpYears(e.target.value)} style={iStyle(!!errs.totalExpYears)}>
                    <option value="">Select years</option>
                    {EXP_YEARS.map(y => <option key={y} value={y}>{y} {y === '1' ? 'year' : 'years'}</option>)}
                  </select>
                </Fld>
                <Fld label="Experience (Months)">
                  <select value={totalExpMonths} onChange={e => setTotalExpMonths(e.target.value)} style={iStyle(false)}>
                    <option value="">Select months</option>
                    {EXP_MONTHS.map(m => <option key={m} value={m}>{m} {m === '1' ? 'month' : 'months'}</option>)}
                  </select>
                </Fld>
                <Fld label="Current Company"><input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="e.g. Infosys" style={iStyle(false)} /></Fld>
                <Fld label="Current Designation"><input value={currentDesignation} onChange={e => setCurrentDesignation(e.target.value)} placeholder="e.g. Senior Engineer" style={iStyle(false)} /></Fld>
                <Fld label="Current Salary (₹ / year)" required error={errs.currentSalary}><input type="number" min="0" value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g. 800000" style={iStyle(!!errs.currentSalary)} /></Fld>
                <Fld label="Expected Salary (₹ / year)" required error={errs.expectedSalary}><input type="number" min="0" value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} placeholder="e.g. 1200000" style={iStyle(!!errs.expectedSalary)} /></Fld>
                <Fld label="Notice Period">
                  <select value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)} style={iStyle(false)}>
                    <option value="">Select...</option>
                    {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Fld>
                <Fld label="LinkedIn URL"><input type="url" value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" style={iStyle(false)} /></Fld>
              </div>
            </Sec>

            <button type="submit" disabled={isSubmitting || uploading} style={{ width:'100%', padding:'16px', borderRadius:'12px', border:'none', background: isSubmitting ? '#C4B5FD' : 'linear-gradient(135deg,#6D28D9,#7C3AED)', color:'#fff', fontSize:'15px', fontWeight:800, cursor: isSubmitting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(124,58,237,0.4)' }}>
              {isSubmitting ? <><Spinner size={18} color="#fff" /> Submitting...</> : (isPipeline ? 'Update My Profile →' : 'Submit Application →')}
            </button>
            <p style={{ textAlign:'center', color:'#9CA3AF', fontSize:'12px', marginTop:'16px', lineHeight:1.5 }}>
              By submitting, your information will be shared with the hiring team.
            </p>
          </form>
        </div>
      </div>
    </Wrap>
  );
}

function Wrap({ children }) {
  return <div style={{ minHeight:'100vh', background:'#F5F3FF', fontFamily:'Arial,sans-serif' }}>{children}</div>;
}
function Tag({ text, bg, color }) {
  return <span style={{ padding:'3px 10px', borderRadius:'99px', background:bg, color, fontSize:'11px', fontWeight:600 }}>{text}</span>;
}
function Meta({ icon, children }) {
  return <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'#6B7280' }}><span>{icon}</span>{children}</div>;
}
function Lbl({ children }) {
  return <p style={{ margin:'0 0 10px 0', fontSize:'11px', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.5px' }}>{children}</p>;
}

export default CandidateApplicationPage;