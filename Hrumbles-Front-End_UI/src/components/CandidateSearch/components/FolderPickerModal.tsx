/**
 * FolderPickerModal.tsx
 *
 * Modal to pick an existing folder or create a new one.
 * Used in DetailPanelV2 (Shortlist) and SavedCandidatesPage (Add to folder row action).
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Search, FolderOpen, Briefcase, Plus, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderItem } from "../hooks/useFolders";

interface FolderPickerModalProps {
  folders:       FolderItem[];
  isCreating?:   boolean;    // show loading state on create button
  onSelect:      (folderId: string, folderName: string) => void;
  onCreate:      (name: string) => Promise<void>;
  onSkip?:       () => void; // "No folder / Save without folder"
  onClose:       () => void;
  title?:        string;
  showSkip?:     boolean;
}

export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
  folders, isCreating, onSelect, onCreate, onSkip, onClose,
  title = "Save to Folder",
  showSkip = true,
}) => {
  const [search,      setSearch]      = useState("");
  const [newName,     setNewName]     = useState("");
  const [showCreate,  setShowCreate]  = useState(false);
  const [creating,    setCreating]    = useState(false);

  const filtered = folders.filter(f =>
    f.folderName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await onCreate(newName.trim());
    setCreating(false);
    setNewName("");
    setShowCreate(false);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-[1100]"
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1101] w-[calc(100vw-32px)] max-w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#6D28D9,#7C3AED)" }}
        >
          <div>
            <p className="text-[13px] font-bold text-white">{title}</p>
            <p className="text-[10px] text-white/60 mt-0.5">Choose a folder or create new</p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X size={12} className="text-white/80" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100 relative">
          <Search size={12} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search folders…"
            className="w-full pl-7 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>

        {/* Folder list */}
        <div className="max-h-[280px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[12px] text-slate-400">
              No folders found
            </div>
          )}
          {filtered.map(f => (
            <button
              key={f.folderId}
              onClick={() => onSelect(f.folderId, f.folderName)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50/60 transition-colors border-b border-slate-50 last:border-0 text-left"
            >
              {/* Folder icon with color dot */}
              <div className="flex-shrink-0 relative">
                {f.linkedJobId
                  ? <Briefcase size={16} className="text-blue-500" />
                  : <FolderOpen size={16} style={{ color: f.folderColor }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 truncate">{f.folderName}</p>
                {f.linkedJobTitle && (
                  <p className="text-[10px] text-slate-400">{f.linkedJobTitle}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                {f.candidateCount}
              </span>
            </button>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-3 py-2.5 border-t border-slate-100 space-y-2">
          {/* Create new folder */}
          {showCreate ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="New folder name…"
                className="flex-1 px-2.5 py-1.5 text-[12px] border border-violet-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                {creating ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                Save
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] hover:bg-slate-200 transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-violet-300 text-[12px] font-medium text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <Plus size={12} /> Create new folder
            </button>
          )}

          {/* Skip */}
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              Save without a folder
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};