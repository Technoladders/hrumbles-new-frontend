// src/pages/careerPage/TalentView/JobDetailTalent.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Briefcase, Clock, ArrowLeft, Check, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import QuickApplyModal from './QuickApplyModal';   // ← reuse the same modal
import Header from '@/components/careerPage/Header'; // assuming this exists
import './talent-theme.css';   // ← reuse the same global talent styles

interface Job {
  id: string;
  title: string;
  location: string[] | string;
  job_type: string;
  posted_date: string;
  description: string;
  salary?: string;              // optional now
  organization_id: string;
  company?: string;             // optional – can come from hr_organizations if needed
  logoUrl?: string;             // optional – for modal & header
}

const JobDetailTalent = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickApply, setShowQuickApply] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('get-public-job-by-id', {
        body: { jobId },
      });

      if (error) {
        toast({
          title: 'Error fetching job details',
          description: error.message,
          variant: 'destructive',
        });
        setJob(null);
      } else {
        // Optional: enhance with company/logo if your function returns it
        setJob({
          ...data,
          // company: data.hr_organizations?.name || 'Company',
          // logoUrl: data.hr_organizations?.hr_organization_profile?.logo_url || '',
        });
      }
      setLoading(false);
    };

    fetchJob();
  }, [jobId, toast]);

  const handleApplyClick = () => {
    if (!job) return;
    setShowQuickApply(true);
  };

  if (loading) {
    return (
      <div className="talent-page-wrapper min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold text-gray-600">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="talent-page-wrapper min-h-screen">
        <Header />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Job not found</h1>
          <Button 
            onClick={() => navigate('/careers')}
            variant="outline"
            className="border-hrumbles-accent text-hrumbles-accent hover:bg-hrumbles-accent/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Listings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="talent-page-wrapper min-h-screen">
      {/* Header - reuse same as list page */}
      <Header />

      {/* Back + Title Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/careers')}
              className="text-gray-600 hover:text-hrumbles-accent"
            >
              <ArrowLeft className="mr-2 h-5 w-5" /> Back to Jobs
            </Button>

            <Button
              onClick={handleApplyClick}
              className="bg-hrumbles-accent hover:bg-hrumbles-accent/90 text-white font-medium px-6"
            >
              <Check className="mr-2 h-4 w-4" /> Apply Now
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Job Header Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="inline-flex items-center gap-1.5 bg-hrumbles-accent/10 text-hrumbles-accent px-3 py-1 rounded-full text-sm font-medium">
                    <Briefcase size={14} />
                    {job.job_type || 'Full-time'}
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-gray-600 text-sm">
                    <Calendar size={14} />
                    Posted {new Date(job.posted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{job.title}</h1>

                <div className="flex flex-wrap gap-6 text-gray-600 mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-hrumbles-accent" />
                    <span>{Array.isArray(job.location) ? job.location.join(', ') : job.location || 'Not specified'}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-2 font-medium text-gray-800">
                      <Clock size={18} className="text-hrumbles-accent" />
                      {job.salary}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 lg:self-start">
                <Button
                  onClick={handleApplyClick}
                  className="bg-hrumbles-accent hover:bg-hrumbles-accent/90 text-white px-8 py-6 text-lg"
                >
                  Apply Now
                </Button>
                <Button variant="outline" className="border-gray-300">
                  <Heart className="mr-2 h-5 w-5" /> Save
                </Button>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Job Description</h2>
            <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-line">
              {job.description || 'No description available.'}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">How to Apply</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Ready to take the next step in your career? Submit your application using the button below. 
                Our team reviews every application carefully and will reach out to qualified candidates.
              </p>

              <Button
                onClick={handleApplyClick}
                size="lg"
                className="bg-hrumbles-accent hover:bg-hrumbles-accent/90 text-white px-10 py-7 text-lg"
              >
                <Check className="mr-3 h-5 w-5" /> Apply for this Position
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Apply Modal */}
      {job && (
        <QuickApplyModal
          isOpen={showQuickApply}
          onClose={() => setShowQuickApply(false)}
          job={{
            id: job.id,
            title: job.title,
            company: job.company || 'Company', // fallback
            logoUrl: job.logoUrl,
          }}
          organizationId={job.organization_id || ''}
        />
      )}
    </div>
  );
};

export default JobDetailTalent;