
import React from 'react';
import { Calendar, MapPin, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../careerpage.css'

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    salary: string;
    postedDate: string;
    description: string;
  };
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const navigate = useNavigate();
  
  const handleCardClick = () => {
    navigate(`/job/${job.id}`);
  };
  
  return (
    <div 
      className="bg-white shadow-sm rounded-xl p-6 border border-gray-100 transition-shadow hover:shadow-md cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span>
            <h3 className="text-lg font-semibold mb-1 hover:text-purple-500 transition-colors">{job.title}</h3>
            </span>
            <span className="bg-purple-100 text-purple-600 font-medium px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
              <Briefcase size={12} /> <span>{job.type}</span>
            </span>
            <span className="text-hrumbles-muted text-xs flex items-center gap-1">
              <Calendar size={12} /> <span>{job.postedDate}</span>
            </span>
          </div>
          
          
          
          <div className="flex flex-col gap-1 mb-4">
            {/* <span className="text-sm text-hrumbles-muted">{job.company}</span> */}
            <span className="text-xs text-hrumbles-muted flex items-center gap-1">
              <MapPin size={12} /> <span>{job.location}</span>
            </span>
          </div>
        </div>
        
        <div className="flex-grow">
          <p className="text-sm text-hrumbles-muted line-clamp-3 mb-4">
            {job.description}
          </p>
        </div>
        
        <div className="mt-2">
          <span className="font-medium text-purple-500 text-sm hover:text-grey-500 transition-colors">View More...</span>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
