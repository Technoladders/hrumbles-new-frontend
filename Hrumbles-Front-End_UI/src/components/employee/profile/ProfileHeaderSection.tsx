
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { QuickActions } from "./QuickActions";
import { useNavigate } from "react-router-dom";

export const ProfileHeaderSection = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between items-center mb-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="hover:bg-white/50 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      <QuickActions />
    </div>
  );
};
