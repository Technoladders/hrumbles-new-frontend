// Updated Component: Hrumbles-Front-End_UI\src\components\jobs\job-description\AnimatedHeader.tsx
// Enhanced to include ALL previous details: Client name, budgets (HR/Client/Vendor with role visibility), end client, location, experience, positions, posted/due dates, applications.
// Structure: Title row → Badges row (core) → Full Info Grid (staggered chips with icons, animations). Role-based rendering via Redux.

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Share, Building, Hourglass, UserPlus, Clock, IndianRupee, CircleUser, MapPin, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { JobData } from "@/lib/types";
import { formatDisplayValue } from "./utils/formatUtils";
import { formatINR } from "../JobDetailsRightCard"; // Reuse from previous right card
import { useSelector } from "react-redux";
import { useToast } from '@/hooks/use-toast';
import { shareJob } from '@/services/jobs/supabaseQueries';

interface AnimatedHeaderProps {
  job: JobData;
  onEditJob: () => void;
  candidatesLength: number;
}

const AnimatedHeader = ({ job, onEditJob, candidatesLength }: AnimatedHeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === 'employee';

  const handleShare = async () => {
    const response = await shareJob(job.id);
    if (response.success) {
      toast({ title: "Job shared successfully!" });
    } else {
      toast({ title: "Failed to share job", variant: "destructive" });
    }
  };

  // Consolidated Info Chips - All previous details with icons and role visibility
  const infoChips = [
    { icon: <Building className="w-4 h-4 text-blue-500" />, label: "Company", value: formatDisplayValue(job.clientDetails?.clientName || job.clientOwner) },
    { icon: <Hourglass className="w-4 h-4 text-orange-500" />, label: "Experience", value: `${job.experience?.min?.years || 0} to ${job.experience?.max?.years || 'N/A'} years` },
    { icon: <UserPlus className="w-4 h-4 text-teal-500" />, label: "Positions", value: formatDisplayValue(job.numberOfCandidates.toString()) },
    { icon: <FileTextIcon className="w-4 h-4 text-gray-500" />, label: "Job Type", value: formatDisplayValue(job.jobType) }, // Assuming FileText from lucide
    { icon: <UserCheck className="w-4 h-4 text-purple-500" />, label: "Hiring Mode", value: formatDisplayValue(job.hiringMode) },
    ...(isEmployee ? [] : [{ icon: <IndianRupee className="w-4 h-4 text-green-500" />, label: "Client Budget", value: formatDisplayValue(job.clientDetails?.clientBudget) }]),
    { icon: <IndianRupee className="w-4 h-4 text-emerald-500" />, label: isEmployee ? "Budget" : "HR Budget", value: `${formatINR(job.hr_budget)} ${job.hr_budget_type}` },
    ...(isEmployee ? [] : job.budgets?.vendorBudget ? [{ icon: <IndianRupee className="w-4 h-4 text-teal-500" />, label: "Vendor Budget", value: formatDisplayValue(job.budgets.vendorBudget) }] : []),
    ...(job.clientDetails?.endClient ? [{ icon: <CircleUser className="w-4 h-4 text-indigo-500" />, label: "End Client", value: formatDisplayValue(job.clientDetails.endClient) }] : []),
    ...(job.location?.length > 0 ? [{ icon: <MapPin className="w-4 h-4 text-red-500" />, label: "Location", value: job.location.map(loc => formatDisplayValue(loc)).join(", ") }] : []),
    { icon: <CalendarDays className="w-4 h-4 text-amber-500" />, label: "Posted", value: formatDisplayValue(job.postedDate) },
    { icon: <Clock className="w-4 h-4 text-red-500" />, label: "Due", value: formatDisplayValue(job.dueDate) },
    { icon: <Users className="w-4 h-4 text-green-600" />, label: "Applications", value: `${candidatesLength} received` },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Title Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
          >
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </motion.div>
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl lg:text-4xl font-bold text-gray-900"
            >
              {job.title}
              <span className="text-lg text-gray-500 font-normal ml-2">(#{job.jobId})</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-600"
            >
              Posted on {job.postedDate}
            </motion.p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button size="sm" onClick={onEditJob}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Core Badges Row */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center gap-2"
        >
          <Badge variant="secondary" className="text-xs px-3 py-1 bg-purple-50 text-purple-700">
            {job.jobType}
          </Badge>
          <Badge variant="outline" className="text-xs px-3 py-1 bg-amber-50 text-amber-700">
            {job.hiringMode}
          </Badge>
          <Badge
            variant="default"
            className={`text-xs px-3 py-1 ${
              job.status === "Active" ? "bg-green-100 text-green-800" :
              job.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
              "bg-blue-100 text-blue-800"
            }`}
          >
            {job.status}
          </Badge>
        </motion.div>
      </AnimatePresence>

      {/* Full Info Grid - Staggered Chips for All Details */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        <AnimatePresence>
          {infoChips.map((chip, index) => (
            <motion.div
              key={chip.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="flex items-center gap-2 p-3 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm"
            >
              <div className="flex-shrink-0">{chip.icon}</div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-gray-600 truncate">{chip.label}</span>
                <span className="block text-sm font-semibold text-gray-900 truncate">{chip.value}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.header>
  );
};

// Reuse formatINR from previous component (add if not imported)
const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Import missing icon (add to lucide-react imports if needed)
import { FileText as FileTextIcon, UserCheck } from "lucide-react";

export default AnimatedHeader;