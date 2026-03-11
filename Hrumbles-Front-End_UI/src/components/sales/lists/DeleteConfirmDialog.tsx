// src/components/sales/lists/DeleteConfirmDialog.tsx
import React, { useEffect } from "react";
import { AlertTriangle, X, Loader2, Trash2 } from "lucide-react";
import { useManageWorkspaces } from "@/hooks/sales/useManageWorkspaces";

export interface DeleteTarget {
  id: string;
  name: string;
  type: "workspace" | "file";
  fileCount?: number; // only for workspace, to show in warning
}

interface DeleteConfirmDialogProps {
  target: DeleteTarget;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  target, onConfirm, onCancel,
}) => {
  const { deleteWorkspace, deleteFile } = useManageWorkspaces();
  const isPending  = deleteWorkspace.isPending || deleteFile.isPending;
  const isWorkspace = target.type === "workspace";

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={15} className="text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 flex-1">
            Delete {isWorkspace ? "folder" : "list"}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">"{target.name}"</span>?
          </p>

          {isWorkspace && (
            <div className="flex gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">
                {target.fileCount
                  ? `All ${target.fileCount} list${target.fileCount !== 1 ? "s" : ""} inside this folder will also be permanently removed.`
                  : "All lists inside this folder will also be permanently removed."
                }
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400">This action cannot be undone.</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};