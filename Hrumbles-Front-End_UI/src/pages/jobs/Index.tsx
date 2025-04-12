
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-3xl px-4 animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500 text-white p-4 rounded-2xl">
            <Briefcase size={48} />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
          Welcome to Staffing Hub
        </h1>
        <p className="text-xl text-gray-600 mb-10">
          Streamline your staffing operations with our comprehensive job management platform
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="group"
            onClick={() => navigate("/jobs")}
          >
            <span>Go to Job Dashboard</span>
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
