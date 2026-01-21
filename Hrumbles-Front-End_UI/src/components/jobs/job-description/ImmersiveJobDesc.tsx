// New Component: Hrumbles-Front-End_UI\src\components\jobs\job-description\ImmersiveJobDesc.tsx
// Left-side: Full immersive description with animated bullets, assigned to card, and candidate summary.
// Framer Motion for stagger on list items, hover lifts.

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { JobData, Candidate } from "@/lib/types";
import { Briefcase, Users } from "lucide-react";
import { formatBulletPoints } from "./utils/formatUtils";

interface ImmersiveJobDescProps {
  job: JobData;
  candidates: Candidate[];
}

const ImmersiveJobDesc = ({ job, candidates }: ImmersiveJobDescProps) => {
  const bulletPoints = formatBulletPoints(job.description || "");

  return (
    <div className="space-y-6">
      {/* Assigned To - Animated Card */}
      {job.assignedTo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative"
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {job.assignedTo.type === "individual" ? "P" : job.assignedTo.type === "team" ? "T" : "V"}
                </motion.div>
                <div>
                  <h3 className="font-semibold text-gray-900">{job.assignedTo.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{job.assignedTo.type}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Candidate Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.02 }}
      >
        {/* <Card className="shadow-md">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Applications ({candidates.length})</h3>
                <p className="text-sm text-gray-600">View and manage candidates</p>
              </div>
              {candidates.length > 0 && (
                <Badge className="ml-auto bg-blue-100 text-blue-800">New: {candidates.filter(c => c.appliedDate === job.postedDate).length}</Badge>
              )}
            </div>
          </CardContent>
        </Card> */}
      </motion.div>

      {/* Job Description - Staggered Animated Bullets */}
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"
          >
            <Briefcase className="w-5 h-5 text-blue-600" />
            Role Overview
          </motion.h2>
          <AnimatePresence>
            {bulletPoints.length > 0 ? (
              <ul className="space-y-4 pl-0">
                {bulletPoints.map((point, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5, scale: 1.02 }}
                    className="relative pl-6 text-gray-700 leading-relaxed text-base"
                  >
                    <span className="absolute left-0 top-1 w-2 h-2 bg-blue-500 rounded-full" />
                    {point}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-600 leading-relaxed text-base"
              >
                {job.description || "No description available."}
              </motion.p>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImmersiveJobDesc;