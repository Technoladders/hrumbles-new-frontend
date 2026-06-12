// src/pages/superadmin/YohrImportSessionsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Loader2, CheckCircle2, AlertCircle, Clock,
  ChevronRight, Upload, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import YohrCsvUploadModal from "@/components/candidates/talent-pool/YohrCsvUploadModal";

interface Session {
  id: string;
  filename: string;
  total_rows: number;
  s1_done: number; s1_failed: number;
  s2_done: number; s2_failed: number;
  s3_done: number; s3_failed: number;
  s4_done: number; s4_failed: number;
  status: string;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:    { label: "Queued",     bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400" },
  processing: { label: "Processing", bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500" },
  completed:  { label: "Completed",  bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500" },
  partial:    { label: "Partial",    bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500" },
  failed:     { label: "Failed",     bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500" },
};

const YohrImportSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { organization_id } = getAuthDataFromLocalStorage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("yohr-sessions-page")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "org_csv_import_sessions",
        filter: `org_id=eq.${organization_id}`,
      }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("org_csv_import_sessions")
      .select("*")
      .eq("org_id", organization_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSessions(data);
    setLoading(false);
  }

  const totalInserted = sessions.reduce((a, s) => a + (s.s4_done || 0), 0);
  const totalFailed   = sessions.reduce((a, s) => a + (s.s4_failed || 0), 0);

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">CSV Import History</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} · {totalInserted} candidates imported
              {totalFailed > 0 && <span className="text-red-500 ml-1">· {totalFailed} failures</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowUpload(true)}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Upload size={14} /> New Import
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total sessions",  value: sessions.length,   color: "text-gray-900" },
            { label: "Rows processed",  value: sessions.reduce((a, s) => a + (s.total_rows || 0), 0), color: "text-gray-900" },
            { label: "Inserted",        value: totalInserted,     color: "text-green-700" },
            { label: "Failures",        value: totalFailed,       color: totalFailed > 0 ? "text-red-600" : "text-gray-400" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-2xl font-semibold ${card.color}`}>{card.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Sessions table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText size={36} className="text-gray-200" />
              <p className="text-sm text-gray-400">No imports yet</p>
              <Button size="sm" onClick={() => setShowUpload(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
                <Upload size={14} className="mr-1.5" /> Upload your first CSV
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">File</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Rows</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Downloaded</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">AI Done</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Inserted</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Failed</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Uploaded</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => {
                  const meta = STATUS_META[s.status] || STATUS_META.pending;
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                      onClick={() => navigate(`/talent-pool/import-csv/${s.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileText size={14} className="text-violet-400 shrink-0" />
                          <span className="font-medium text-gray-800 truncate max-w-[200px]">{s.filename}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 text-gray-600">{s.total_rows}</td>
                      <td className="text-center px-3 py-3 text-gray-600">
                        {s.s2_done}
                        {s.s2_failed > 0 && <span className="text-red-400 ml-1">+{s.s2_failed}✗</span>}
                      </td>
                      <td className="text-center px-3 py-3 text-gray-600">
                        {s.s3_done}
                        {s.s3_failed > 0 && <span className="text-red-400 ml-1">+{s.s3_failed}✗</span>}
                      </td>
                      <td className="text-center px-3 py-3 text-green-700 font-medium">{s.s4_done}</td>
                      <td className="text-center px-3 py-3">
                        {s.s4_failed > 0
                          ? <span className="text-red-600 font-medium">{s.s4_failed}</span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-3">
                        <ChevronRight size={14} className="text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && <YohrCsvUploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
};

export default YohrImportSessionsPage;