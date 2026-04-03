import { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOutgoing, PhoneIncoming, Clock, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CALL_OUTCOMES, LogActivityPayload, CandidateActivity } from '../hooks/useCandidateActivity';
import { HubSpotRichTextEditor, type HubSpotEditorRef } from '@/components/sales/contact-detail/editor/HubSpotRichTextEditor';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onSubmit: (payload: LogActivityPayload) => Promise<void>;
  isSubmitting: boolean;
  activity?: CandidateActivity;   // populated in edit mode
  mode?: 'create' | 'edit';
}

export const LogCallDialog = ({
  open, onOpenChange, candidateName, onSubmit, isSubmitting,
  activity, mode = 'create',
}: Props) => {
  const { toast } = useToast();
  const editorRef = useRef<HubSpotEditorRef>(null);

  const [direction, setDirection]       = useState('Outbound');
  const [outcome, setOutcome]           = useState('');
  const [duration, setDuration]         = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));

  // Pre-populate in edit mode
  useEffect(() => {
    if (open && mode === 'edit' && activity) {
      setDirection(activity.direction
        ? activity.direction.charAt(0).toUpperCase() + activity.direction.slice(1)
        : 'Outbound');
      setOutcome(activity.outcome ?? '');
      setDuration(activity.duration_minutes?.toString() ?? '');
      setActivityDate(activity.activity_date.slice(0, 16));
      // Editor initialContent handles body — set via initialContent prop
    }
  }, [open, mode, activity]);

  const reset = () => {
    setDirection('Outbound'); setOutcome(''); setDuration('');
    setActivityDate(new Date().toISOString().slice(0, 16));
    editorRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!outcome) { toast({ title: 'Please select an outcome', variant: 'destructive' }); return; }
    const html = editorRef.current?.getHTML() ?? '';
    const text = editorRef.current?.getText() ?? '';
    await onSubmit({
      type: 'call',
      title: `${direction} Call — ${outcome}`,
      description: text, description_html: html,
      outcome, direction: direction.toLowerCase(),
      duration_minutes: duration ? parseInt(duration) : undefined,
      activity_date: new Date(activityDate).toISOString(),
      metadata: { direction, outcome, duration, activityDate },
    });
    toast({ title: mode === 'edit' ? 'Call updated' : 'Call logged successfully' });
    reset(); onOpenChange(false);
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">
                  {isEdit ? 'Edit Call' : 'Log Call'}
                </DialogTitle>
                <p className="text-emerald-100 text-xs mt-0.5">{candidateName}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4 bg-white">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Call Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['Outbound', 'Inbound'] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDirection(d)}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                    direction === d ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                  {d === 'Outbound' ? <PhoneOutgoing className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />}
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outcome <span className="text-red-400">*</span></Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="rounded-xl border-slate-200 h-10 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{CALL_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Date & Time</Label>
              <Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="h-3 w-3" /> Duration (mins)</Label>
              <Input type="number" min="1" max="999" placeholder="e.g. 15" value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Call Notes</Label>
            <HubSpotRichTextEditor
              ref={editorRef}
              placeholder="What was discussed? Key points, follow-ups, candidate feedback…"
              minHeight="130px" maxHeight="260px" accentColor="teal"
              initialContent={isEdit ? (activity?.description_html ?? activity?.description ?? '') : ''}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="rounded-xl text-slate-600">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 gap-2 shadow-sm shadow-emerald-200">
            <Phone className="h-4 w-4" />
            {isSubmitting ? 'Saving…' : isEdit ? 'Update Call' : 'Log Call'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};