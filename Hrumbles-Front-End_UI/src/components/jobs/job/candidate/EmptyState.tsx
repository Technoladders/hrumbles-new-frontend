
import React from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddCandidate: () => void;
}

const EmptyState = ({ onAddCandidate }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <div className="bg-white p-4 rounded-full shadow-sm mb-4">
        <UserPlus className="h-8 w-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md text-center">
        Start by adding candidates to this job. You can add candidates manually or import them from your database.
      </p>
      <Button onClick={onAddCandidate} className="flex items-center gap-2">
        <UserPlus size={16} />
        <span>Add Candidate</span>
      </Button>
    </div>
  );
};

export default EmptyState;
