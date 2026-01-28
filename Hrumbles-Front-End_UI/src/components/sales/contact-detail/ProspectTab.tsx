import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, Briefcase, MapPin, Linkedin, Twitter, Facebook, Github,
  Calendar, ChevronDown, ChevronUp, TrendingUp, Target, Award, Clock,
  Users, Building2, Sparkles
} from 'lucide-react';
import { extractFromRaw, hasData, calculateDuration } from '@/utils/dataExtractor';
import { cn } from '@/lib/utils';
import { SimilarProfessionalsTab as SimilarProspectsTable } from './SimilarProfessionalsTab';

export const ProspectTab = ({ contact }: any) => {
  const data = extractFromRaw(contact);
  
  // Collapsible states
  const [isCareerOpen, setIsCareerOpen] = useState(true);
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);
  const [isEngagementOpen, setIsEngagementOpen] = useState(false);
  const [isProfessionalOpen, setIsProfessionalOpen] = useState(false);
  
  // Only show sections with data
  const hasPersonalInfo = hasData(data.headline) || hasData(data.seniority);
  const hasLocation = hasData(data.city) || hasData(data.state) || hasData(data.country);
  const hasSocial = hasData(data.linkedinUrl) || hasData(data.twitterUrl) || hasData(data.facebookUrl) || hasData(data.githubUrl);
  const hasProfessional = hasData(data.departments) || hasData(data.functions);
  const hasEmployment = hasData(data.employmentHistory);
  const hasEngagement = hasData(data.intentStrength) || hasData(data.showIntent);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Compact Professional Identity Card */}
      {hasPersonalInfo && (
        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardHeader className="pb-4 bg-gradient-to-r from-slate-900 to-slate-800 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-white text-sm font-black uppercase tracking-wider">
                Professional Identity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Headline Section */}
            {data.headline && (
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
                  Professional Headline
                </label>
                <p className="text-sm text-slate-700 font-medium leading-relaxed bg-gradient-to-r from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-100">
                  {data.headline}
                </p>
              </div>
            )}
            
            {/* Compact Grid: Seniority, Timezone, Location */}
            <div className="grid grid-cols-3 gap-3">
              {data.seniority && (
                <CompactInfoBox 
                  icon={<Award className="w-3.5 h-3.5" />}
                  label="Seniority"
                  value={
                    <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black uppercase w-full justify-center">
                      {data.seniority}
                    </Badge>
                  }
                />
              )}
              
              {data.timezone && (
                <CompactInfoBox 
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Timezone"
                  value={<span className="text-xs font-bold text-slate-700">{data.timezone.split('/').pop()}</span>}
                />
              )}

              {hasLocation && (
                <CompactInfoBox 
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  label="Location"
                  value={
                    <span className="text-xs font-bold text-slate-700">
                      {data.city || data.state || data.country}
                    </span>
                  }
                />
              )}
            </div>

            {/* Full Location Display (if there's more detail) */}
            {hasLocation && data.city && data.state && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-medium">
                  {[data.city, data.state, data.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* Social Media Icons - Compact Row */}
            {hasSocial && (
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
                  Social Profiles
                </label>
                <div className="flex gap-2">
                  {data.linkedinUrl && (
                    <SocialIconButton icon={<Linkedin size={16} />} url={data.linkedinUrl} color="bg-blue-600" tooltip="LinkedIn" />
                  )}
                  {data.twitterUrl && (
                    <SocialIconButton icon={<Twitter size={16} />} url={data.twitterUrl} color="bg-sky-500" tooltip="Twitter/X" />
                  )}
                  {data.facebookUrl && (
                    <SocialIconButton icon={<Facebook size={16} />} url={data.facebookUrl} color="bg-blue-700" tooltip="Facebook" />
                  )}
                  {data.githubUrl && (
                    <SocialIconButton icon={<Github size={16} />} url={data.githubUrl} color="bg-slate-800" tooltip="GitHub" />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Professional Classification - Collapsible */}
      {hasProfessional && (
        <CollapsibleCard
          isOpen={isProfessionalOpen}
          setIsOpen={setIsProfessionalOpen}
          icon={<Briefcase className="w-4 h-4" />}
          title="Professional Classification"
          headerColor="from-emerald-50 to-teal-50"
          iconColor="bg-emerald-600"
          borderColor="border-emerald-100"
        >
          <div className="space-y-3">
            {hasData(data.departments) && (
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
                  Departments
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {data.departments.map((dept: string, idx: number) => (
                    <Badge key={idx} className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-bold px-2 py-0.5">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {hasData(data.subdepartments) && (
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
                  Sub-Departments
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {data.subdepartments.map((subdept: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[9px] font-bold px-2 py-0.5">
                      {subdept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {hasData(data.functions) && (
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
                  Functions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {data.functions.map((func: string, idx: number) => (
                    <Badge key={idx} className="bg-slate-100 text-slate-700 border-slate-200 text-[9px] font-bold px-2 py-0.5">
                      {func}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleCard>
      )}

      {/* Employment History - Collapsible */}
      {hasEmployment && (
        <CollapsibleCard
          isOpen={isCareerOpen}
          setIsOpen={setIsCareerOpen}
          icon={<Calendar className="w-4 h-4" />}
          title="Career Timeline"
          badge={`${data.employmentHistory.length} Position${data.employmentHistory.length > 1 ? 's' : ''}`}
          headerColor="from-amber-50 to-orange-50"
          iconColor="bg-amber-600"
          borderColor="border-amber-100"
        >
          <div className="space-y-3">
            {data.employmentHistory.map((job: any, idx: number) => (
              <div 
                key={idx} 
                className={cn(
                  "relative pl-5 pb-3 border-l-2 last:pb-0",
                  job.current || job.is_current 
                    ? "border-emerald-400" 
                    : "border-slate-200"
                )}
              >
                <div className={cn(
                  "absolute left-0 top-1 -ml-[7px] w-3 h-3 rounded-full border-3 border-white",
                  job.current || job.is_current 
                    ? "bg-emerald-500 shadow-md shadow-emerald-200" 
                    : "bg-slate-300"
                )} />
                
                <div className="bg-gradient-to-r from-white to-slate-50 rounded-lg p-3 border border-slate-100 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-slate-900 leading-tight mb-0.5">
                        {job.title}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        <Building2 size={10} />
                        {job.organization_name}
                      </p>
                    </div>
                    {(job.current || job.is_current) && (
                      <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black px-1.5 py-0 h-4">
                        CURRENT
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 font-medium mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {job.start_date ? new Date(job.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                      {' - '}
                      {job.end_date ? new Date(job.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
                    </span>
                    <span className="text-amber-600 font-bold">
                      • {calculateDuration(job.start_date, job.end_date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleCard>
      )}

      {/* Similar People - Collapsible */}
      <CollapsibleCard
        isOpen={isSimilarOpen}
        setIsOpen={setIsSimilarOpen}
        icon={<Users className="w-4 h-4" />}
        title="Similar Prospects"
        headerColor="from-blue-50 to-indigo-50"
        iconColor="bg-blue-600"
        borderColor="border-blue-100"
      >
        <SimilarProspectsTable contact={contact} compact={true} />
      </CollapsibleCard>

      {/* Engagement Signals - Collapsible */}
      {hasEngagement && (
        <CollapsibleCard
          isOpen={isEngagementOpen}
          setIsOpen={setIsEngagementOpen}
          icon={<Sparkles className="w-4 h-4" />}
          title="Engagement Signals"
          headerColor="from-purple-50 to-pink-50"
          iconColor="bg-purple-600"
          borderColor="border-purple-100"
        >
          <div className="grid grid-cols-2 gap-3">
            {data.intentStrength && (
              <CompactInfoBox 
                icon={<Target className="w-3.5 h-3.5" />}
                label="Intent Strength"
                value={
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] font-black uppercase w-full justify-center">
                    {data.intentStrength}
                  </Badge>
                }
              />
            )}
            {data.showIntent !== null && (
              <CompactInfoBox 
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Showing Intent"
                value={
                  <Badge className={cn(
                    "text-[9px] font-black uppercase w-full justify-center",
                    data.showIntent 
                      ? "bg-green-100 text-green-700 border-green-200" 
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  )}>
                    {data.showIntent ? 'YES' : 'NO'}
                  </Badge>
                }
              />
            )}
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
};

// Collapsible Card Component
const CollapsibleCard = ({ 
  isOpen, 
  setIsOpen, 
  icon, 
  title, 
  badge, 
  headerColor, 
  iconColor, 
  borderColor,
  children 
}: any) => (
  <Card className={cn("border-none shadow-lg overflow-hidden bg-white transition-all", isOpen && "shadow-xl")}>
    <CardHeader 
      className={cn(
        "pb-3 bg-gradient-to-r cursor-pointer hover:opacity-90 transition-opacity p-4 border-b-2",
        headerColor,
        borderColor
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-1.5 rounded-lg text-white", iconColor)}>
            {icon}
          </div>
          <CardTitle className="text-slate-800 text-xs font-black uppercase tracking-wider">
            {title}
          </CardTitle>
          {badge && (
            <Badge variant="outline" className="text-[8px] font-bold bg-white/50 text-slate-600 border-slate-200">
              {badge}
            </Badge>
          )}
        </div>
        <button className="text-slate-600 hover:text-slate-900 transition-colors">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
    </CardHeader>
    {isOpen && (
      <CardContent className="p-4 animate-in slide-in-from-top-2">
        {children}
      </CardContent>
    )}
  </Card>
);

// Compact Info Box Component
const CompactInfoBox = ({ icon, label, value }: any) => (
  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
    <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
      {icon}
      <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
    </div>
    <div>{value}</div>
  </div>
);

// Social Icon Button Component
const SocialIconButton = ({ icon, url, color, tooltip }: any) => (
  <a 
    href={url} 
    target="_blank" 
    rel="noreferrer"
    className={cn(
      "p-2.5 rounded-lg text-white hover:scale-110 transition-transform shadow-sm hover:shadow-md",
      color
    )}
    title={tooltip}
  >
    {icon}
  </a>
);