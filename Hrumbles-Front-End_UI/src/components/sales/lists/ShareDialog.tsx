// src/components/sales/lists/ShareDialog.tsx
import React, { useState, useMemo } from "react";
import {
  X, Search, UserPlus, Users, Check, Loader2,
  Shield, Edit2, Trash2, Eye, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShareableUsers, type ShareableUser } from "@/hooks/sales/useShareableUsers";
import { useListPermissions, type ShareRecord } from "@/hooks/sales/useListPermissions";
import { useManagePermissions } from "@/hooks/sales/useManagePermissions";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ShareTarget {
  id: string;
  name: string;
  type: "workspace" | "file";
}

interface Props {
  target: ShareTarget;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const UserAvatar: React.FC<{
  user: { first_name: string; last_name: string; profile_picture_url?: string | null };
  size?: "sm" | "md";
}> = ({ user, size = "sm" }) => {
  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();
  const dim = size === "md" ? "w-8 h-8 text-[10px]" : "w-6 h-6 text-[8px]";
  return (
    <div className={cn("rounded-full overflow-hidden flex-shrink-0", dim)}>
      {user.profile_picture_url
        ? <img src={user.profile_picture_url} alt="" className="w-full h-full object-cover" />
        : (
          <div className={cn("w-full h-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center font-bold text-white", dim)}>
            {initials}
          </div>
        )}
    </div>
  );
};

const PermToggle: React.FC<{
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  color: string;
}> = ({ icon, label, checked, disabled, onChange, color }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    title={disabled ? "Read access is always required" : label}
    className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all",
      disabled && "opacity-60 cursor-not-allowed",
      checked && !disabled ? color : "border-slate-200 text-slate-400 bg-white hover:border-slate-300",
    )}
  >
    {icon}
    {label}
    {checked && <Check size={9} className="ml-0.5" />}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Existing share row
// ─────────────────────────────────────────────────────────────────────────────

const ShareRow: React.FC<{
  share: ShareRecord;
  resourceType: "workspace" | "file";
  resourceId: string;
}> = ({ share, resourceType, resourceId }) => {
  const { upsertShare, revokeShare } = useManagePermissions();
  const emp = share.employee;
  if (!emp) return null;

  const update = (field: "can_write" | "can_delete", val: boolean) => {
    upsertShare.mutate({
      resource_type: resourceType,
      resource_id:   resourceId,
      shared_with_user_id: share.shared_with_user_id,
      can_read:   true,
      can_write:  field === "can_write"  ? val : share.can_write,
      can_delete: field === "can_delete" ? val : share.can_delete,
    });
  };

  const isPending = upsertShare.isPending || revokeShare.isPending;

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <UserAvatar user={emp} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">
          {emp.first_name} {emp.last_name}
        </p>
        {emp.position && (
          <p className="text-[10px] text-slate-400 truncate">{emp.position}</p>
        )}
      </div>

      {/* Permission toggles */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <PermToggle
          icon={<Eye size={9} />}
          label="Read"
          checked={true}
          disabled={true}
          onChange={() => {}}
          color="border-blue-300 bg-blue-50 text-blue-600"
        />
        <PermToggle
          icon={<Edit2 size={9} />}
          label="Write"
          checked={share.can_write}
          onChange={v => update("can_write", v)}
          color="border-indigo-300 bg-indigo-50 text-indigo-600"
        />
        <PermToggle
          icon={<Trash2 size={9} />}
          label="Delete"
          checked={share.can_delete}
          onChange={v => update("can_delete", v)}
          color="border-red-300 bg-red-50 text-red-600"
        />
      </div>

      {/* Revoke button */}
      <button
        onClick={() => revokeShare.mutate({
          shareId: share.id, resourceType, resourceId,
        })}
        disabled={isPending}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Remove access"
      >
        {isPending ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Dialog
// ─────────────────────────────────────────────────────────────────────────────

export const ShareDialog: React.FC<Props> = ({ target, onClose }) => {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null); // userId being added

  const { data: allUsers = [], isLoading: usersLoading } = useShareableUsers();
  const { data: shares  = [], isLoading: sharesLoading  } = useListPermissions(target.type, target.id);
  const { upsertShare } = useManagePermissions();

  // IDs already shared
  const sharedUserIds = useMemo(() => new Set(shares.map(s => s.shared_with_user_id)), [shares]);

  // Not yet shared, filtered by search
  const availableUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allUsers.filter(u => {
      if (sharedUserIds.has(u.id)) return false;
      if (!q) return true;
      return (
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [allUsers, sharedUserIds, search]);

  const handleAdd = (user: ShareableUser) => {
    setAdding(user.id);
    upsertShare.mutate(
      {
        resource_type:       target.type,
        resource_id:         target.id,
        shared_with_user_id: user.id,
        can_read:   true,
        can_write:  false,
        can_delete: false,
      },
      { onSettled: () => setAdding(null) },
    );
  };

  const isLoading = usersLoading || sharesLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[85vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Shield size={13} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">Share access</h2>
            <p className="text-[10px] text-slate-400 truncate">
              {target.type === "workspace" ? "Folder" : "List"} · <span className="font-medium text-slate-600">{target.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Search ─────────────────────────────────────────────────────── */}
          <div className="px-5 pt-4 pb-2 flex-shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Sales & Marketing employees…"
                className="w-full pl-7 pr-3 h-8 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* ── Already shared ──────────────────────────────────────────────── */}
          {shares.length > 0 && (
            <div className="px-5 pb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 pt-2">
                Shared with ({shares.length})
              </p>
              <div className="divide-y divide-slate-100">
                {shares.map(share => (
                  <ShareRow
                    key={share.id}
                    share={share}
                    resourceType={target.type}
                    resourceId={target.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Available to add ────────────────────────────────────────────── */}
          <div className="px-5 pb-4">
            {shares.length > 0 && (
              <div className="border-t border-slate-100 my-2" />
            )}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 pt-1">
              {shares.length > 0 ? "Add more" : "Add people"}
              <span className="ml-1 font-normal normal-case text-slate-400">(Sales & Marketing)</span>
            </p>

            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-indigo-400" />
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="text-center py-6">
                <Users size={18} className="text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  {search ? "No employees match your search" : "All employees already have access"}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {availableUsers.map(user => {
                  const isAdding = adding === user.id;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <UserAvatar user={user} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{user.position || user.email}</p>
                      </div>
                      <button
                        onClick={() => handleAdd(user)}
                        disabled={isAdding}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 text-[10px] font-semibold rounded-lg transition-colors flex-shrink-0"
                      >
                        {isAdding
                          ? <Loader2 size={10} className="animate-spin" />
                          : <UserPlus size={10} />}
                        Share
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer note ─────────────────────────────────────────────────── */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] text-slate-400">
            <span className="font-semibold text-slate-500">Read</span> is always on. Toggle{" "}
            <span className="font-semibold text-slate-500">Write</span> to allow renaming,{" "}
            <span className="font-semibold text-slate-500">Delete</span> to allow deletion.
            {target.type === "workspace" && (
              <span className="ml-1">All lists inside this folder will be visible to shared users.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};