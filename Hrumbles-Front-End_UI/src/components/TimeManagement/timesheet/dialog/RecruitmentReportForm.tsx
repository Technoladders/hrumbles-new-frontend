import React from "react";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash, Calendar, Users, Phone } from "lucide-react";

// Animation Variants
const sectionVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const fieldHoverEffect = {
  hover: {
    scale: 1.02,
    boxShadow: "0px 5px 15px -5px rgba(123, 97, 255, 0.1)",
    transition: { type: "spring", stiffness: 400, damping: 15 },
  },
};

export const RecruitmentReportForm = ({ data, onChange, errors = {} }: any) => {
  const update = (section: string, field: string, value: any) => {
    onChange({ ...data, [section]: { ...data[section], [field]: value } });
  };

  /* ================= CANDIDATE STATUS HELPERS ================= */

  const renderStatusCandidates = (
    status: string,
    label: string,
    icon: React.ReactNode,
    isOnField = false
  ) => {
    const getStatusArray = (s: string) =>
      Array.isArray(data.candidateStatus?.[s]) ? data.candidateStatus[s] : [];

    const addToStatus = (s: string) => {
      const arr = getStatusArray(s);
      onChange({
        ...data,
        candidateStatus: {
          ...data.candidateStatus,
          [s]: [...arr, { name: "", mobile: "", date: "", notes: "", ...(isOnField ? { status: "" } : {}) }],
        },
      });
    };

    const updateCandidateField = (s: string, index: number, field: string, value: any) => {
      const arr = [...getStatusArray(s)];
      arr[index] = { ...arr[index], [field]: value };
      onChange({
        ...data,
        candidateStatus: { ...data.candidateStatus, [s]: arr },
      });
    };

    const removeFromStatus = (s: string, index: number) => {
      const arr = getStatusArray(s).filter((_: any, i: number) => i !== index);
      onChange({
        ...data,
        candidateStatus: { ...data.candidateStatus, [s]: arr },
      });
    };

    return (
      <motion.div variants={itemVariants} className="border rounded-lg p-4 bg-slate-50 mb-4 shadow-sm">
        <h5 className="flex items-center gap-2 text-sm font-bold mb-3">
          {icon} {label}
        </h5>
        <Button
          variant="outline"
          size="sm"
          className="mb-3"
          onClick={() => addToStatus(status)}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Candidate
        </Button>

        {(getStatusArray(status).length === 0) && (
          <p className="text-xs text-muted-foreground">No candidates added.</p>
        )}

        <div className="space-y-3">
          {getStatusArray(status).map((c: any, i: number) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className={`grid ${isOnField ? "grid-cols-5" : "grid-cols-4"} gap-3 border rounded-xl p-3 bg-white relative shadow-sm`}
            >
              {/* Name */}
              <div className="space-y-0.5">
                <Input
                  placeholder="Name *"
                  value={c.name || ""}
                  className={
                    errors[`candidateStatus.${status}.${i}.name`]
                      ? "border-red-500 bg-red-50/30"
                      : "focus:ring-2 focus:ring-purple-500"
                  }
                  onChange={(e) => updateCandidateField(status, i, "name", e.target.value)}
                />
                {errors[`candidateStatus.${status}.${i}.name`] && (
                  <p className="text-[10px] text-red-500 font-bold">Required field</p>
                )}
              </div>

              {/* Mobile */}
              <div className="space-y-0.5">
                <PhoneInput
                  international
                  defaultCountry="IN"
                  placeholder="Mobile No. *"
                  value={c.mobile || ""}
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-input disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors[`candidateStatus.${status}.${i}.mobile`]
                      ? "border-red-500 bg-red-50/30"
                      : "focus:ring-2 focus:ring-purple-500"
                  }`}
                  onChange={(v) => updateCandidateField(status, i, "mobile", v)}
                />
                {errors[`candidateStatus.${status}.${i}.mobile`] && (
                  <p className="text-[10px] text-red-500 font-bold">Required field</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-0.5">
                <Input
                  type="date"
                  placeholder="Date *"
                  value={c.date || ""}
                  className={
                    errors[`candidateStatus.${status}.${i}.date`]
                      ? "border-red-500 bg-red-50/30"
                      : "focus:ring-2 focus:ring-purple-500"
                  }
                  onChange={(e) => updateCandidateField(status, i, "date", e.target.value)}
                />
                {errors[`candidateStatus.${status}.${i}.date`] && (
                  <p className="text-[10px] text-red-500 font-bold">Required field</p>
                )}
              </div>

              {isOnField ? (
                <>
                  {/* Status Select */}
                  <div className="space-y-0.5">
                    <Select
                      value={c.status || ""}
                      onValueChange={(v) => updateCandidateField(status, i, "status", v)}
                    >
                      <SelectTrigger
                        className={
                          errors[`candidateStatus.${status}.${i}.status`]
                            ? "border-red-500 bg-red-50/30"
                            : "focus:ring-2 focus:ring-purple-500"
                        }
                      >
                                          <SelectValue placeholder="Interview Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attended">Interview Attended</SelectItem>
                  <SelectItem value="not_attended">Not Attended</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
                    </Select>
                    {errors[`candidateStatus.${status}.${i}.status`] && (
                      <p className="text-[10px] text-red-500 font-bold">Required field</p>
                    )}
                  </div>

                  {/* Notes for onField */}
                  <div className="space-y-0.5">
                    <Input
                      placeholder="Notes"
                      value={c.notes || ""}
                      className="focus:ring-2 focus:ring-purple-500"
                      onChange={(e) => updateCandidateField(status, i, "notes", e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                {/* Notes for non-onField */}
                <div className="space-y-0.5">
                  <Input
                    placeholder="Notes"
                    value={c.notes || ""}
                    className="focus:ring-2 focus:ring-purple-500"
                    onChange={(e) => updateCandidateField(status, i, "notes", e.target.value)}
                  />
                </div>
                </>
              )}

              <Button
                size="icon"
                variant="ghost"
                className="absolute -top-2 -right-2 text-red-500 hover:bg-red-50"
                onClick={() => removeFromStatus(status, i)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
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
          { name: "", mobile: "", callStatus: "", proofAttached: false },
        ],
      },
    });
  };

  const updateActivityCandidate = (index: number, field: string, value: any) => {
    const arr = [...getActivityCandidates()];
    arr[index] = { ...arr[index], [field]: value };
    onChange({
      ...data,
      activitySummary: { ...data.activitySummary, candidates: arr },
    });
  };

  const removeActivityCandidate = (index: number) => {
    onChange({
      ...data,
      activitySummary: {
        ...data.activitySummary,
        candidates: getActivityCandidates().filter((_: any, i: number) => i !== index),
      },
    });
  };

  const renderActivityCandidates = () => (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-3">
        <Label className="text-sm font-medium">Candidates Contacted Today</Label>
        <Button variant="outline" size="sm" onClick={addActivityCandidate}>
          <Plus className="w-4 h-4 mr-1" /> Add Candidate
        </Button>
      </div>
      {getActivityCandidates().length === 0 && (
        <p className="text-xs text-muted-foreground">No call activity added.</p>
      )}
      {getActivityCandidates().map((c: any, i: number) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="grid grid-cols-4 gap-3 border rounded-xl p-3 bg-white relative shadow-sm"
        >
          <Input
            placeholder="Candidate Name"
            value={c.name || ""}
            className="focus:ring-2 focus:ring-purple-500"
            onChange={(e) => updateActivityCandidate(i, "name", e.target.value)}
          />
          <div className="phone-input-container">
            <PhoneInput
              international
              defaultCountry="IN"
              placeholder="Mobile"
              value={c.mobile || ""}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
              onChange={(v) => updateActivityCandidate(i, "mobile", v)}
            />
          </div>
          <Select
            value={c.callStatus || ""}
            onValueChange={(v) => updateActivityCandidate(i, "callStatus", v)}
          >
            <SelectTrigger className="focus:ring-2 focus:ring-purple-500">
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
              onCheckedChange={(v) => updateActivityCandidate(i, "proofAttached", !!v)}
            />
            <Label className="text-xs">Proof Attached</Label>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="absolute -top-2 -right-2 text-red-500 hover:bg-red-50"
            onClick={() => removeActivityCandidate(i)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  );

  /* ================= SCHEDULING HELPERS ================= */

  const getSchedules = () => data.scheduling || [];

  const addSchedule = () => {
    onChange({
      ...data,
      scheduling: [
        ...getSchedules(),
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
    const arr = [...getSchedules()];
    arr[index] = { ...arr[index], [field]: value };
    onChange({ ...data, scheduling: arr });
  };

  const removeSchedule = (index: number) => {
    onChange({
      ...data,
      scheduling: getSchedules().filter((_: any, i: number) => i !== index),
    });
  };

  const renderSchedules = () => (
    <div className="space-y-3">
      <Button variant="outline" size="sm" className="mb-3" onClick={addSchedule}>
        <Plus className="w-4 h-4 mr-1" /> Add Candidate Scheduled for Tomorrow
      </Button>
      {getSchedules().length === 0 && (
        <p className="text-xs text-muted-foreground">No scheduling entries added.</p>
      )}
      {getSchedules().map((sch: any, i: number) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="border rounded-xl p-3 bg-white shadow-sm relative"
        >
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Input
              placeholder="Name"
              value={sch.name || ""}
              className="focus:ring-2 focus:ring-purple-500"
              onChange={(e) => updateScheduleField(i, "name", e.target.value)}
            />
            <div className="phone-input-container">
              <PhoneInput
                international
                defaultCountry="IN"
                placeholder="Mobile"
                value={sch.mobile || ""}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                onChange={(v) => updateScheduleField(i, "mobile", v)}
              />
            </div>
            <Input
              placeholder="Position"
              value={sch.position || ""}
              className="focus:ring-2 focus:ring-purple-500"
              onChange={(e) => updateScheduleField(i, "position", e.target.value)}
            />
          </div>
          <div className="col-span-3 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Label className="font-medium w-64">Confirmation Proof (Call / WhatsApp)</Label>
              <RadioGroup
                value={sch.confirmationProof || ""}
                onValueChange={(v) => updateScheduleField(i, "confirmationProof", v)}
                className="flex gap-4"
              >
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
            <div className="flex items-center gap-2">
              <Label className="font-medium w-64">Reporting Time Shared (Yes/No)</Label>
              <RadioGroup
                value={sch.timeShared || ""}
                onValueChange={(v) => updateScheduleField(i, "timeShared", v)}
                className="flex gap-4"
              >
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
            <div className="flex items-center gap-2">
              <Label className="font-medium w-64">JD & Location Shared (Yes/No)</Label>
              <RadioGroup
                value={sch.jdShared || ""}
                onValueChange={(v) => updateScheduleField(i, "jdShared", v)}
                className="flex gap-4"
              >
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
            className="absolute -top-2 -right-2 text-red-500 hover:bg-red-50"
            onClick={() => removeSchedule(i)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  );

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 border-t pt-6 bg-slate-50/50 p-6 rounded-2xl"
    >
      <motion.h3
        variants={itemVariants}
        className="text-2xl font-black text-slate-800 tracking-tight"
      >
        📍 Daily Recruitment Work Report
      </motion.h3>

      {/* 1️⃣ & 2️⃣ Work Status & ATS Report */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="p-5 bg-white rounded-xl shadow-sm border space-y-4">
          <Label className="font-bold text-purple-700">1️⃣ Work Status</Label>
          <InputBlock
            label="Profiles worked on as per the allocated job role *"
            value={data.workStatus?.profilesWorkedOn || ""}
            error={errors["workStatus.profilesWorkedOn"]}
            onChange={(v: any) => update("workStatus", "profilesWorkedOn", v)}
          />
          <InputBlock
            label="Number of Profiles Uploaded Today *"
            type="number"
            error={errors["workStatus.profilesUploaded"]}
            value={data.workStatus?.profilesUploaded || 0}
            onChange={(v: any) => update("workStatus", "profilesUploaded", v)}
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="p-5 bg-blue-50/50 rounded-xl shadow-sm border border-blue-100 space-y-4"
        >
          <Label className="font-bold text-blue-700">2️⃣ ATS Report</Label>
          <InputBlock
            label="Total resumes uploaded in ATS *"
            type="number"
            error={errors["atsReport.resumesATS"]}
            value={data.atsReport?.resumesATS || 0}
            onChange={(v: any) => update("atsReport", "resumesATS", v)}
          />
          <div className="space-y-1">
            <InputBlock
              label="Total Resumes in Talent Pool *"
              type="number"
              error={errors["atsReport.resumesTalentPool"]}
              value={data.atsReport?.resumesTalentPool || 0}
              onChange={(v: any) => update("atsReport", "resumesTalentPool", v)}
            />
            <p className="text-[10px] text-muted-foreground italic leading-snug">
              (This count <span className="font-medium">MUST</span> match the ATS dashboard report)
            </p>
          </div>
        </motion.div>
      </div>

      {/* 3️⃣ Candidate Status */}
      <motion.div variants={itemVariants} className="space-y-4">
        <Label className="font-bold px-2 text-purple-700">
          3️⃣ Candidate Status (All Fields Mandatory)
        </Label>
        {renderStatusCandidates("paid", "Paid Sheet", <Users className="w-4 h-4 text-purple-500" />)}
        {renderStatusCandidates("unpaid", "Unpaid Sheet", <Users className="w-4 h-4 text-blue-500" />)}
        {renderStatusCandidates("linedUp", "Lined Up", <Calendar className="w-4 h-4 text-green-500" />)}
        {renderStatusCandidates("onField", "On Field", <Users className="w-4 h-4 text-orange-500" />, true)}
      </motion.div>

      {/* 4️⃣ Candidate Activity Summary */}
      <motion.div variants={itemVariants} className="p-5 bg-indigo-50/50 rounded-xl shadow-sm border border-indigo-100 space-y-4">
        <Label className="font-bold text-indigo-700">4️⃣ Candidate Activity Summary</Label>
        <InputBlock
          label="Total Calls Made"
          type="number"
          value={data.activitySummary?.totalCalls || 0}
          onChange={(v: any) => update("activitySummary", "totalCalls", v)}
        />
        {renderActivityCandidates()}
      </motion.div>

      {/* 5️⃣ Scheduling & Follow-Ups */}
      <motion.div variants={itemVariants} className="p-5 bg-yellow-50/50 rounded-xl shadow-sm border border-yellow-100">
        <Label className="font-bold text-yellow-700">5️⃣ Scheduling & Follow-Ups</Label>
        {renderSchedules()}
      </motion.div>

      {/* 6️⃣ Expected Walk-Ins */}
      <motion.div variants={itemVariants} className="p-5 bg-white rounded-xl shadow-sm border space-y-4">
        <Label className="font-bold text-green-700">6️⃣ Expected Walk-Ins</Label>
        <InputBlock
          label="Expected walk-ins tomorrow *"
          type="number"
          error={errors["walkIns.expected"]}
          value={data.walkIns?.expected || 0}
          onChange={(v: any) => update("walkIns", "expected", v)}
        />
                <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="proof-attached"
              checked={data.walkIns?.proofAttached || false}
              onCheckedChange={(v) => update("walkIns", "proofAttached", !!v)}
            />
            <Label htmlFor="proof-attached">
              Proof of confirmation attached
            </Label>
          </div>
        </div>
        <InputBlock
          label="Mention if reminder follow-up is needed *"
          error={errors["walkIns.reminderNeeded"]}
          value={data.walkIns?.reminderNeeded || ""}
          onChange={(v: any) => update("walkIns", "reminderNeeded", v)}
          type="text"
          as="textarea"
          rows={2}
        />
      </motion.div>

      {/* 7️⃣ Quality Check */}
      <motion.div variants={itemVariants} className="p-5 bg-rose-50/50 rounded-xl shadow-sm border border-rose-100 space-y-4">
        <Label className="font-bold text-rose-700">7️⃣ Quality Check</Label>
        <InputBlock
          label="Number of profiles reviewed today *"
          type="number"
          error={errors["qualityCheck.reviewedCount"]}
          value={data.qualityCheck?.reviewedCount || 0}
          onChange={(v: any) => update("qualityCheck", "reviewedCount", v)}
        />
        <InputBlock
          label="Candidate Names Reviewed *"
          error={errors["qualityCheck.candidateNames"]}
          value={data.qualityCheck?.candidateNames || ""}
          onChange={(v: any) => update("qualityCheck", "candidateNames", v)}
        />
      </motion.div>

      {/* 8️⃣ Deadlines & Targets */}
      <motion.div
        variants={itemVariants}
        className="p-6 bg-green-50/50 border border-green-100 rounded-2xl"
      >
        <Label className="font-bold text-green-700 block mb-4">
          8️⃣ Deadlines & Targets
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputBlock
            label="Pending deadlines for current job roles *"
            error={errors["targets.pendingDeadlines"]}
            value={data.targets?.pendingDeadlines || ""}
            onChange={(v: any) => update("targets", "pendingDeadlines", v)}
          />
          {["profiles to source", "Calls to make", "Lineups to achieve", "Expected closures"].map((k) => (
            <InputBlock
              key={k}
              label={k.charAt(0).toUpperCase() + k.slice(1) + " *"}
              type="number"
              error={errors[`targets.${k}`]}
              value={data.targets?.[k] || 0}
              onChange={(v: any) => update("targets", k, v)}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const InputBlock = ({ label, value, onChange, type = "text", error, as = "input", rows }: any) => (
  <motion.div
    whileHover="hover"
    variants={fieldHoverEffect}
    className="space-y-1"
  >
    <Label className="text-xs font-semibold text-slate-500">{label}</Label>
    {as === "textarea" ? (
      <textarea
        rows={rows}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`flex min-h-[80px] w-full rounded-md border ${
          error ? "border-red-500 bg-red-50/30" : "border-input bg-background focus:ring-2 focus:ring-purple-500"
        } px-3 py-2 text-sm`}
      />
    ) : (
      <Input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={
          error
            ? "border-red-500 bg-red-50/30"
            : "focus:ring-2 focus:ring-purple-500"
        }
      />
    )}
    {error && (
      <p className="text-[10px] text-red-500 font-bold">Required field</p>
    )}
  </motion.div>
);