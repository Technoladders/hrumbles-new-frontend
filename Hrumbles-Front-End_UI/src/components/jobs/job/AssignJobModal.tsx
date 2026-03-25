import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/jobs/ui/dialog";
import { Button } from "@/components/jobs/ui/button";
import { Label } from "@/components/jobs/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/jobs/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/jobs/ui/select";
import { IndianRupee, Loader2, X, UserPlus, Users, Building2 } from "lucide-react";
import { Input } from "@/components/jobs/ui/input";
import { toast } from "sonner";
import { JobData } from "@/lib/types";
import {
  fetchEmployees,
  fetchTeams,
  fetchVendors,
  assignJob,
  fetchJobAssignments,
} from "@/services/assignmentService";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamOption {
  value: string;
  label: string;
  teamType: string;
  level: number;
  leadName: string | null;
}

interface AssignJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobData | null;
}

// Radix <SelectItem> forbids value=""
const NO_SELECT = "__none__";

// ── Small shared UI pieces ────────────────────────────────────────────────────

/** Section label — matches team-modal field labels */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
    {children}
  </p>
);

/** Pill chip for selected individuals */
const Chip: React.FC<{ label: string; onRemove: () => void; disabled?: boolean }> = ({
  label, onRemove, disabled,
}) => (
  <div className="flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-1 rounded-full text-[11px] font-medium">
    {label}
    <button
      onClick={onRemove}
      disabled={disabled}
      className="text-violet-400 hover:text-rose-500 transition-colors disabled:opacity-40"
    >
      <X className="h-3 w-3" />
    </button>
  </div>
);

/** Tab button — replaces shadcn Tabs so we can fully style it */
const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}> = ({ active, onClick, icon, label, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150",
      active
        ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-sm"
        : "text-slate-500 hover:bg-violet-50 hover:text-violet-600",
      disabled && "opacity-50 cursor-not-allowed",
    )}
  >
    {icon}
    {label}
  </button>
);

/** Radio option card */
const RadioCard: React.FC<{
  value: string;
  current: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ value, current, onChange, disabled, icon, label, children }) => {
  const active = current === value;
  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-all duration-150 cursor-pointer",
        active
          ? "border-violet-400 bg-violet-50/60 shadow-sm"
          : "border-slate-100 bg-white hover:border-violet-200",
        disabled && "opacity-50 pointer-events-none",
      )}
      onClick={() => !disabled && onChange(value)}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          active ? "border-violet-600" : "border-slate-300",
        )}>
          {active && <div className="h-2 w-2 rounded-full bg-violet-600" />}
        </div>
        <div className={cn(
          "p-1 rounded-md",
          active ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-500",
        )}>
          {icon}
        </div>
        <span className={cn(
          "text-xs font-bold",
          active ? "text-violet-700" : "text-slate-600",
        )}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export function AssignJobModal({ isOpen, onClose, job }: AssignJobModalProps) {
  const [activeTab, setActiveTab]                     = useState<"internal" | "external">("internal");
  const [assignmentType, setAssignmentType]           = useState("individual");
  const [selectedIndividuals, setSelectedIndividuals] = useState<{ value: string; label: string }[]>([]);
  const [selectedTeam, setSelectedTeam]               = useState(NO_SELECT);
  const [selectedVendor, setSelectedVendor]           = useState(NO_SELECT);
  const [budget, setBudget]                           = useState("");
  const [budgetType, setBudgetType]                   = useState("LPA");
  const [loading, setLoading]                         = useState(false);
  const [employees, setEmployees]                     = useState<{ value: string; label: string }[]>([]);
  const [teams, setTeams]                             = useState<TeamOption[]>([]);
  const [vendors, setVendors]                         = useState<{ value: string; label: string }[]>([]);
  const [dataLoading, setDataLoading]                 = useState(true);

  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user           = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    if (isOpen && organizationId) loadData();
  }, [isOpen, organizationId]);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [employeesData, teamsData, vendorsData] = await Promise.all([
        fetchEmployees(organizationId),
        fetchTeams(organizationId),
        fetchVendors(organizationId),
      ]);
      setEmployees(employeesData);
      setTeams(teamsData);
      setVendors(vendorsData);

      if (job?.id) {
        const assignmentData = await fetchJobAssignments(job.id);
        const { data: jobRow } = await supabase
          .from("hr_jobs").select("assigned_to").eq("id", job.id).single();
        const assignedTo = jobRow?.assigned_to;

        if (assignedTo) {
          if (assignedTo.type === "individual") {
            setActiveTab("internal");
            setAssignmentType("individual");
            setSelectedIndividuals(assignmentData.assignments || []);
          } else if (assignedTo.type === "team") {
            setActiveTab("internal");
            setAssignmentType("team");
            const storedIds = assignedTo.id?.split(",") ?? [];
            const directMatch = teamsData.find(t => t.value === assignedTo.id);
            if (directMatch) {
              setSelectedTeam(directMatch.value);
            } else if (storedIds.length > 0) {
              const { data: memberRows } = await supabase
                .from("hr_team_members")
                .select("team_id")
                .in("employee_id", storedIds)
                .limit(1);
              const teamId = memberRows?.[0]?.team_id;
              if (teamId && teamsData.find(t => t.value === teamId)) setSelectedTeam(teamId);
            }
          } else if (assignedTo.type === "vendor") {
            setActiveTab("external");
            setSelectedVendor(assignedTo.id || NO_SELECT);
          }
        }

        if (assignmentData.budget != null) setBudget(assignmentData.budget.toString());
        if (assignmentData.budgetType)     setBudgetType(assignmentData.budgetType);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load assignment options");
    } finally {
      setDataLoading(false);
    }
  };

  // ── Individual helpers ────────────────────────────────────────────────────

  const handleEmployeeSelect = (value: string) => {
    const emp = employees.find(e => e.value === value);
    if (emp && !selectedIndividuals.some(e => e.value === value))
      setSelectedIndividuals(prev => [...prev, emp]);
  };

  const removeEmployee = (value: string) =>
    setSelectedIndividuals(prev => prev.filter(e => e.value !== value));

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || (/^\d*$/.test(v) && Number(v) >= 0)) setBudget(v);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!budget || Number(budget) <= 0) {
      toast.error("Please enter a valid budget greater than 0");
      return;
    }
    if (activeTab === "internal") {
      if (assignmentType === "individual") {
        if (selectedIndividuals.length === 0) { toast.error("Please select at least one employee"); return; }
        await saveAssignment("individual",
          selectedIndividuals.map(e => e.value).join(","),
          selectedIndividuals.map(e => e.label).join(","),
          budget, budgetType);
      } else {
        if (!selectedTeam || selectedTeam === NO_SELECT) { toast.error("Please select a team"); return; }
        await saveTeamAssignment(selectedTeam, budget, budgetType);
      }
    } else {
      if (!selectedVendor || selectedVendor === NO_SELECT) { toast.error("Please select a vendor"); return; }
      const vendorName = vendors.find(v => v.value === selectedVendor)?.label ?? "";
      await saveAssignment("vendor", selectedVendor, vendorName, budget, budgetType);
    }
  };

  // ── Team expand + save ────────────────────────────────────────────────────

  const saveTeamAssignment = async (teamId: string, budget?: string, budgetType?: string) => {
    if (!job?.id) { toast.error("Job information is missing"); return; }
    setLoading(true);
    try {
      const { data: memberRows, error: memberErr } = await supabase
        .from("hr_team_members")
        .select(`employee:hr_employees!hr_team_members_employee_id_fkey(id, first_name, last_name, email)`)
        .eq("team_id", teamId);
      if (memberErr) throw new Error("Failed to fetch team members");

      const members = (memberRows ?? []).map(r => r.employee).filter(Boolean) as
        { id: string; first_name: string; last_name: string; email: string }[];

      if (members.length === 0) {
        toast.error("This team has no members. Add members before assigning.");
        setLoading(false);
        return;
      }

      const memberIds   = members.map(m => m.id).join(",");
      const memberNames = members.map(m => `${m.first_name} ${m.last_name}`).join(",");

      const { data: jobRow } = await supabase.from("hr_jobs").select("assigned_to").eq("id", job.id).single();
      const currentIds = jobRow?.assigned_to?.id ? jobRow.assigned_to.id.split(",") : [];
      const newMembers = members.filter(m => !currentIds.includes(m.id));
      const recipientEmails = newMembers.map(m => m.email).filter(Boolean);

      await assignJob(job.id, "team", memberIds, memberNames, budget, budgetType, user?.id);

      if (recipientEmails.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: me } = await supabase
          .from("hr_employees").select("first_name, last_name").eq("id", user?.id).single();
        await sendEmail(session?.access_token, recipientEmails, job.title, budget, budgetType,
          teams.find(t => t.value === teamId)?.label ?? "Team",
          me ? `${me.first_name} ${me.last_name}`.trim() : "Unknown");
      }

      toast.success(`Job assigned to team! ${recipientEmails.length > 0 ? `${recipientEmails.length} member(s) notified.` : ""}`);
      handleReset(); onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to assign job to team.");
    } finally {
      setLoading(false);
    }
  };

  const saveAssignment = async (
    type: "individual" | "team" | "vendor",
    id: string, name: string, budget?: string, budgetType?: string
  ) => {
    if (!job?.id) { toast.error("Job information is missing"); return; }
    setLoading(true);
    try {
      const { data: jobRow } = await supabase.from("hr_jobs").select("assigned_to").eq("id", job.id).single();
      let recipientEmails: string[] = [];
      let newAssigneeNames: string[] = [];

      if (type === "individual") {
        const currentIds = jobRow?.assigned_to?.id ? jobRow.assigned_to.id.split(",") : [];
        const newIds     = id.split(",");
        const newNames   = name.split(",");
        const addedIds   = newIds.filter(nid => !currentIds.includes(nid));
        newAssigneeNames = newNames.filter((_, i) => addedIds.includes(newIds[i]));
        if (addedIds.length > 0) {
          const { data: empData } = await supabase.from("hr_employees").select("email").in("id", addedIds);
          recipientEmails = (empData ?? []).map(e => e.email);
        }
      } else if (type === "vendor" && jobRow?.assigned_to?.id !== id) {
        const { data: v } = await supabase.from("hr_clients").select("email").eq("id", id).single();
        if (v?.email) recipientEmails = [v.email];
        newAssigneeNames = [name];
      }

      await assignJob(job.id, type, id, name, budget, budgetType, user?.id);

      if (recipientEmails.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: me } = await supabase
          .from("hr_employees").select("first_name, last_name").eq("id", user?.id).single();
        await sendEmail(session?.access_token, recipientEmails, job.title, budget, budgetType,
          newAssigneeNames.join(", "),
          me ? `${me.first_name} ${me.last_name}`.trim() : "Unknown");
      }

      toast.success(`Job assigned successfully!${recipientEmails.length > 0 ? " Notification sent." : ""}`);
      handleReset(); onClose();
    } catch (err: any) {
      toast.error(err.message?.includes("email")
        ? "Job assigned, but failed to send notification."
        : "Failed to assign job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (
    token: string | undefined,
    to: string[], title: string,
    budget?: string, budgetType?: string,
    assignedTo?: string, assignedBy?: string,
        jobId?: string,
        clientName?: string,
        pointOfContact?: string,
  ) => {
    await fetch(
      "https://kbpeyfietrwlhwcwqhjw.supabase.co/functions/v1/send-job-assignment-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGV5ZmlldHJ3bGh3Y3dxaGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NDA5NjEsImV4cCI6MjA1NDQxNjk2MX0.A-K4DO6D2qQZ66qIXY4BlmoHxc-W5B0itV-HAAM84YA",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          to,
          jobDetails: {
            title, budget: budget || "N/A", budgetType: budgetType || "N/A",
            assignedTo, assignedBy, assignedDate: format(new Date(), "yyyy-MM-dd"),
            jobId:          job?.jobId                          || "N/A",
    clientName:     job?.clientDetails?.clientName     || "N/A",
    pointOfContact: job?.clientDetails?.pointOfContact || "N/A",
          },
        }),
      }
    );
  };

  const handleReset = () => {
    setActiveTab("internal"); setAssignmentType("individual");
    setSelectedIndividuals([]); setSelectedTeam(NO_SELECT);
    setSelectedVendor(NO_SELECT); setBudget(""); setBudgetType("LPA");
  };

  const handleClose = () => { handleReset(); onClose(); };
  const teamIndent  = (level: number) => "\u00a0".repeat(level * 3);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0 border-0 shadow-xl">

        {/* ── Gradient header ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-bold leading-tight">
                Assign Job
              </DialogTitle>
              <DialogDescription className="text-violet-200 text-xs mt-0.5 truncate max-w-[340px]">
                {job?.title}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white gap-3">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-violet-200 border-t-violet-600" />
            <p className="text-xs text-slate-400">Loading assignment options…</p>
          </div>
        ) : (
          <div className="bg-white px-6 py-5 space-y-5">

            {/* ── Tab row ─────────────────────────────────────────────── */}
            <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
              <TabBtn
                active={activeTab === "internal"}
                onClick={() => setActiveTab("internal")}
                icon={<Users className="h-3.5 w-3.5" />}
                label="Internal"
                disabled={loading}
              />
              <TabBtn
                active={activeTab === "external"}
                onClick={() => setActiveTab("external")}
                icon={<Building2 className="h-3.5 w-3.5" />}
                label="External / Vendor"
                disabled={loading}
              />
            </div>

            {/* ── Internal panel ───────────────────────────────────────── */}
            {activeTab === "internal" && (
              <div className="space-y-3">
                <SectionLabel>Assignment Type</SectionLabel>

                {/* Individual card */}
                <RadioCard
                  value="individual" current={assignmentType}
                  onChange={setAssignmentType} disabled={loading}
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Assign to Individual(s)"
                >
                  <Select
                    onValueChange={handleEmployeeSelect}
                    disabled={assignmentType !== "individual" || loading}
                  >
                    <SelectTrigger className="h-8 text-sm border-slate-200 focus:ring-violet-400 bg-white">
                      <SelectValue placeholder="Select employees…" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length > 0 ? (
                        employees.map(emp => (
                          <SelectItem key={emp.value} value={emp.value} className="
    text-sm cursor-pointer
    focus:bg-violet-50 focus:text-violet-700
    hover:bg-violet-50 hover:text-violet-700
    data-[state=checked]:bg-violet-100
    data-[state=checked]:text-violet-800
  ">
                            {emp.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-employees" disabled>No employees found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {selectedIndividuals.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {selectedIndividuals.map(emp => (
                        <Chip
                          key={emp.value}
                          label={emp.label}
                          onRemove={() => removeEmployee(emp.value)}
                          disabled={loading}
                        />
                      ))}
                    </div>
                  )}
                </RadioCard>

                {/* Team card */}
                <RadioCard
                  value="team" current={assignmentType}
                  onChange={setAssignmentType} disabled={loading}
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Assign to Team"
                >
                  <Select
                    value={selectedTeam}
                    onValueChange={setSelectedTeam}
                    disabled={assignmentType !== "team" || loading}
                  >
                    <SelectTrigger className="h-auto min-h-8 py-1.5 text-sm border-slate-200 focus:ring-violet-400 bg-white">
                      <SelectValue placeholder="Select a team…">
                        {selectedTeam !== NO_SELECT && (() => {
                          const t = teams.find(x => x.value === selectedTeam);
                          if (!t) return null;
                          return (
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-medium text-slate-800">{t.label}</span>
                              {t.leadName && (
                                <span className="text-[10px] text-slate-800">Lead: {t.leadName}</span>
                              )}
                            </div>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-auto">
                      <SelectItem value={NO_SELECT} className="
    text-sm cursor-pointer
    focus:bg-violet-50 focus:text-violet-700
    hover:bg-violet-50 hover:text-violet-700
    data-[state=checked]:bg-violet-100
    data-[state=checked]:text-violet-800
  ">
                        <span className="text-slate-400 italic text-sm">Select a team…</span>
                      </SelectItem>
                      {teams.length > 0 ? (
                        teams.map(team => (
                          <SelectItem key={team.value} value={team.value} className="
    text-sm cursor-pointer
    focus:bg-violet-50 focus:text-violet-700
    hover:bg-violet-50 hover:text-violet-700
    data-[state=checked]:bg-violet-100
    data-[state=checked]:text-violet-800
  ">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-800">
                                {teamIndent(team.level)}{team.label}
                                {team.level > 0 && (
                                  <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                    sub
                                  </span>
                                )}
                              </span>
                              {team.leadName && (
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  Lead: {team.leadName}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-teams" disabled>No teams found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Member preview */}
                  {assignmentType === "team" && selectedTeam !== NO_SELECT && (
                    <TeamMemberPreview teamId={selectedTeam} />
                  )}
                </RadioCard>
              </div>
            )}

            {/* ── External panel ───────────────────────────────────────── */}
            {activeTab === "external" && (
              <div className="space-y-3">
                <SectionLabel>Vendor Selection</SectionLabel>

                <Select
                  value={selectedVendor}
                  onValueChange={setSelectedVendor}
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 text-sm border-slate-200 focus:ring-violet-400">
                    <SelectValue placeholder="Select a vendor…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELECT}>
                      <span className="text-slate-400 italic text-sm">Select a vendor…</span>
                    </SelectItem>
                    {vendors.length > 0 ? (
                      vendors.map(v => (
                        <SelectItem key={v.value} value={v.value} className="text-sm">
                          {v.label}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-vendors" disabled>No vendors found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Budget ──────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <SectionLabel>Budget</SectionLabel>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    className="pl-8 h-8 text-sm border-slate-200 focus-visible:ring-violet-400"
                    value={budget}
                    onChange={handleBudgetChange}
                    disabled={loading}
                    min="0"
                  />
                </div>
                <Select value={budgetType} onValueChange={setBudgetType} disabled={loading}>
                  <SelectTrigger className="w-28 h-8 text-sm border-slate-200 focus:ring-violet-400">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LPA">LPA</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Footer buttons ───────────────────────────────────────── */}
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <Button
                variant="outline" onClick={handleClose} disabled={loading}
                className="h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 px-4"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave} disabled={loading}
                className="h-8 text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0 shadow-sm px-4"
              >
                {loading
                  ? <><div className="animate-spin h-3 w-3 rounded-full border-b-2 border-white mr-1.5" />Saving…</>
                  : "Save Assignment"
                }
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Team member preview ───────────────────────────────────────────────────────

function TeamMemberPreview({ teamId }: { teamId: string }) {
  const [members, setMembers]       = useState<{ id: string; name: string }[]>([]);
  const [loadingM, setLoadingM]     = useState(false);

  useEffect(() => {
    if (!teamId || teamId === "__none__") return;
    setLoadingM(true);
    supabase
      .from("hr_team_members")
      .select(`employee:hr_employees!hr_team_members_employee_id_fkey(id, first_name, last_name)`)
      .eq("team_id", teamId)
      .then(({ data }) => {
        setMembers(
          (data ?? []).map(r => r.employee).filter(Boolean)
            .map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` }))
        );
        setLoadingM(false);
      });
  }, [teamId]);

  if (loadingM) return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
      <div className="animate-spin h-3 w-3 rounded-full border-b-2 border-violet-400" />
      Loading members…
    </div>
  );

  if (members.length === 0) return (
    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
      ⚠️ This team has no members. Add members before assigning.
    </p>
  );

  return (
    <div className="mt-2.5">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        Will assign to {members.length} member{members.length > 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {members.map(m => (
          <span
            key={m.id}
            className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 font-medium"
          >
            {m.name}
          </span>
        ))}
      </div>
    </div>
  );
}