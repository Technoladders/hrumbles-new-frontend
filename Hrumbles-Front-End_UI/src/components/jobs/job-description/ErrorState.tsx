
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ErrorState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh]">
      <h2 className="text-2xl font-bold mb-4">Job not found</h2>
      <p className="text-gray-500 mb-6">The job you're looking for doesn't exist or has been removed.</p>
      <Link to="/jobs">
        <Button className="flex items-center gap-2">
          <ArrowLeft size={18} />
          Back to Jobs
        </Button>
      </Link>
    </div>
  );
};

export default ErrorState;
