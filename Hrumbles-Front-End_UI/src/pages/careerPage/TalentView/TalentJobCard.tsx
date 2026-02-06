import React from 'react';
import { Heart, Clock, MapPin } from 'lucide-react';
import './talent-theme.css';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  postedDate: string;
  logoUrl?: string;
  type?: string;
}

interface JobCardProps {
  job: Job;
  onClick: () => void;
  isSelected: boolean;
}

const TalentJobCard: React.FC<JobCardProps> = ({ job, onClick, isSelected }) => {
  return (
    <div 
      onClick={onClick}
      className={`talent-card p-5 mb-4 cursor-pointer relative ${isSelected ? 'border-l-4 border-l-talent-purple' : ''}`}
    >
      <div className="flex gap-4">
        {/* Logo Box */}
        <div className="flex-shrink-0">
            {job.logoUrl ? (
                 <img src={job.logoUrl} alt={job.company} className="talent-logo-box" />
            ) : (
                <div className="talent-logo-box bg-blue-100 text-blue-600 font-bold text-xl">
                    {job.company.charAt(0)}
                </div>
            )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-talent-dark hover:underline mb-1">
              {job.title}
            </h3>
            <button className="text-gray-400 hover:text-talent-coral transition-colors">
              <Heart size={20} />
            </button>
          </div>
          
          <div className="text-talent-purple font-medium mb-1 text-sm">
            {job.company}
          </div>
          
          <div className="text-talent-gray text-sm mb-3 flex items-center gap-1">
             <MapPin size={14} /> {job.location}
          </div>

          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {job.description}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {job.postedDate}
            </span>
            {job.type && (
                 <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                    {job.type}
                 </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentJobCard;