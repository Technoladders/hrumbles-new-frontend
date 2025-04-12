
import React from 'react';

export const HrumblesLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg 
      className={className}
      width="36" 
      height="36" 
      viewBox="0 0 36 36" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="36" height="36" rx="8" fill="#38BDF8" className="transition-all duration-700" />
      <path d="M9 9H13V16H23V9H27V27H23V20H13V27H9V9Z" fill="white" />
    </svg>
  );
};

export const HrumblesLogotype: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <HrumblesLogo />
      <span className="font-semibold text-lg tracking-tight">Hrumbles.ai</span>
    </div>
  );
};
