// src/pages/sales/ListsPage.tsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import {
  Plus, ChevronDown, FolderOpen, Folder,
  Users, Building2, Edit2, Trash2,
  FilePlus, Search, ListChecks, Hash, X, Loader2,
  UserPlus, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaces, type Workspace } from "@/hooks/sales/useWorkspaces";
import { useWorkspaceFiles, type WorkspaceFile } from "@/hooks/sales/useWorkspaceFiles";
import { useListRecordCounts } from "@/hooks/sales/useListRecordCounts";
import { useManageWorkspaces } from "@/hooks/sales/useManageWorkspaces";
import { useMyListAccess, mergePermissions, type EffectivePermissions } from "@/hooks/sales/useMyListAccess";
import { WorkspaceItemDialog, type DialogConfig } from "@/components/sales/lists/WorkspaceItemDialog";
import { DeleteConfirmDialog, type DeleteTarget } from "@/components/sales/lists/DeleteConfirmDialog";
import { ShareDialog, type ShareTarget } from "@/components/sales/lists/ShareDialog";

// ─────────────────────────────────────────────────────────────────────────────
// CreatorAvatar
// ─────────────────────────────────────────────────────────────────────────────

const CreatorAvatar: React.FC<{
  employee: { first_name: string; last_name: string; profile_picture_url: string | null } | null;
  createdAt: string;
}> = ({ employee, createdAt }) => {
  const [showTip, setShowTip] = useState(false);
  if (!employee) return null;
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const initials  = `${employee.first_name[0] ?? ""}${employee.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <div className="w-5 h-5 rounded-full overflow-hidden border border-white ring-1 ring-slate-200 flex-shrink-0 cursor-default">
        {employee.profile_picture_url
          ? <img src={employee.profile_picture_url} alt={fullName} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
              <span className="text-[7px] font-bold text-white leading-none">{initials}</span>
            </div>
          )}
      </div>
      {showTip && (
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap pointer-events-none">
          <p className="text-[11px] font-semibold leading-tight">{fullName}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{moment(createdAt).fromNow()}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FileRow
// ─────────────────────────────────────────────────────────────────────────────

const FileRow: React.FC<{
  file: WorkspaceFile;
  count: number | undefined;
  isAdmin: boolean;
  perms: EffectivePermissions | null;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}> = ({ file, count, isAdmin, perms, onEdit, onDelete, onShare }) => {
  const navigate = useNavigate();
  const path = file.type === "people"
    ? `/lists/contacts/file/${file.id}`
    : `/lists/companies/file/${file.id}`;

  const canWrite  = isAdmin || (perms?.can_write ?? false);
  const canDelete = isAdmin || (perms?.can_delete ?? false);

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
      onClick={() => navigate(path)}
    >
      <div className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px",
        file.type === "people" ? "bg-blue-400" : "bg-emerald-400",
      )} />
      <span className="flex-1 text-[11px] font-medium text-slate-700 group-hover:text-indigo-700 truncate transition-colors min-w-0">
        {file.name}
      </span>

      {/* Record count */}
      <div className="flex items-center gap-0.5 text-[10px] text-slate-400 flex-shrink-0">
        {count === undefined
          ? <Loader2 size={9} className="animate-spin text-slate-300" />
          : <><Hash size={9} /><span className="font-semibold text-slate-600">{count.toLocaleString()}</span></>}
      </div>

      {/* Employee inherited badge */}
      {!isAdmin && perms && !perms.isDirect && (
        <span className="text-[9px] text-slate-400 italic flex-shrink-0" title="Access via folder">inherited</span>
      )}

      <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
        <CreatorAvatar employee={file.created_by_employee} createdAt={file.created_at} />
      </div>

      {/* Action icons */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        {isAdmin && (
          <button onClick={onShare} title="Share" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
            <UserPlus size={11} />
          </button>
        )}
        {canWrite && (
          <button onClick={onEdit}   title="Rename" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit2 size={11} /></button>
        )}
        {canDelete && (
          <button onClick={onDelete} title="Delete" className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={11} /></button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceCard
// ─────────────────────────────────────────────────────────────────────────────

const WorkspaceCard: React.FC<{
  workspace: Workspace;
  files: WorkspaceFile[];
  recordCounts: Record<string, number>;
  isAdmin: boolean;
  currentUserId: string;
  perms: EffectivePermissions | null;
  fileAccessMap: Map<string, EffectivePermissions>;
  onEditWorkspace: () => void;
  onDeleteWorkspace: () => void;
  onAddFile: () => void;
  onEditFile: (f: WorkspaceFile) => void;
  onDeleteFile: (f: WorkspaceFile) => void;
  onShareWorkspace: () => void;
  onShareFile: (f: WorkspaceFile) => void;
}> = ({
  workspace, files, recordCounts,
  isAdmin, currentUserId, perms, fileAccessMap,
  onEditWorkspace, onDeleteWorkspace, onAddFile,
  onEditFile, onDeleteFile, onShareWorkspace, onShareFile,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const wsCanWrite  = isAdmin || (perms?.can_write ?? false);
  const wsCanDelete = isAdmin || (perms?.can_delete ?? false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-2 hover:border-slate-300 transition-colors">
      {/* Header row */}
      <div className="group/ws flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setIsOpen(v => !v)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <ChevronDown size={12} className={cn("text-slate-400 transition-transform duration-200 flex-shrink-0", !isOpen && "-rotate-90")} />
          {isOpen
            ? <FolderOpen size={13} className="text-amber-400 flex-shrink-0" />
            : <Folder     size={13} className="text-amber-400 flex-shrink-0" />}
          <span className="text-xs font-semibold text-slate-800 truncate">{workspace.name}</span>
          <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-0.5">
            {files.length}
          </span>
        </button>

        <CreatorAvatar employee={workspace.created_by_employee} createdAt={workspace.created_at} />

        {/* Action icons — permission-gated */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/ws:opacity-100 transition-opacity flex-shrink-0">
          {isAdmin && (
            <>
              <button onClick={onShareWorkspace} title="Share folder" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><UserPlus size={12} /></button>
              <button onClick={onAddFile}        title="Add list"     className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><FilePlus size={12} /></button>
            </>
          )}
          {wsCanWrite && (
            <button onClick={onEditWorkspace}   title="Rename folder" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit2 size={12} /></button>
          )}
          {wsCanDelete && (
            <button onClick={onDeleteWorkspace} title="Delete folder" className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
          )}
        </div>
      </div>

      {/* File list */}
      {isOpen && (
        <div className="border-t border-slate-100">
          {files.length === 0 ? (
            <div className="flex flex-col items-center py-5 gap-1.5">
              <ListChecks size={13} className="text-slate-300" />
              <p className="text-[10px] text-slate-400">No lists yet</p>
              {isAdmin && (
                <button onClick={onAddFile} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                  + Add first list
                </button>
              )}
            </div>
          ) : (
            files.map(file => {
              const directPerms = fileAccessMap.get(file.id);
              // Own files always get full write+delete — regardless of share status
              const isOwnFile = file.created_by === currentUserId;
              const effectivePerms = isAdmin || isOwnFile
                ? null  // null = full access in FileRow
                : mergePermissions(perms ?? undefined, directPerms);
              return (
                <FileRow
                  key={file.id}
                  file={file}
                  count={recordCounts[file.id]}
                  isAdmin={isAdmin}
                  perms={effectivePerms}
                  onEdit={() => onEditFile(file)}
                  onDelete={() => onDeleteFile(file)}
                  onShare={() => onShareFile(file)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionColumn
// ─────────────────────────────────────────────────────────────────────────────

const SectionColumn: React.FC<{
  type: "people" | "companies";
  allFiles: WorkspaceFile[];
  recordCounts: Record<string, number>;
  search: string;
  isAdmin: boolean;
  currentUserId: string;
  workspaceAccess: Map<string, EffectivePermissions>;
  fileAccess: Map<string, EffectivePermissions>;
  onOpenDialog: (cfg: DialogConfig) => void;
  onDeleteTarget: (t: DeleteTarget) => void;
  onShareTarget: (t: ShareTarget) => void;
}> = ({
  type, allFiles, recordCounts, search,
  isAdmin, currentUserId, workspaceAccess, fileAccess,
  onOpenDialog, onDeleteTarget, onShareTarget,
}) => {
  const { data: allWorkspaces = [], isLoading } = useWorkspaces(type);

  const isPeople = type === "people";
  const q = search.toLowerCase().trim();

  // For employees: show workspace if:
  //   (a) it is directly shared with them, OR
  //   (b) at least one file inside it is directly shared with them, OR
  //   (c) they created at least one file inside it
  //       → folder is visible but read-only (no edit/delete on the folder itself)
  const workspaces = useMemo(() => {
    if (isAdmin) return allWorkspaces;
    return allWorkspaces.filter(ws => {
      if (workspaceAccess.has(ws.id)) return true;
      return allFiles.some(f =>
        f.type === type &&
        f.workspace_id === ws.id &&
        (fileAccess.has(f.id) || f.created_by === currentUserId)
      );
    });
  }, [allWorkspaces, isAdmin, workspaceAccess, fileAccess, allFiles, type, currentUserId]);

  // Build file map for this type + search
  const filesByWsId = useMemo(() => {
    const map = new Map<string, WorkspaceFile[]>();
    workspaces.forEach(ws => map.set(ws.id, []));

    allFiles
      .filter(f => {
        if (f.type !== type) return false;
        if (q && !f.name.toLowerCase().includes(q)) return false;
        // Show file if: shared with user OR created by user OR workspace is shared
        if (!isAdmin && !workspaceAccess.has(f.workspace_id) && !fileAccess.has(f.id) && f.created_by !== currentUserId) return false;
        return true;
      })
      .forEach(f => {
        const arr = map.get(f.workspace_id) ?? [];
        arr.push(f);
        map.set(f.workspace_id, arr);
      });

    return map;
  }, [allFiles, workspaces, type, q, isAdmin, workspaceAccess, fileAccess, currentUserId]);

  const totalLists = workspaces.reduce((acc, ws) => acc + (filesByWsId.get(ws.id) ?? []).length, 0);

  return (
    <div>
      {/* Column header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 rounded-xl mb-3 border",
        isPeople ? "bg-blue-50/70 border-blue-100" : "bg-emerald-50/70 border-emerald-100",
      )}>
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isPeople ? "bg-blue-100" : "bg-emerald-100")}>
            {isPeople ? <Users size={13} className="text-blue-600" /> : <Building2 size={13} className="text-emerald-600" />}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-tight">{isPeople ? "People" : "Companies"}</p>
            <p className={cn("text-[9px] font-semibold leading-tight", isPeople ? "text-blue-500" : "text-emerald-500")}>
              {totalLists} list{totalLists !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* New list button — admin only */}
        {isAdmin && (
          <button
            onClick={() => onOpenDialog({ mode: "create-list", fileType: type })}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors",
              isPeople ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
            )}
          >
            <Plus size={10} /> New list
          </button>
        )}

        {/* Employee: read-only badge */}
        {!isAdmin && (
          <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
            <Lock size={9} /> Shared with you
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-slate-300" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && workspaces.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 bg-white border border-dashed border-slate-200 rounded-xl gap-2">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isPeople ? "bg-blue-50" : "bg-emerald-50")}>
            {isPeople ? <Users size={14} className="text-blue-400" /> : <Building2 size={14} className="text-emerald-400" />}
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {isAdmin ? "No folders yet" : "Nothing shared with you yet"}
          </p>
          {isAdmin && (
            <button
              onClick={() => onOpenDialog({ mode: "create-folder", fileType: type })}
              className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700"
            >
              + Create a folder
            </button>
          )}
        </div>
      )}

      {/* Workspace cards */}
      {!isLoading && workspaces.map(ws => {
        const wsFiles = filesByWsId.get(ws.id) ?? [];
        // null = admin (full). Direct share = granted perms.
        // Visible-via-file-only = folder is read-only (can't rename/delete the folder itself)
        const wsPerms = isAdmin
          ? null
          : workspaceAccess.get(ws.id) ?? { can_read: true, can_write: false, can_delete: false, isDirect: false };

        return (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            files={wsFiles}
            recordCounts={recordCounts}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            perms={wsPerms}
            fileAccessMap={fileAccess}
            onEditWorkspace={() => onOpenDialog({ mode: "rename-folder", fileType: type, currentItem: ws })}
            onDeleteWorkspace={() => onDeleteTarget({ id: ws.id, name: ws.name, type: "workspace", fileCount: wsFiles.length })}
            onAddFile={() => onOpenDialog({ mode: "create-list", fileType: type, workspaceId: ws.id })}
            onEditFile={file => onOpenDialog({ mode: "rename-list", fileType: type, currentItem: file })}
            onDeleteFile={file => onDeleteTarget({ id: file.id, name: file.name, type: "file" })}
            onShareWorkspace={() => onShareTarget({ id: ws.id, name: ws.name, type: "workspace" })}
            onShareFile={file => onShareTarget({ id: file.id, name: file.name, type: "file" })}
          />
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const ListsPage: React.FC = () => {
  const userRole    = useSelector((state: any) => state.auth.role);
  const currentUser = useSelector((state: any) => state.auth.user);
  const isAdmin     = userRole === "admin" || userRole === "organization_superadmin";
  const currentUserId: string = currentUser?.id ?? "";

  const { data: files = [], isLoading: isLoadingFiles } = useWorkspaceFiles();
  const { data: recordCounts = {} }                     = useListRecordCounts(files);
  const { deleteWorkspace, deleteFile }                 = useManageWorkspaces();

  // Employee access map (no-op for admins — they always have full access)
  const { data: myAccess } = useMyListAccess();
  const workspaceAccess = myAccess?.workspaceAccess ?? new Map();
  const fileAccess      = myAccess?.fileAccess      ?? new Map();

  const [search,         setSearch]         = useState("");
  const [dialogConfig,   setDialogConfig]   = useState<DialogConfig | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<DeleteTarget | null>(null);
  const [shareTarget,    setShareTarget]    = useState<ShareTarget | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node))
        setCreateMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "workspace") {
      deleteWorkspace.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    } else {
      deleteFile.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
            <ListChecks size={13} className="text-white" />
          </div>
          <h1 className="text-sm font-bold text-slate-800">My Lists</h1>
          {!isAdmin && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              View only
            </span>
          )}
        </div>

        <div className="relative max-w-xs w-full">
          <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search lists…"
            className="w-full pl-7 pr-7 h-8 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"><X size={12} /></button>}
        </div>

        <div className="flex-1" />

        {/* Create dropdown — admin only */}
        {isAdmin && (
          <div ref={createMenuRef} className="relative">
            <button
              onClick={() => setCreateMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Plus size={12} /> Create
              <ChevronDown size={11} className={cn("transition-transform", createMenuOpen && "rotate-180")} />
            </button>

            {createMenuOpen && (
              <div className="absolute right-0 top-9 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-56">
                <p className="px-3 py-1 text-[9px] font-bold text-blue-400 uppercase tracking-widest">People</p>
                <button onClick={() => { setDialogConfig({ mode: "create-folder", fileType: "people" }); setCreateMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors">
                  <Folder size={12} className="text-amber-500 flex-shrink-0" />
                  <div className="text-left"><p className="text-xs font-semibold">New folder</p><p className="text-[10px] text-slate-400">For people lists</p></div>
                </button>
                <button onClick={() => { setDialogConfig({ mode: "create-list", fileType: "people" }); setCreateMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors">
                  <Users size={12} className="text-blue-500 flex-shrink-0" />
                  <div className="text-left"><p className="text-xs font-semibold">New list</p><p className="text-[10px] text-slate-400">Contacts & leads</p></div>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <p className="px-3 py-1 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Companies</p>
                <button onClick={() => { setDialogConfig({ mode: "create-folder", fileType: "companies" }); setCreateMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors">
                  <Folder size={12} className="text-amber-500 flex-shrink-0" />
                  <div className="text-left"><p className="text-xs font-semibold">New folder</p><p className="text-[10px] text-slate-400">For company lists</p></div>
                </button>
                <button onClick={() => { setDialogConfig({ mode: "create-list", fileType: "companies" }); setCreateMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors">
                  <Building2 size={12} className="text-emerald-500 flex-shrink-0" />
                  <div className="text-left"><p className="text-xs font-semibold">New list</p><p className="text-[10px] text-slate-400">Accounts & orgs</p></div>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Two-column grid ─────────────────────────────────────────────────── */}
      <main className="px-6 py-5 max-w-7xl mx-auto">
        {isLoadingFiles ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs text-slate-500">Loading your lists…</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 items-start">
            <SectionColumn
              type="people"
              allFiles={files}
              recordCounts={recordCounts}
              search={search}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              workspaceAccess={workspaceAccess}
              fileAccess={fileAccess}
              onOpenDialog={setDialogConfig}
              onDeleteTarget={setDeleteTarget}
              onShareTarget={setShareTarget}
            />
            <SectionColumn
              type="companies"
              allFiles={files}
              recordCounts={recordCounts}
              search={search}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              workspaceAccess={workspaceAccess}
              fileAccess={fileAccess}
              onOpenDialog={setDialogConfig}
              onDeleteTarget={setDeleteTarget}
              onShareTarget={setShareTarget}
            />
          </div>
        )}
      </main>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      {dialogConfig  && <WorkspaceItemDialog config={dialogConfig}  onClose={() => setDialogConfig(null)} />}
      {deleteTarget  && <DeleteConfirmDialog target={deleteTarget}  onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
      {shareTarget   && <ShareDialog         target={shareTarget}   onClose={() => setShareTarget(null)} />}
    </div>
  );
};

export default ListsPage;
