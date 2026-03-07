// src/components/sales/contacts-v2/ContactsV2Header.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMode } from '@/Redux/contactsV2Slice';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Users, Globe, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactsV2HeaderProps {
  fileId?: string | null;
  fileName?: string | null;
  workspaceName?: string | null;
  isFetching?: boolean;
  onImport?: () => void;
}

export function ContactsV2Header({ fileId, fileName, workspaceName, isFetching, onImport }: ContactsV2HeaderProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mode } = useSelector((state: any) => state.contactsV2);

  const title = fileId && fileName ? fileName : mode === 'discovery' ? 'People Search' : 'Contacts';

  return (
    <header className="relative flex-shrink-0 bg-slate-900 border-b border-slate-800 z-30">
      {/* Top progress bar */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-800 overflow-hidden">
          <div className="h-full bg-violet-500 animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 h-14">
        {/* Left */}
        <div className="flex items-center gap-4 min-w-0">
          {fileId && (
            <button
              onClick={() => navigate('/lists')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-xs"
            >
              <ArrowLeft size={14} />
              Lists
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              {fileId && workspaceName && (
                <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md">
                  <FolderOpen size={9} />
                  {workspaceName}
                </span>
              )}
              <h1 className="text-sm font-black text-slate-100 tracking-tight truncate">{title}</h1>
            </div>
          </div>

          {/* Mode toggle (only when not viewing a specific file) */}
          {!fileId && (
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => dispatch(setMode('crm'))}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all',
                  mode === 'crm'
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <Users size={11} />
                CRM
              </button>
              <button
                onClick={() => dispatch(setMode('discovery'))}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all',
                  mode === 'discovery'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/50'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <Globe size={11} />
                Search People
              </button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {(fileId || mode === 'crm') && (
            <button
              onClick={onImport}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-xs font-medium"
            >
              <UploadCloud size={12} />
              Import
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </header>
  );
}