import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, PhoneCall, Target, ClipboardCheck, Footprints } from 'lucide-react';

export const ViewRecruitmentReport = ({ data }: { data: any }) => {
  if (!data) return null;

  const renderTable = (headers: string[], rows: any[][]) => (
    <div className="w-full overflow-x-auto border rounded-lg mt-2">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 font-medium border-b">
          <tr>
            {headers.map((h, i) => <th key={i} className="px-4 py-2">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length > 0 ? rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50">
              {row.map((cell, j) => <td key={j} className="px-4 py-2 text-slate-700">{cell || '-'}</td>)}
            </tr>
          )) : (
            <tr><td colSpan={headers.length} className="px-4 py-4 text-center text-slate-400 italic">No entries recorded</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 mt-8 border-t pt-8">
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <ClipboardCheck className="w-6 h-6 text-indigo-600" />
        Daily Recruitment Work Report Details
      </h3>

      {/* 1 & 2: Work Status & ATS Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-purple-50/30 border-purple-100">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-purple-700">1️⃣ Work Status</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><b>Profiles Worked:</b> {data.workStatus?.profilesWorkedOn}</p>
            <p><b>Profiles Uploaded:</b> {data.workStatus?.profilesUploaded}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/30 border-blue-100">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-blue-700">2️⃣ ATS Report</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><b>ATS Resumes:</b> {data.atsReport?.resumesATS}</p>
            <p><b>Talent Pool:</b> {data.atsReport?.resumesTalentPool}</p>
          </CardContent>
        </Card>
      </div>

      {/* 3: Candidate Status */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
          <Users className="w-4 h-4" /> 3️⃣ Candidate Status
        </h4>
        <div className="space-y-6">
          <div>
            <Badge variant="outline" className="mb-1 uppercase text-[10px]">Paid & Unpaid Lists</Badge>
            {renderTable(["Name", "Mobile No.", "Notes"], [
              ...(data.candidateStatus?.paid || []).map((c: any) => [c.name, c.mobile, c.notes]),
              ...(data.candidateStatus?.unpaid || []).map((c: any) => [c.name, c.mobile, c.notes])
            ])}
          </div>
          <div>
            <Badge variant="outline" className="mb-1 uppercase text-[10px]">Lined Up & On Field</Badge>
            {renderTable(["Name", "Mobile No.", "Status/Date", "Notes"], [
              ...(data.candidateStatus?.linedUp || []).map((c: any) => [c.name, c.mobile, `Lined Up (${c.date})`, c.notes]),
              ...(data.candidateStatus?.onField || []).map((c: any) => [c.name, c.mobile, c.status?.replace('_', ' ').toUpperCase(), c.notes])
            ])}
          </div>
        </div>
      </div>

      {/* 4: Activity Summary */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
          <PhoneCall className="w-4 h-4" /> 4️⃣ Activity Summary (Total Calls: {data.activitySummary?.totalCalls})
        </h4>
        {renderTable(["Candidate", "Mobile", "Status", "Proof"], 
          (data.activitySummary?.candidates || []).map((c: any) => [c.name, c.mobile, c.callStatus, c.proofAttached ? '✅ Attached' : '❌ No']))}
      </div>

      {/* 5: Scheduling */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
          <Calendar className="w-4 h-4" /> 5️⃣ Tomorrow's Scheduling
        </h4>
        {renderTable(["Name", "Position", "Proof", "Time Shared", "JD Shared"], 
          (data.scheduling || []).map((s: any) => [s.name, s.position, s.confirmationProof, s.timeShared, s.jdShared]))}
      </div>

      {/* 6 & 7: Walk-ins & Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-orange-700">6️⃣ Expected Walk-Ins</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p><b>Count:</b> {data.walkIns?.expected}</p>
            <p><b>Follow-up:</b> {data.walkIns?.reminderNeeded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-rose-700">7️⃣ Quality Check</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p><b>Reviewed:</b> {data.qualityCheck?.reviewedCount}</p>
            <p className="truncate"><b>Candidates:</b> {data.qualityCheck?.candidateNames}</p>
          </CardContent>
        </Card>
      </div>

      {/* 8: Targets */}
      <div className="bg-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-green-400" />
          <h4 className="font-bold">8️⃣ Deadlines & Targets</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm">
          <div><p className="text-slate-400 text-xs uppercase">Pending Deadlines</p><p className="font-medium">{data.targets?.pendingDeadlines || '-'}</p></div>
          <div><p className="text-slate-400 text-xs uppercase">Profiles to Source</p><p className="font-medium">{data.targets?.['profiles to source'] || 0}</p></div>
          <div><p className="text-slate-400 text-xs uppercase">Calls to Make</p><p className="font-medium">{data.targets?.['Calls to make'] || 0}</p></div>
          <div><p className="text-slate-400 text-xs uppercase">Lineups</p><p className="font-medium">{data.targets?.['Lineups to achieve'] || 0}</p></div>
          <div><p className="text-slate-400 text-xs uppercase">Expected Closures</p><p className="font-medium">{data.targets?.['Expected closures'] || 0}</p></div>
        </div>
      </div>
    </div>
  );
};