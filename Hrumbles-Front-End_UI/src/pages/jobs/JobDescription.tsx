// Hrumbles-Front-End_UI\src\pages\jobs\JobDescription.tsx
// Updates: 
// - Removed tabs; single content page.
// - After hero: Grid with Skills table (lg:col-span-3), right sidebar (lg:col-span-1) with Assigned To (if exists) + Manage Applications.
// - Below grid: Full-width Role Overview (description bullets).
// - Removed badges, enrichedMap, SkillBadge, activeTab, showSkillsTable.
// - Retained: Sidebar elements integrated into right column; description expand/collapse.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { getJobById } from "@/services/jobService";
import { getCandidatesByJobId } from "@/services/candidateService";
import { motion } from "framer-motion";
import LoadingState from "@/components/jobs/job-description/LoadingState";
import ErrorState from "@/components/jobs/job-description/ErrorState";
import JobEditDrawer from "@/components/jobs/job-description/JobEditDrawer";
import { useJobEditState } from "@/components/jobs/job-description/hooks/useJobEditState";
import { Candidate } from "@/lib/types";
import { formatDisplayValue } from "@/components/jobs/job-description/utils/formatUtils";
import { ArrowLeft, Edit, Share, Building, Hourglass, UserPlus, Clock, IndianRupee, CircleUser, MapPin, CalendarDays, Users, FileText, UserCheck, Briefcase, CalendarClock, Bookmark, Share2, Building2, Calendar, DollarSign, TrendingUp, Target, ChevronDown, ChevronUp, Sparkles, Zap, Award, ChevronUp as ChevronUpIcon } from "lucide-react";
import { formatBulletPoints } from "@/components/jobs/job-description/utils/formatUtils";
import JobEnrichedSkills from "@/components/jobs/job-description/JobEnrichedSkills";

// Core ModernJobDescription component (adapted from template)
const ModernJobDescription = ({ job, candidatesLength, onEditJob, isSaved, onToggleSaved }) => {
  const navigate = useNavigate();
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === 'employee';

  // Format HR Budget to INR
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Derived data
  const bulletPoints = formatBulletPoints(job.description || "");
  const experienceText = `${job.experience?.min?.years || 0}-${job.experience?.max?.years || 'N/A'} years`;
  const hrBudget = `${formatINR(job.hr_budget)} ${job.hr_budget_type}`;
  const clientBudget = job.clientDetails?.clientBudget ? formatDisplayValue(job.clientDetails.clientBudget) : null;
  const vendorBudget = !isEmployee && job.budgets?.vendorBudget ? formatDisplayValue(job.budgets.vendorBudget) : null;
  const locationText = job.location?.join(" • ") || "Remote";
  const postedDate = job.postedDate;
  const dueDate = job.dueDate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Floating Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-sm text-gray-500">{job.jobId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleSaved(!isSaved)}
                className={`p-2 rounded-xl transition-all ${isSaved ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={onEditJob}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section with Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMCA2YzAgMy4zMTQgMi42ODYgNiA2IDZzNi0yLjY4NiA2LTYtMi42ODYtNi02LTYtNiAyLjY4Ni02IDZ6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=')] opacity-20" />
         
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                    {job.status}
                  </span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                    {job.jobType}
                  </span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                    {job.hiringMode}
                  </span>
                </div>
                <h2 className="text-4xl font-bold mb-3">{job.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm">{job.clientDetails?.clientName || job.clientOwner}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{locationText}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Posted {postedDate}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Stats Grid - Integrated all budgets/positions/apps */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-medium text-white/70">Experience</span>
                </div>
                <p className="text-lg font-bold">{experienceText}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium text-white/70">Openings</span>
                </div>
                <p className="text-lg font-bold">{job.numberOfCandidates} positions</p>
              </div>
              {/* <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium text-white/70">Applications</span>
                </div>
                <p className="text-lg font-bold">{candidatesLength} received</p>
              </div> */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium text-white/70">HR Budget</span>
                </div>
                <p className="text-lg font-bold">{hrBudget}</p>
              </div>
              {/* Client/Vendor Budgets - Conditional */}
              {!isEmployee && clientBudget && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium text-white/70">Client Budget</span>
                  </div>
                  <p className="text-lg font-bold">{clientBudget}</p>
                </div>
              )}
              {!isEmployee && vendorBudget && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium text-white/70">Vendor Budget</span>
                  </div>
                  <p className="text-lg font-bold">{vendorBudget}</p>
                </div>
              )}
              {job.clientDetails?.endClient && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CircleUser className="w-4 h-4" />
                    <span className="text-xs font-medium text-white/70">End Client</span>
                  </div>
                  <p className="text-lg font-bold">{job.clientDetails.endClient}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        {/* Main Content Grid: Skills (3/4) + Right Sidebar (1/4) */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
          {/* Left Column - Required Skills Table */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              {/* <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Required Skills</h3>
              </div> */}
              <JobEnrichedSkills skills={job.skills || []} />
            </div>
          </div>
          {/* Right Column - Assigned To + Manage Applications */}
          {/* <div className="lg:col-span-1 space-y-6">
         
            {job.assignedTo && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Assigned To</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {job.assignedTo.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{job.assignedTo.name}</p>
                    <p className="text-xs text-gray-600 capitalize">{job.assignedTo.type}</p>
                  </div>
                </div>
              </div>
            )}
           
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <h3 className="text-lg font-bold mb-2">Manage Applications</h3>
              <p className="text-sm text-white/80 mb-4">
                {candidatesLength} candidates applied. Review and shortlist now.
              </p>
              <button className="w-full px-4 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all">
                View Candidates ({candidatesLength})
              </button>
            </div>
          </div> */}
        </div>
       
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Role Overview</h3>
          </div>
          <div className={`space-y-4 ${!isDescExpanded ? 'max-h-80 overflow-hidden relative' : ''}`}>
            {bulletPoints.map((point, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 group hover:translate-x-2 transition-transform"
              >
                <div className="mt-1.5 w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex-shrink-0 group-hover:scale-150 transition-transform" />
                <p className="text-gray-700 leading-relaxed">{point}</p>
              </div>
            ))}
            {!isDescExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
            )}
          </div>
          <button
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="mt-4 flex items-center gap-2 text-purple-600 font-medium hover:text-purple-700 transition-colors"
          >
            {isDescExpanded ? (
              <>Show Less <ChevronUpIcon className="w-4 h-4" /></>
            ) : (
              <>Show More <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main page wrapper with queries
const JobDescription = () => {
  const { id } = useParams<{ id: string }>();
  const { isDrawerOpen, openDrawer, closeDrawer, handleJobUpdate } = useJobEditState();
  const [isSaved, setIsSaved] = useState(false);
  
  const { 
    data: job, 
    isLoading: jobLoading, 
    error: jobError,
    refetch: refetchJob
  } = useQuery({
    queryKey: ['job-details', id],
    queryFn: () => getJobById(id || ""),
    enabled: !!id,
  });
  
  const { 
    data: candidatesData = [],
    refetch: refetchCandidates
  } = useQuery({
    queryKey: ['candidates-count', id],
    queryFn: () => getCandidatesByJobId(id || ""),
    enabled: !!id,
  });

  const candidates: Candidate[] = candidatesData.map(candidate => ({
    id: parseInt(candidate.id) || 0,
    name: candidate.name,
    status: candidate.status,
    experience: candidate.experience,
    matchScore: candidate.matchScore,
    appliedDate: candidate.appliedDate,
    skills: candidate.skills
  }));

  // Real-time listeners
  useEffect(() => {
    if (!id) return;

    const jobChannel = supabase
      .channel('job-desc-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_jobs', filter: `id=eq.${id}` },
        () => refetchJob()
      )
      .subscribe();

    const candidatesChannel = supabase
      .channel('candidates-desc-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_job_candidates', filter: `job_id=eq.${id}` },
        () => refetchCandidates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(candidatesChannel);
    };
  }, [id, refetchJob, refetchCandidates]);

  if (jobLoading) return <LoadingState />;
  if (jobError || !job) return <ErrorState />;

  return (
    <>
      <ModernJobDescription 
        job={job} 
        candidatesLength={candidates.length}
        onEditJob={openDrawer}
        isSaved={isSaved}
        onToggleSaved={setIsSaved}
      />
      <JobEditDrawer 
        job={job}
        open={isDrawerOpen}
        onClose={closeDrawer}
        onUpdate={handleJobUpdate}
      />
    </>
  );
};

export default JobDescription;