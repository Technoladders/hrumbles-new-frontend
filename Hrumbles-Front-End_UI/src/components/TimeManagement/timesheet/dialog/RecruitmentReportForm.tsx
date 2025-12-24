import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Plus, Trash, Calendar, Users, Phone } from "lucide-react";

/* ================= MAIN COMPONENT ================= */

export const RecruitmentReportForm = ({ data, onChange }: any) => {
  const update = (section: string, field: string, value: any) => {
    onChange({
      ...data,
      [section]: { ...data[section], [field]: value },
    });
  };

  /* ================= CANDIDATE STATUS HELPERS ================= */

  const getStatusArray = (status: string) =>
    Array.isArray(data.candidateStatus?.[status])
      ? data.candidateStatus[status]
      : [];

  const addToStatus = (status: string, obj: any) => {
    onChange({
      ...data,
      candidateStatus: {
        ...data.candidateStatus,
        [status]: [...getStatusArray(status), obj],
      },
    });
  };

  const updateCandidateField = (
    status: string,
    index: number,
    field: string,
    value: any
  ) => {
    const arr = [...getStatusArray(status)];
    arr[index] = { ...arr[index], [field]: value };
    onChange({
      ...data,
      candidateStatus: { ...data.candidateStatus, [status]: arr },
    });
  };

  const removeFromStatus = (status: string, index: number) => {
    onChange({
      ...data,
      candidateStatus: {
        ...data.candidateStatus,
        [status]: getStatusArray(status).filter(
          (_: any, i: number) => i !== index
        ),
      },
    });
  };

  /* ================= ACTIVITY SUMMARY HELPERS ================= */

  const getActivityCandidates = () =>
    Array.isArray(data.activitySummary?.candidates)
      ? data.activitySummary.candidates
      : [];

  const addActivityCandidate = () => {
    onChange({
      ...data,
      activitySummary: {
        ...data.activitySummary,
        candidates: [
          ...getActivityCandidates(),
          {
            name: "",
            mobile: "",
            callStatus: "",
            proofAttached: false,
          },
        ],
      },
    });
  };

  const updateActivityCandidate = (
    index: number,
    field: string,
    value: any
  ) => {
    const arr = [...getActivityCandidates()];
    arr[index] = { ...arr[index], [field]: value };
    onChange({
      ...data,
      activitySummary: {
        ...data.activitySummary,
        candidates: arr,
      },
    });
  };

  const removeActivityCandidate = (index: number) => {
    onChange({
      ...data,
      activitySummary: {
        ...data.activitySummary,
        candidates: getActivityCandidates().filter(
          (_: any, i: number) => i !== index
        ),
      },
    });
  };

  /* ================= SCHEDULING HELPERS ================= */

  const addSchedule = () => {
    onChange({
      ...data,
      scheduling: [
        ...(data.scheduling || []),
        {
          name: "",
          mobile: "",
          position: "",
          confirmationProof: "",
          timeShared: "",
          jdShared: "",
        },
      ],
    });
  };

  const updateScheduleField = (index: number, field: string, value: any) => {
    const arr = [...(data.scheduling || [])];
    arr[index] = { ...arr[index], [field]: value };
    onChange({
      ...data,
      scheduling: arr,
    });
  };

  const removeSchedule = (index: number) => {
    onChange({
      ...data,
      scheduling: (data.scheduling || []).filter(
        (_: any, i: number) => i !== index
      ),
    });
  };

  /* ================= RENDER STATUS CANDIDATES ================= */

  const renderStatusCandidates = (
    status: string,
    label: string,
    icon: React.ReactNode,
    isOnField = false
  ) => (
    <StatusCard title={label} icon={icon}>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          addToStatus(status, {
            name: "",
            email: "",
            date: "",
            notes: "",
            ...(isOnField ? { attendance: "" } : {}),
          })
        }
      >
        <Plus className="w-4 h-4 mr-1" /> Add Candidate
      </Button>

      {getStatusArray(status).length === 0 && (
        <p className="text-xs text-muted-foreground">
          No candidates added.
        </p>
      )}

      {getStatusArray(status).map((c: any, i: number) => (
        <div
          key={i}
          className={`grid ${
            isOnField ? "grid-cols-5" : "grid-cols-4"
          } gap-2 border rounded-lg p-2 relative`}
        >
          <Input
            placeholder="Name"
            value={c.name || ""}
            onChange={(e) =>
              updateCandidateField(status, i, "name", e.target.value)
            }
          />
          <Input
            placeholder="Email"
            value={c.email || ""}
            onChange={(e) =>
              updateCandidateField(status, i, "email", e.target.value)
            }
          />
          <Input
            type={status === "linedUp" ? "date" : "date"}
            placeholder={status === "linedUp" ? "Date" : "Date"}
            value={c.date || ""}
            onChange={(e) =>
              updateCandidateField(status, i, "date", e.target.value)
            }
          />

          {isOnField ? (
            <>
              <Select
                value={c.attendance || ""}
                onValueChange={(v) =>
                  updateCandidateField(status, i, "attendance", v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Attendance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="left-early">Left Early</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Notes"
                value={c.notes || ""}
                onChange={(e) =>
                  updateCandidateField(status, i, "notes", e.target.value)
                }
              />
            </>
          ) : (
            <Input
              placeholder="Notes"
              value={c.notes || ""}
              onChange={(e) =>
                updateCandidateField(status, i, "notes", e.target.value)
              }
            />
          )}

          <Button
            size="icon"
            variant="ghost"
            className="absolute -top-2 -right-2 text-red-500"
            onClick={() => removeFromStatus(status, i)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </StatusCard>
  );

  /* ================= JSX ================= */

  return (
    <div className="space-y-8 border-t pt-6">
      <h3 className="text-xl font-bold bg-slate-100 p-3 rounded">
         Daily Recruitment Work Report
      </h3>

      {/* 1️⃣ Work Status */}
      <Section title="1️⃣ Work Status">
        <InputBlock
          label="Profiles worked on as per the allocated job role"
          value={data.workStatus?.profilesWorkedOn}
          onChange={(v) => update("workStatus", "profilesWorkedOn", v)}
        />
        <InputBlock
          label="Number of Profiles Uploaded Today"
          type="number"
          value={data.workStatus?.profilesUploaded}
          onChange={(v) => update("workStatus", "profilesUploaded", v)}
        />
      </Section>

      {/* 2️⃣ ATS Report */}
      <Section title="2️⃣ ATS Report" bg="blue">
        <InputBlock
          label="Total resumes uploaded in ATS"
          type="number"
          value={data.atsReport?.resumesATS}
          onChange={(v) => update("atsReport", "resumesATS", v)}
        />
         <div className="space-y-1">
        <InputBlock
          label="Total Resumes in Talent Pool"
          type="number"
          value={data.atsReport?.resumesTalentPool}
          onChange={(v) =>
            update("atsReport", "resumesTalentPool", v)
          }
        />
            <p className="text-[10px] text-muted-foreground italic leading-snug">
      (This count <span className="font-medium">MUST</span> match the ATS dashboard report)
    </p>
    </div>
      </Section>

      {/* 3️⃣ Candidate Status */}
      <Section title="3️⃣ Candidate Status" layout="stack">
        {renderStatusCandidates(
          "paid",
          "Paid Sheet",
          <Users className="w-4 h-4" />
        )}
        {renderStatusCandidates(
          "unpaid",
          "Unpaid Sheet",
          <Users className="w-4 h-4" />
        )}
        {renderStatusCandidates(
          "linedUp",
          "Lined Up",
          <Calendar className="w-4 h-4" />
        )}
        {renderStatusCandidates(
          "onField",
          "On Field",
          <Users className="w-4 h-4" />,
          true
        )}
      </Section>

      {/* 4️⃣ Candidate Activity Summary */}
      <Section title="4️⃣ Candidate Activity Summary" layout="stack">
        <InputBlock
          label="Total Calls Made"
          type="number"
          value={data.activitySummary?.totalCalls}
          onChange={(v) =>
            update("activitySummary", "totalCalls", v)
          }
        />
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">
            Candidates Contacted Today
          </Label>
          <Button variant="outline" size="sm" onClick={addActivityCandidate}>
            <Plus className="w-4 h-4 mr-1" /> Add Candidate
          </Button>
        </div>
        {getActivityCandidates().length === 0 && (
          <p className="text-xs text-muted-foreground">
            No call activity added.
          </p>
        )}
        {getActivityCandidates().map((c: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 border rounded-lg p-3 relative"
          >
            <Input
              placeholder="Candidate Name"
              value={c.name || ""}
              onChange={(e) =>
                updateActivityCandidate(i, "name", e.target.value)
              }
            />
            <Input
              placeholder="Mobile"
              value={c.mobile || ""}
              onChange={(e) =>
                updateActivityCandidate(i, "mobile", e.target.value)
              }
            />
            <Select
              value={c.callStatus || ""}
              onValueChange={(v) =>
                updateActivityCandidate(i, "callStatus", v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Call Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="not_connected">Not Connected</SelectItem>
                <SelectItem value="callback">Call Back Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center">
              <Checkbox
                checked={c.proofAttached || false}
                onCheckedChange={(v) =>
                  updateActivityCandidate(i, "proofAttached", !!v)
                }
              />
              <Label className="text-xs">Proof Attached</Label>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="absolute -top-2 -right-2 text-red-500"
              onClick={() => removeActivityCandidate(i)}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </Section>

      {/* 5️⃣ Scheduling & Follow-Ups */}
      <Section title="5️⃣ Scheduling & Follow-Ups" layout="stack">
        <Button variant="outline" size="sm" onClick={addSchedule}>
          <Plus className="w-4 h-4 mr-1" /> Add Candidate Scheduled for Tomorrow
        </Button>

        {(data.scheduling || []).length === 0 && (
          <p className="text-xs text-muted-foreground">
            No scheduling entries added.
          </p>
        )}

        {(data.scheduling || []).map((c: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-3 gap-2 border rounded-lg p-3 relative"
          >
            <Input
              placeholder="Name"
              value={c.name || ""}
              onChange={(e) =>
                updateScheduleField(i, "name", e.target.value)
              }
            />
            <Input
              placeholder="Mobile"
              value={c.mobile || ""}
              onChange={(e) =>
                updateScheduleField(i, "mobile", e.target.value)
              }
            />
            <Input
              placeholder="Position"
              value={c.position || ""}
              onChange={(e) =>
                updateScheduleField(i, "position", e.target.value)
              }
            />

            <div className="col-span-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Label className="text-xs font-medium w-48">Confirmation Proof (Call / WhatsApp)</Label>
                <RadioGroup value={c.confirmationProof || ""} onValueChange={(v) => updateScheduleField(i, "confirmationProof", v)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Call" id={`call-${i}`} />
                    <Label htmlFor={`call-${i}`}>Call</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="WhatsApp" id={`whatsapp-${i}`} />
                    <Label htmlFor={`whatsapp-${i}`}>WhatsApp</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Label className="text-xs font-medium w-48">Reporting Time Shared (Yes/No)</Label>
                <RadioGroup value={c.timeShared || ""} onValueChange={(v) => updateScheduleField(i, "timeShared", v)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id={`time-yes-${i}`} />
                    <Label htmlFor={`time-yes-${i}`}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id={`time-no-${i}`} />
                    <Label htmlFor={`time-no-${i}`}>No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Label className="text-xs font-medium w-48">JD & Location Shared (Yes/No)</Label>
                <RadioGroup value={c.jdShared || ""} onValueChange={(v) => updateScheduleField(i, "jdShared", v)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id={`jd-yes-${i}`} />
                    <Label htmlFor={`jd-yes-${i}`}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id={`jd-no-${i}`} />
                    <Label htmlFor={`jd-no-${i}`}>No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="absolute -top-2 -right-2 text-red-500"
              onClick={() => removeSchedule(i)}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </Section>

      {/* 6️⃣ Expected Walk-Ins */}
      <Section title="6️⃣ Expected Walk-Ins">
        <InputBlock
          label="Expected walk-ins tomorrow"
          type="number"
          value={data.walkins?.expected}
          onChange={(v) => update("walkins", "expected", v)}
        />
        <InputBlock
          label="Proof of confirmation attached"
          value={data.walkins?.proofAttached}
          onChange={(v) => update("walkins", "proofAttached", v)}
        />
        <InputBlock
          label="Mention if reminder follow-up is needed"
          value={data.walkins?.reminderNeeded}
          onChange={(v) => update("walkins", "reminderNeeded", v)}
        />
      </Section>

      {/* 7️⃣ Quality Check */}
      <Section title="7️⃣ Quality Check">
        <InputBlock
          label="Number of profiles reviewed today"
          type="number"
          value={data.qualityCheck?.reviewedCount}
          onChange={(v) => update("qualityCheck", "reviewedCount", v)}
        />
        <InputBlock
          label="Candidate Names Reviewed"
          value={data.qualityCheck?.candidateNames}
          onChange={(v) => update("qualityCheck", "candidateNames", v)}
        />
      </Section>

      {/* 8️⃣ Deadlines & Targets */}
      <Section title="8️⃣ Deadlines & Targets" bg="green">
        <InputBlock
          label="Pending deadlines for current job roles"
          value={data.targets?.pendingDeadlines}
          onChange={(v) => update("targets", "pendingDeadlines", v)}
        />
        {["profiles to source", "Calls to make", "Lineups to achieve", "Expected closures"].map((k) => (
          <InputBlock
            key={k}
            label={k.charAt(0).toUpperCase() + k.slice(1)}
            type="number"
            value={data.targets?.[k]}
            onChange={(v) => update("targets", k, v)}
          />
        ))}
      </Section>
    </div>
  );
};

/* ================= UI HELPERS ================= */

const Section = ({
  title,
  children,
  bg,
  layout = "grid",
}: any) => (
  <div
    className={`space-y-4 p-4 rounded-xl ${
      bg === "blue"
        ? "bg-blue-50"
        : bg === "green"
        ? "bg-green-50"
        : "bg-white"
    }`}
  >
    <h4 className="font-semibold text-sm">{title}</h4>
    <div
      className={
        layout === "grid"
          ? "grid grid-cols-2 gap-4"
          : "space-y-4"
      }
    >
      {children}
    </div>
  </div>
);

const StatusCard = ({ title, icon, children }: any) => (
  <div className="border rounded-lg p-3 bg-slate-50 mb-4">
    <h5 className="flex items-center gap-2 text-sm font-medium">
      {icon} {title}
    </h5>
    <div className="space-y-2 mt-2">{children}</div>
  </div>
);

const InputBlock = ({
  label,
  value,
  onChange,
  type = "text",
}: any) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const CheckboxBlock = ({
  label,
  checked,
  onChange,
}: any) => (
  <label className="flex items-center gap-2 text-sm">
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChange(!!v)}
    />
    {label}
  </label>
);