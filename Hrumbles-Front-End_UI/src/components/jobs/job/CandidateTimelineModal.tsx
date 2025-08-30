import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchTimelineForCandidate, createNoteTimelineEvent, updateNoteTimelineEvent } from '@/services/statusService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit, PlusCircle } from 'lucide-react';
import moment from 'moment';

interface CandidateTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: { id: string; name: string } | null;
}

// --- Sub-component for displaying a single timeline event ---
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

  const renderStatusChangeEvent = () => (
    <>
      <div className="absolute -left-[9px] top-3 h-4 w-4 rounded-full bg-purple-500 border-2 border-white"></div>
      <p className="text-sm font-semibold text-gray-800">
        Status changed to '{event.new_state?.subStatusName || 'N/A'}'
      </p>
      <p className="text-xs text-gray-500">
        by {event.user_name} on {moment(event.created_at).format('ll [at] LT')}
      </p>
    </>
  );

  const renderNoteEvent = () => (
    <>
      <div className="absolute -left-[9px] top-3 h-4 w-4 rounded-full bg-blue-500 border-2 border-white"></div>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-gray-800">Note Added</p>
          <p className="text-xs text-gray-500">
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
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleUpdateNote} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.event_data.text}</p>
        )}
        {event.event_data.updated_at && !isEditing && (
            <p className="text-right text-xs text-gray-400 mt-2">
                (Edited on {moment(event.event_data.updated_at).format('ll')})
            </p>
        )}
      </div>
    </>
  );

  return (
    <div className="relative pl-8 py-3 border-l-2 border-gray-200">
      {event.event_type === 'note' ? renderNoteEvent() : renderStatusChangeEvent()}
    </div>
  );
};


// --- Main Modal Component ---
export const CandidateTimelineModal: React.FC<CandidateTimelineModalProps> = ({ isOpen, onClose, candidate }) => {
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
      setIsAddingNote(false); // Hide form on success
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Timeline for {candidate?.name}</DialogTitle>
        </DialogHeader>

        {/* Add Note Section */}
        <div className="p-1 border-b pb-4">
          {isAddingNote ? (
            <div className="space-y-2">
              <Textarea 
                  placeholder="Add a new note to the timeline..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  autoFocus
              />
              <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsAddingNote(false)}>
                      Cancel
                  </Button>
                  <Button onClick={handleAddNote} disabled={isSaving || !newNote.trim()}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Note
                  </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsAddingNote(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add a Note
            </Button>
          )}
        </div>

        {/* Timeline Events Display */}
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
              {timelineEvents.map((event) => (
                <TimelineEvent key={event.id} event={event} candidateId={candidate!.id} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};