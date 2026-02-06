import React from 'react';
import { Check, Heart, Share2, Briefcase, MapPin } from 'lucide-react';
import './talent-theme.css';

interface JobDetailProps {
  job: any;
  onClose: () => void; // For mobile back behavior
}

const TalentJobDetail: React.FC<JobDetailProps> = ({ job, onClose }) => {
  if (!job) return <div className="p-8 text-center text-gray-500">Select a job to view details</div>;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full overflow-hidden flex flex-col sticky top-24">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 relative">
        <button onClick={onClose} className="md:hidden absolute top-4 right-4 text-gray-500">
           Close
        </button>
        
        <div className="flex items-start gap-4 mb-4">
             {job.logoUrl ? (
                 <img src={job.logoUrl} alt={job.company} className="w-16 h-16 object-contain border rounded-md" />
            ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 font-bold text-2xl">
                    {job.company.charAt(0)}
                </div>
            )}
        </div>

        <h1 className="text-2xl font-bold text-talent-dark mb-2">{job.title}</h1>
        <div className="text-talent-purple font-medium mb-1">{job.company}</div>
        <div className="text-talent-gray text-sm mb-4">{job.location}</div>

        <div className="flex flex-wrap gap-3">
          <button className="flex-1 btn-talent-primary py-2 px-6 flex items-center justify-center gap-2">
            <Check size={18} /> Quick Apply
          </button>
          <button className="btn-talent-secondary p-2.5">
            <Heart size={20} />
          </button>
           <button className="btn-talent-secondary p-2.5">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {/* Job Attributes */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center gap-2 text-talent-dark font-semibold mb-1">
                    <Briefcase size={16} className="text-talent-purple" /> Job Type
                </div>
                <div className="text-sm text-gray-600">{job.type || 'Full-time'}</div>
            </div>
             <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center gap-2 text-talent-dark font-semibold mb-1">
                    <MapPin size={16} className="text-talent-purple" /> Location
                </div>
                <div className="text-sm text-gray-600">{job.location}</div>
            </div>
        </div>

        <h2 className="text-lg font-bold text-talent-dark mb-3">Job Description</h2>
        <div className="prose text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line">
          {job.description}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
             <h3 className="font-semibold mb-4">Requirements</h3>
             <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                 <li>Experience in related field.</li>
                 <li>Strong communication skills.</li>
                 <li>Ability to work in a fast-paced environment.</li>
                 {/* Dynamically render requirements if available in API */}
             </ul>
        </div>
      </div>
      
      {/* Footer CTA */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <button className="text-talent-coral font-semibold text-sm hover:underline">
              View related jobs
          </button>
      </div>
    </div>
  );
};

export default TalentJobDetail;