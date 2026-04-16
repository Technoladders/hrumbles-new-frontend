import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Linkedin, Globe, MapPin, Calendar, Award, Users, BookOpen, Code, Languages as LangIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MasterProfileCVProps {
  linkedinUrl: string;
  onClose: () => void;
}

export const MasterProfileCV: React.FC<MasterProfileCVProps> = ({ linkedinUrl, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full profile from master table
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("master_contactout_profiles")
        .select("*")
        .eq("linkedin_url", linkedinUrl)
        .single();

      if (error) {
        setError(error.message);
      } else if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    if (linkedinUrl) fetchProfile();
  }, [linkedinUrl]);

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
        <div className="text-white text-lg">Loading rich profile...</div>
      </div>,
      document.body
    );
  }

  if (error || !profile) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center">
          <p className="text-red-600">Failed to load profile</p>
          <button onClick={onClose} className="mt-4 text-violet-600">Close</button>
        </div>
      </div>,
      document.body
    );
  }

  // Safe JSON parsing
  const parseJson = (field: any) => {
    if (!field) return [];
    if (typeof field === "string") {
      try { return JSON.parse(field); } catch { return []; }
    }
    return Array.isArray(field) ? field : [];
  };

  const company = typeof profile.company === "string" ? JSON.parse(profile.company || "{}") : profile.company || {};
  const experience = parseJson(profile.experience);
  const education = parseJson(profile.education);
  const certifications = parseJson(profile.certifications);
  const skills = parseJson(profile.skills);
  const languages = parseJson(profile.languages);
  const projects = parseJson(profile.projects);
  const publications = parseJson(profile.publications);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-700 text-white px-10 py-8 flex items-start gap-6">
          <img
            src={profile.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&size=160`}
            alt={profile.full_name}
            className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-xl"
          />
          <div className="flex-1">
            <h1 className="text-4xl font-bold">{profile.full_name}</h1>
            <p className="text-2xl text-white/90 mt-1">{profile.title}</p>
            {profile.headline && <p className="text-white/80 mt-2 text-lg">{profile.headline}</p>}
            
            <div className="flex items-center gap-4 mt-5 text-sm">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={18} /> {profile.location}
                </span>
              )}
              {profile.followers && (
                <span className="flex items-center gap-1.5">
                  <Users size={18} /> {profile.followers.toLocaleString()} followers
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X size={32} />
            </button>
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-white text-violet-700 px-5 py-2.5 rounded-2xl font-semibold text-sm hover:bg-white/90 transition-colors"
            >
              <Linkedin size={18} /> View on LinkedIn
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-10 py-8 space-y-12">
          
          {/* SUMMARY / ABOUT */}
          {profile.summary && (
            <div>
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-slate-600 leading-relaxed text-[15.5px]">{profile.summary}</p>
            </div>
          )}

          {/* EXPERIENCE */}
          {experience.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Users size={22} /> Experience
              </h2>
              <div className="space-y-8">
                {experience.map((exp: any, i: number) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-12 h-12 flex-shrink-0 rounded-2xl border bg-white overflow-hidden shadow-sm">
                      {exp.logo_url ? (
                        <img src={exp.logo_url} alt="" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400">
                          {exp.company_name?.[0] || "?"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold text-lg">{exp.title}</h3>
                        {exp.is_current && <span className="text-emerald-600 text-sm font-medium">Present</span>}
                      </div>
                      <p className="text-slate-600 font-medium">{exp.company_name}</p>
                      <p className="text-slate-500 text-sm mt-1">
                        {exp.start_date_year} – {exp.is_current ? "Present" : exp.end_date_year}
                      </p>
                      {exp.summary && <p className="mt-4 text-slate-600 text-[15px]">{exp.summary}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EDUCATION */}
          {education.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Education</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {education.map((edu: any, i: number) => (
                  <div key={i} className="border border-slate-100 rounded-2xl p-5">
                    <p className="font-semibold">{edu.school_name}</p>
                    <p className="text-slate-700">{edu.degree} {edu.field_of_study && `• ${edu.field_of_study}`}</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {edu.start_date_year} – {edu.end_date_year || "Present"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CERTIFICATIONS */}
          {certifications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Award size={22} /> Certifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certifications.map((cert: any, i: number) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-amber-700 text-sm">{cert.authority}</p>
                    {cert.start_date_year && (
                      <p className="text-xs text-amber-600 mt-2">Issued {cert.start_date_year}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SKILLS */}
          {skills.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: string, i: number) => (
                  <span
                    key={i}
                    className="px-5 py-2 bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-700 rounded-3xl text-sm transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* LANGUAGES */}
          {languages.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <LangIcon size={22} /> Languages
              </h2>
              <div className="flex flex-wrap gap-4">
                {languages.map((lang: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl px-6 py-3 flex items-center gap-3">
                    <span className="font-medium">{lang.name}</span>
                    {lang.proficiency && (
                      <span className="text-xs text-slate-500">• {lang.proficiency}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {projects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Code size={22} /> Projects
              </h2>
              <div className="space-y-6">
                {projects.map((proj: any, i: number) => (
                  <div key={i} className="border border-slate-100 rounded-3xl p-6">
                    <h3 className="font-semibold text-lg">{proj.title}</h3>
                    {proj.description && <p className="text-slate-600 mt-3">{proj.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PUBLICATIONS */}
          {publications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <BookOpen size={22} /> Publications
              </h2>
              <div className="space-y-6">
                {publications.map((pub: any, i: number) => (
                  <div key={i} className="border border-slate-100 rounded-3xl p-6">
                    <h3 className="font-semibold">{pub.title}</h3>
                    {pub.publisher && <p className="text-slate-500 text-sm">{pub.publisher}</p>}
                    {pub.description && <p className="text-slate-600 mt-3 text-sm">{pub.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-10 py-5 text-xs text-slate-400 flex justify-between items-center">
          <span>Data from master_contactout_profiles • Last updated {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "—"}</span>
          <button onClick={onClose} className="text-violet-600 hover:text-violet-700 font-medium">Close CV</button>
        </div>
      </div>
    </div>,
    document.body
  );
};