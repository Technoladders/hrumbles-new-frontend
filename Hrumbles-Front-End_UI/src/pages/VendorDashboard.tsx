// src/pages/VendorDashboard.tsx

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Briefcase, CheckCircle, Clock, Calendar } from "lucide-react";
import { Card } from "@/components/jobs/ui/card";
import { Link } from "react-router-dom";
import { getJobsAssignedToUser } from "@/services/jobService";
import Loader from "@/components/ui/Loader";

const VendorDashboard = () => {
  const user         = useSelector((state: any) => state.auth.user);
  const [jobs, setJobs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getJobsAssignedToUser(user.id)
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <Loader size={60} className="border-[6px]" />
    </div>
  );

  const total  = jobs.length;
  const active = jobs.filter(j => j.status === "OPEN"  || j.status === "Active").length;
  const hold   = jobs.filter(j => j.status === "HOLD"  || j.status === "Pending").length;
  const closed = jobs.filter(j => j.status === "CLOSE" || j.status === "Completed").length;

  return (
    <div className="space-y-8 p-4 md:p-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1">
          Welcome, {user?.first_name} 👋
        </h1>
        <p className="text-gray-500">Here's a summary of your assigned jobs.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-4 flex justify-between items-start hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Total Assigned</p>
            <h3 className="text-3xl font-bold">{total}</h3>
          </div>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Briefcase className="text-blue-600" size={22} />
          </div>
        </Card>

        <Card className="p-4 flex justify-between items-start hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Active</p>
            <h3 className="text-3xl font-bold text-green-600">{active}</h3>
          </div>
          <div className="p-2 bg-green-100 rounded-lg">
            <Calendar className="text-green-600" size={22} />
          </div>
        </Card>

        <Card className="p-4 flex justify-between items-start hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">On Hold</p>
            <h3 className="text-3xl font-bold text-yellow-600">{hold}</h3>
          </div>
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Clock className="text-yellow-600" size={22} />
          </div>
        </Card>

        <Card className="p-4 flex justify-between items-start hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Closed</p>
            <h3 className="text-3xl font-bold">{closed}</h3>
          </div>
          <div className="p-2 bg-purple-100 rounded-lg">
            <CheckCircle className="text-purple-600" size={22} />
          </div>
        </Card>
      </div>

      {/* Recent jobs mini-list */}
      {jobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold mb-4 text-gray-700">Your Assigned Jobs</h2>
          <div className="space-y-3">
            {jobs.slice(0, 5).map(job => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors group"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-800 group-hover:text-[#7731E8] transition-colors text-sm">
                    {job.title}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">{job.jobId}</span>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  job.status === "OPEN"  || job.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : job.status === "HOLD" || job.status === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {job.status === "Active" ? "OPEN" : job.status}
                </span>
              </Link>
            ))}
          </div>

          {jobs.length > 5 && (
            <Link
              to="/jobs"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7731E8] hover:underline"
            >
              View all {jobs.length} jobs →
            </Link>
          )}
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Briefcase size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No jobs assigned to you yet.</p>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;