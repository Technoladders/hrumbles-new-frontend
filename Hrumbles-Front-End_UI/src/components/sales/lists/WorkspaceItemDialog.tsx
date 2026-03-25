// src/components/sales/lists/WorkspaceItemDialog.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { Folder, Users, Building2, X, Loader2, ChevronDown, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useManageWorkspaces } from "@/hooks/sales/useManageWorkspaces";
import { useWorkspaces, type Workspace } from "@/hooks/sales/useWorkspaces";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DialogConfig {
  /** 'workspace' = create/rename a folder. 'file' = create/rename a list. */
  mode: 'create-folder' | 'create-list' | 'rename-folder' | 'rename-list';
  /** For 'create-list' and 'create-folder' — which column triggered this */
  fileType: 'people' | 'companies';
  /** For rename modes — item being renamed */
  currentItem?: { id: string; name: string } | null;
  /** For 'create-list' — pre-selected workspace */
  workspaceId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable pieces
// ─────────────────────────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{children}</p>
);

const TextInput = React.forwardRef<HTMLInputElement, {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
  error?: boolean;
  autoFocus?: boolean;
}>(({ value, onChange, onKeyDown, placeholder, error, autoFocus }, ref) => (
  <input
    ref={ref}
    value={value}
    onChange={e => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    autoFocus={autoFocus}
    className={cn(
      "w-full h-9 px-3 text-xs border rounded-lg bg-white text-slate-800 placeholder-slate-400 outline-none transition-all",
      error
        ? "border-red-300 ring-2 ring-red-100 focus:border-red-400"
        : "border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400",
    )}
  />
));
TextInput.displayName = "TextInput";

const FolderDropdown: React.FC<{
  workspaces: Workspace[];
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}> = ({ workspaces, value, onChange, error }) => (
  <div className="relative">
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "w-full appearance-none h-9 pl-3 pr-8 text-xs border rounded-lg bg-white text-slate-800 outline-none transition-all cursor-pointer",
        error ? "border-red-300 ring-2 ring-red-100" : "border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400",
      )}
    >
      <option value="">Select a folder…</option>
      {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
    </select>
    <ChevronDown size={12} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Dialog
// ─────────────────────────────────────────────────────────────────────────────

export const WorkspaceItemDialog: React.FC<{ config: DialogConfig; onClose: () => void }> = ({
  config, onClose,
}) => {
  const { mode, fileType, currentItem, workspaceId: preselectedWsId } = config;

  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser     = useSelector((state: any) => state.auth.user);

  const { addWorkspace, addFile, updateWorkspace, updateFile } = useManageWorkspaces();

  // Only fetch workspaces when creating a list (need folder selector)
  const { data: workspaces = [], isLoading: wsLoading } =
    useWorkspaces(fileType);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,        setName]        = useState("");
  const [folderId,    setFolderId]    = useState(preselectedWsId ?? "");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newWsName,   setNewWsName]   = useState("");
  const [error,       setError]       = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  // Init
  useEffect(() => {
    if (currentItem) setName(currentItem.name);
    else {
      setName("");
      setFolderId(preselectedWsId ?? workspaces[0]?.id ?? "");
      setCreatingNew(false);
      setNewWsName("");
    }
    setError(null);
    setTimeout(() => nameRef.current?.focus(), 60);
  }, [config]);

  // Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const isPending =
    addWorkspace.isPending || addFile.isPending ||
    updateWorkspace.isPending || updateFile.isPending;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setError(null);

    // Rename folder
    if (mode === "rename-folder") {
      if (!name.trim()) { setError("Name is required"); return; }
      updateWorkspace.mutate({ id: currentItem!.id, name: name.trim() }, { onSuccess: onClose });
      return;
    }

    // Rename list
    if (mode === "rename-list") {
      if (!name.trim()) { setError("Name is required"); return; }
      updateFile.mutate({ id: currentItem!.id, name: name.trim(), workspace_id: "" }, { onSuccess: onClose });
      return;
    }

    // Create folder
    if (mode === "create-folder") {
      if (!name.trim()) { setError("Folder name is required"); return; }
      addWorkspace.mutate(
        { name: name.trim(), type: fileType, organization_id, created_by: currentUser?.id },
        { onSuccess: onClose },
      );
      return;
    }

    // Create list
    if (mode === "create-list") {
      if (!name.trim()) { setError("List name is required"); return; }

      if (creatingNew) {
        if (!newWsName.trim()) { setError("Folder name is required"); return; }
        try {
          const ws = await addWorkspace.mutateAsync({
            name: newWsName.trim(), type: fileType, organization_id, created_by: currentUser?.id,
          });
          await addFile.mutateAsync({
            name: name.trim(), type: fileType,
            organization_id, workspace_id: ws.id, created_by: currentUser?.id,
          });
          onClose();
        } catch { /* errors shown by mutation hooks */ }
      } else {
        if (!folderId) { setError("Please select a folder"); return; }
        addFile.mutate(
          { name: name.trim(), type: fileType, organization_id, workspace_id: folderId, created_by: currentUser?.id },
          { onSuccess: onClose },
        );
      }
    }
  }, [mode, name, fileType, currentItem, folderId, creatingNew, newWsName,
      addWorkspace, addFile, updateWorkspace, updateFile,
      organization_id, currentUser, onClose]);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !isPending) handleSubmit(); };

  // ── Derived labels & icons ─────────────────────────────────────────────────
  const isPeople = fileType === "people";

  const titleMap = {
    "create-folder":  `New ${isPeople ? "people" : "companies"} folder`,
    "create-list":    `New ${isPeople ? "people" : "companies"} list`,
    "rename-folder":  "Rename folder",
    "rename-list":    "Rename list",
  };

  const submitMap = {
    "create-folder": "Create folder",
    "create-list":   "Create list",
    "rename-folder": "Save changes",
    "rename-list":   "Save changes",
  };

  const headerIcon = mode === "create-folder" || mode === "rename-folder"
    ? <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><Folder size={14} className="text-amber-500" /></div>
    : isPeople
      ? <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><Users size={14} className="text-blue-500" /></div>
      : <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><Building2 size={14} className="text-emerald-500" /></div>;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          {headerIcon}
          <h2 className="text-sm font-bold text-slate-800 flex-1">{titleMap[mode]}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">

          {/* ── RENAME ──────────────────────────────────────────────────────── */}
          {(mode === "rename-folder" || mode === "rename-list") && (
            <div>
              <FieldLabel>{mode === "rename-folder" ? "Folder name" : "List name"}</FieldLabel>
              <TextInput
                ref={nameRef}
                value={name}
                onChange={v => { setName(v); setError(null); }}
                onKeyDown={handleKey}
                placeholder={mode === "rename-folder" ? "e.g. Enterprise Accounts" : "e.g. Q2 Target List"}
                error={!!error}
              />
            </div>
          )}

          {/* ── CREATE FOLDER ────────────────────────────────────────────────── */}
          {mode === "create-folder" && (
            <div>
              <FieldLabel>Folder name</FieldLabel>
              <TextInput
                ref={nameRef}
                value={name}
                onChange={v => { setName(v); setError(null); }}
                onKeyDown={handleKey}
                placeholder={isPeople ? "e.g. Enterprise Contacts" : "e.g. Enterprise Accounts"}
                error={!!error}
              />
            </div>
          )}

          {/* ── CREATE LIST ──────────────────────────────────────────────────── */}
  {mode === "create-list" && (
  <>
    {/* Folder FIRST */}
    <div>
      <FieldLabel>Folder</FieldLabel>
      {wsLoading ? (
        <div className="flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-lg">
          <Loader2 size={12} className="animate-spin text-slate-400" />
          <span className="text-xs text-slate-400">Loading folders…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {!creatingNew && (
            <FolderDropdown
              workspaces={workspaces}
              value={folderId}
              onChange={v => { setFolderId(v); setError(null); }}
              error={!!error && !folderId && !creatingNew}
            />
          )}

          <button
            type="button"
            onClick={() => { setCreatingNew(v => !v); setError(null); }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all",
              creatingNew
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50",
            )}
          >
            <FolderPlus size={13} />
            {creatingNew ? "← Use existing folder" : "+ Create new folder"}
          </button>

          {creatingNew && (
            <TextInput
              value={newWsName}
              onChange={v => { setNewWsName(v); setError(null); }}
              onKeyDown={handleKey}
              placeholder={isPeople ? "e.g. Enterprise Contacts" : "e.g. Enterprise Accounts"}
              error={!!error && creatingNew && !newWsName.trim()}
              autoFocus
            />
          )}
        </div>
      )}
    </div>

    {/* List name SECOND */}
    <div>
      <FieldLabel>List name</FieldLabel>
      <TextInput
        ref={nameRef}
        value={name}
        onChange={v => { setName(v); setError(null); }}
        onKeyDown={handleKey}
        placeholder={isPeople ? "e.g. Q2 Target Contacts" : "e.g. Enterprise Accounts"}
        error={!!error && !name.trim()}
      />
    </div>
  </>
)}

          {/* Error */}
          {error && <p className="text-[11px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            {isPending && <Loader2 size={11} className="animate-spin" />}
            {submitMap[mode]}
          </button>
        </div>
      </div>
    </div>
  );
};