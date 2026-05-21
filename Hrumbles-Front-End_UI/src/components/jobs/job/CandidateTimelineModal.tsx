// src/components/jobs/job/CandidateTimelineModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Also update fetchTimelineForCandidate in statusService.ts — add the
// reverted_by_user join to the select:
//
//   reverted_by_user:hr_employees!reverted_by(first_name, last_name)
//
// And add this to the .map() return:
//   reverted_by_name: item.reverted_by_user
//     ? `${item.reverted_by_user.first_name || ''} ${item.reverted_by_user.last_name || ''}`.trim()
//     : null,
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchTimelineForCandidate, createNoteTimelineEvent, updateNoteTimelineEvent } from '@/services/statusService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Edit, PlusCircle, RotateCcw,
  ArrowRight, StickyNote,
} from 'lucide-react';
import moment from 'moment';

interface CandidateTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: { id: string; name: string } | null;
}

// ─── TimelineEvent ────────────────────────────────────────────────────────────
const TimelineEvent = ({ event, candidateId }: { event: any; candidateId: string }) => {
  const user = useSelector((state: any) => state.auth.user);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(event.event_data?.text || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateNote = async () => {
    if (!editText.trim()) return;
    setIsSaving(true);
    const success = await updateNoteTimelineEvent(event.id, editText, user.id);
    if (success) {
      await queryClient.invalidateQueries({ queryKey: ['candidate-timeline', candidateId] });
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  // ── status_change renderer ─────────────────────────────────────────────────
  const renderStatusChangeEvent = () => {
    const isReverted = !!event.is_reverted;
    const revertedByName = event.reverted_by_name ?? null;
    const revertedAt = event.reverted_at ?? null;

    return (
      <>
        {/* Timeline dot */}
        <div
          className={`absolute -left-[9px] top-3 h-4 w-4 rounded-full border-2 border-white
            ${isReverted ? 'bg-gray-300' : 'bg-purple-500'}`}
        />

        <div className={`${isReverted ? 'opacity-50' : ''}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`text-sm font-semibold ${isReverted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              Status changed to&nbsp;
              <span className="font-bold">
                '{event.new_state?.subStatusName || 'N/A'}'
              </span>
            </p>

            {/* Reverted badge */}
            {isReverted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
                <RotateCcw className="h-2.5 w-2.5" />
                Reverted
                {revertedByName ? ` by ${revertedByName}` : ''}
                {revertedAt ? ` · ${moment(revertedAt).format('MMM D, YYYY')}` : ''}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-0.5">
            by {event.user_name} on {moment(event.created_at).format('ll [at] LT')}
          </p>

          {/* Previous → New status sub-line */}
          {event.previous_state?.subStatusName && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {event.previous_state.subStatusName}
              </span>
              <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium
                ${isReverted
                  ? 'text-gray-400 bg-gray-100 line-through'
                  : 'text-purple-700 bg-purple-50'}`}>
                {event.new_state?.subStatusName || 'N/A'}
              </span>
            </div>
          )}
        </div>
      </>
    );
  };

  // ── status_reverted renderer ───────────────────────────────────────────────
  const renderStatusRevertedEvent = () => {
    const from = event.previous_state;   // what was reverted FROM
    const to   = event.new_state;        // what was reverted TO
    const reason = event.event_data?.reason ?? null;

    return (
      <>
        {/* Amber dot */}
        <div className="absolute -left-[9px] top-3 h-4 w-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
          <RotateCcw className="h-2.5 w-2.5 text-white" />
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 mt-0.5">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <p className="text-sm font-semibold text-amber-800">
              Status reverted
            </p>
            <span className="text-xs text-amber-600">
              by {event.user_name}
            </span>
          </div>

          {/* FROM → TO pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium line-through">
              {from?.subStatusName ?? '—'}
            </span>
            <ArrowRight className="h-3 w-3 text-amber-400 flex-shrink-0" />
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              {to?.subStatusName ?? '—'}
            </span>
          </div>

          {/* Optional reason */}
          {reason && (
            <p className="mt-1.5 text-xs text-amber-700 italic">
              "{reason}"
            </p>
          )}

          <p className="mt-1.5 text-[10px] text-amber-500">
            {moment(event.created_at).format('ll [at] LT')}
          </p>
        </div>
      </>
    );
  };

  // ── note renderer ──────────────────────────────────────────────────────────
  const renderNoteEvent = () => (
    <>
      <div className="absolute -left-[9px] top-3 h-4 w-4 rounded-full bg-blue-500 border-2 border-white" />

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-sm font-semibold text-gray-800">Note Added</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            by {event.user_name} on {moment(event.created_at).format('ll [at] LT')}
          </p>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="xs" onClick={() => setIsEditing(true)}>
            <Edit className="h-3 w-3 mr-1" /> Edit
          </Button>
        )}
      </div>

      <div className="bg-gray-50 p-3 rounded-md mt-2 border">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateNote} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {event.event_data.text}
          </p>
        )}
        {event.event_data.updated_at && !isEditing && (
          <p className="text-right text-xs text-gray-400 mt-2">
            (Edited on {moment(event.event_data.updated_at).format('ll')})
          </p>
        )}
      </div>
    </>
  );

  // ── Dispatch to correct renderer ───────────────────────────────────────────
  const renderContent = () => {
    switch (event.event_type) {
      case 'note':           return renderNoteEvent();
      case 'status_reverted': return renderStatusRevertedEvent();
      case 'status_change':
      default:               return renderStatusChangeEvent();
    }
  };

  return (
    <div className="relative pl-8 py-3 border-l-2 border-gray-200">
      {renderContent()}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const CandidateTimelineModal: React.FC<CandidateTimelineModalProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  const user = useSelector((state: any) => state.auth.user);
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const { data: timelineEvents = [], isLoading } = useQuery({
    queryKey: ['candidate-timeline', candidate?.id],
    queryFn: () => fetchTimelineForCandidate(candidate!.id),
    enabled: !!candidate?.id && isOpen,
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    const success = await createNoteTimelineEvent(candidate!.id, newNote, user.id);
    if (success) {
      await queryClient.invalidateQueries({ queryKey: ['candidate-timeline', candidate!.id] });
      setNewNote('');
      setIsAddingNote(false);
    }
    setIsSaving(false);
  };

  // Split events for the legend count
  const revertCount = timelineEvents.filter(
    (e: any) => e.event_type === 'status_reverted'
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle>Timeline — {candidate?.name}</DialogTitle>
              {revertCount > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                  <RotateCcw className="h-3 w-3" />
                  {revertCount} status revert{revertCount > 1 ? 's' : ''} recorded
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Add Note */}
        <div className="p-1 border-b pb-4">
          {isAddingNote ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Add a new note to the timeline…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsAddingNote(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddNote}
                  disabled={isSaving || !newNote.trim()}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Note
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddingNote(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add a Note
            </Button>
          )}
        </div>

        {/* Events */}
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
          {isLoading && (
            <div className="flex justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          )}

          {!isLoading && timelineEvents.length === 0 && (
            <p className="text-center text-gray-500 py-10">No history found.</p>
          )}

          {!isLoading && timelineEvents.length > 0 && (
            <div>
              {timelineEvents.map((event: any) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  candidateId={candidate!.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        {!isLoading && timelineEvents.length > 0 && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500 inline-block" />
              Status change
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
              Reverted
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
              Note
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300 inline-block" />
              Undone entry
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};