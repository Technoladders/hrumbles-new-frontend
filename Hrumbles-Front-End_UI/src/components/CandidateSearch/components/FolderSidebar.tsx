/**
 * FolderSidebar.tsx
 *
 * Left sidebar in SavedCandidatesPage.
 * Shows folder list with candidate counts.
 * Clicking a folder sets it as the active filter (via URL param).
 */

import React, { useState } from "react";
import {
  FolderOpen, Briefcase, Users, Plus,
  Loader2, Pencil, Trash2, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderItem } from "../hooks/useFolders";

interface FolderSidebarProps {
  folders:        FolderItem[];
  activeFolderId: string | null;   // null = "All"
  isLoading:      boolean;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => Promise<string | null>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  totalCount:     number;          // count when no folder selected
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  folders, activeFolderId, isLoading,
  onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder,
  totalCount,
}) => {
  const [showCreate,   setShowCreate]   = useState(false);
  const [newName,      setNewName]      = useState("");
  const [creating,     setCreating]     = useState(false);
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameVal,    setRenameVal]    = useState("");
  const [hoverId,      setHoverId]      = useState<string | null>(null);

  const jobFolders    = folders.filter(f => f.linkedJobId && !f.isDefault);
  const customFolders = folders.filter(f => !f.linkedJobId && !f.isDefault);
  const defaultFolder = folders.find(f => f.isDefault);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await onCreateFolder(newName.trim());
    setCreating(false);
    setNewName("");
    setShowCreate(false);
  };

  const handleRename = async (id: string) => {
    if (!renameVal.trim()) return;
    await onRenameFolder(id, renameVal.trim());
    setRenamingId(null);
  };

  const FolderRow: React.FC<{ folder: FolderItem }> = ({ folder }) => {
    const isActive  = activeFolderId === folder.folderId;
    const isRenaming = renamingId === folder.folderId;
    const isHovered = hoverId === folder.folderId;

    if (isRenaming) {
      return (
        <div className="flex items-center gap-1 px-2 py-1">
          <input
            autoFocus
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleRename(folder.folderId); if (e.key === "Escape") setRenamingId(null); }}
            className="flex-1 text-[11px] px-1.5 py-1 border border-violet-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <button onClick={() => handleRename(folder.folderId)} className="p-0.5 text-violet-600 hover:text-violet-800"><Check size={11} /></button>
          <button onClick={() => setRenamingId(null)} className="p-0.5 text-slate-400 hover:text-slate-600"><X size={11} /></button>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all",
          isActive
            ? "bg-violet-100 text-violet-700"
            : "text-slate-600 hover:bg-slate-100"
        )}
        onClick={() => onSelectFolder(folder.folderId)}
        onMouseEnter={() => setHoverId(folder.folderId)}
        onMouseLeave={() => setHoverId(null)}
      >
        {/* Icon */}
        <span className="flex-shrink-0">
          {folder.linkedJobId
            ? <Briefcase size={13} className={isActive ? "text-blue-600" : "text-blue-400"} />
            : <FolderOpen size={13} style={{ color: isActive ? folder.folderColor : undefined }} className={!isActive ? "text-slate-400" : ""} />
          }
        </span>

        {/* Name */}
        <span className={cn("flex-1 text-[12px] font-medium truncate min-w-0", isActive && "font-semibold")}>
          {folder.folderName}
        </span>

        {/* Count or actions on hover */}
        {isHovered && !folder.isDefault && !folder.linkedJobId ? (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setRenamingId(folder.folderId); setRenameVal(folder.folderName); }}
              className="p-0.5 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-colors"
            >
              <Pencil size={10} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDeleteFolder(folder.folderId); if (activeFolderId === folder.folderId) onSelectFolder(null); }}
              className="p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ) : (
          <span className={cn(
            "text-[10px] font-semibold px-1 rounded-full flex-shrink-0",
            isActive ? "bg-violet-200 text-violet-700" : "text-slate-400"
          )}>
            {folder.candidateCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-52 flex-shrink-0 h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">

        {/* All */}
        <div
          onClick={() => onSelectFolder(null)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all",
            activeFolderId === null
              ? "bg-violet-100 text-violet-700"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Users size={13} className={activeFolderId === null ? "text-violet-600" : "text-slate-400"} />
          <span className={cn("flex-1 text-[12px] font-medium", activeFolderId === null && "font-semibold")}>All Candidates</span>
          <span className={cn("text-[10px] font-semibold px-1 rounded-full", activeFolderId === null ? "bg-violet-200 text-violet-700" : "text-slate-400")}>
            {isLoading ? "…" : totalCount}
          </span>
        </div>

        {/* Default / Unsorted */}
        {defaultFolder && <FolderRow folder={defaultFolder} />}

        {/* Job folders */}
        {jobFolders.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">By Job</p>
            </div>
            {jobFolders.map(f => <FolderRow key={f.folderId} folder={f} />)}
          </>
        )}

        {/* Custom folders */}
        {customFolders.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Custom</p>
            </div>
            {customFolders.map(f => <FolderRow key={f.folderId} folder={f} />)}
          </>
        )}
      </div>

      {/* Create folder */}
      <div className="flex-shrink-0 border-t border-slate-100 p-2">
        {showCreate ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowCreate(false); setNewName(""); }}}
              placeholder="Folder name…"
              className="w-full text-[11px] px-2 py-1.5 border border-violet-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                {creating ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] hover:bg-slate-200 transition-colors"
              >
                <X size={9} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-violet-600 hover:bg-violet-50 border border-dashed border-slate-200 hover:border-violet-300 transition-all"
          >
            <Plus size={11} /> New Folder
          </button>
        )}
      </div>
    </div>
  );
};