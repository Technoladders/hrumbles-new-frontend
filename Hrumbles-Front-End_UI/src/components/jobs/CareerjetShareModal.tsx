// src/components/jobs/CareerjetShareModal.tsx
// Drop-in modal for sharing a specific job to CareerJet and seeing its apply link.

import { useState } from "react";
import { Copy, Check, Globe, ExternalLink, X, Rss } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/jobs/ui/dialog";
import { Button } from "@/components/jobs/ui/button";
import { Badge } from "@/components/jobs/ui/badge";
import { toast } from "sonner";
import { JobData } from "@/lib/types";

interface CareerjetShareModalProps {
  job: JobData;
  orgSlug: string;          // e.g. "demo" or "technoladders"
  supabaseUrl: string;      // import.meta.env.VITE_SUPABASE_URL
  isOpen: boolean;
  onClose: () => void;
}

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <span className="text-sm text-gray-700 truncate flex-1 font-mono">{value}</span>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200 transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>
    </div>
  );
};

export const CareerjetShareModal = ({
  job,
  orgSlug,
  supabaseUrl,
  isOpen,
  onClose,
}: CareerjetShareModalProps) => {
  const feedUrl = `${supabaseUrl}/functions/v1/careerjet-xml-feed?org=${orgSlug}`;
  const applyWebhookUrl = `${supabaseUrl}/functions/v1/careerjet-apply-webhook?job_id=${job.id}&org=${orgSlug}`;
  const jobViewUrl = `https://${orgSlug}.xrilic.ai/jobs/${job.id}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            {/* CareerJet brand color */}
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: "#e05200" }}>
              <Rss className="h-4 w-4 text-white" />
            </div>
            CareerJet — Share Job
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Job info pill */}
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-800 truncate">{job.title}</span>
              <span className="text-xs text-gray-500">{job.jobId}</span>
            </div>
            <Badge className="bg-orange-100 text-orange-700 text-xs shrink-0">
              {Array.isArray(job.location) ? job.location[0] : job.location}
            </Badge>
          </div>

          {/* Step 1: XML Feed */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">1</span>
              <span className="text-sm font-semibold text-gray-700">Submit this feed URL to CareerJet</span>
            </div>
            <CopyRow label="XML Feed URL (all your active jobs)" value={feedUrl} />
            <p className="text-xs text-gray-400 pl-1">
              Go to <strong>CareerJet Partner Dashboard → Job Feed → Add Feed URL</strong> and paste the above.
              All active jobs for your org will be indexed automatically.
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Step 2: Apply webhook */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">2</span>
              <span className="text-sm font-semibold text-gray-700">Set the Apply Webhook (optional — for direct apply)</span>
            </div>
            <CopyRow label="Apply Webhook URL (this job only)" value={applyWebhookUrl} />
            <p className="text-xs text-gray-400 pl-1">
              When CareerJet candidates click "Apply", their details are posted here and automatically appear
              in this job's candidate list with <strong>applied_from = CareerJet</strong>.
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Job direct view link */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Detail Link</span>
            <div className="flex items-center gap-2">
              <CopyRow label="" value={jobViewUrl} />
              <a
                href={jobViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* How it works box */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-xs text-gray-500">
            <p className="font-semibold text-gray-600 text-sm mb-2">📋 How it works</p>
            <p>① Your XML feed lists all active jobs → CareerJet indexes them daily</p>
            <p>② Candidate applies on CareerJet → webhook fires to the URL above</p>
            <p>③ Candidate record created in <code className="bg-white px-1 rounded">hr_candidates</code></p>
            <p>④ Application linked in <code className="bg-white px-1 rounded">hr_job_candidates</code> → appears in job's candidate list</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose} className="rounded-full px-6 bg-gray-800 hover:bg-gray-700 text-white">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};