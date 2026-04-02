import { useState, useRef, useEffect } from 'react';
import { Linkedin, CalendarDays, MousePointerClick } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LINKEDIN_ACTIVITY_TYPES, LINKEDIN_OUTCOMES, LogActivityPayload, CandidateActivity } from '../hooks/useCandidateActivity';
import { HubSpotRichTextEditor, type HubSpotEditorRef } from '@/components/sales/contact-detail/editor/HubSpotRichTextEditor';

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void;
  candidateName: string; onSubmit: (payload: LogActivityPayload) => Promise<void>;
  isSubmitting: boolean; activity?: CandidateActivity; mode?: 'create' | 'edit';
}

export const LogLinkedInDialog = ({ open, onOpenChange, candidateName, onSubmit, isSubmitting, activity, mode = 'create' }: Props) => {
  const { toast } = useToast();
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [activityType, setActivityType] = useState('');
  const [outcome, setOutcome]           = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (open && mode === 'edit' && activity) {
      setActivityType(activity.metadata?.activityType ?? '');
      setOutcome(activity.outcome ?? '');
      setActivityDate(activity.activity_date.slice(0, 16));
    }
  }, [open, mode, activity]);

  const reset = () => { setActivityType(''); setOutcome(''); setActivityDate(new Date().toISOString().slice(0, 16)); editorRef.current?.clear(); };

  const handleSubmit = async () => {
    if (!activityType) { toast({ title: 'Please select an activity type', variant: 'destructive' }); return; }
    if (!outcome)      { toast({ title: 'Please select an outcome',        variant: 'destructive' }); return; }
    const html = editorRef.current?.getHTML() ?? '';
    const text = editorRef.current?.getText() ?? '';
    await onSubmit({
      type: 'linkedin', title: `LinkedIn ${activityType} — ${outcome}`,
      description: text, description_html: html, outcome,
      activity_date: new Date(activityDate).toISOString(),
      metadata: { activityType, outcome, activityDate },
    });
    toast({ title: mode === 'edit' ? 'LinkedIn updated' : 'LinkedIn logged' });
    reset(); onOpenChange(false);
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><Linkedin className="h-5 w-5 text-white" /></div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">{isEdit ? 'Edit LinkedIn' : 'Log LinkedIn'}</DialogTitle>
                <p className="text-sky-100 text-xs mt-0.5">{candidateName}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4 bg-white">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity Type <span className="text-red-400">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {LINKEDIN_ACTIVITY_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setActivityType(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${activityType === t ? 'border-sky-500 bg-sky-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outcome <span className="text-red-400">*</span></Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="rounded-xl border-slate-200 h-10 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{LINKEDIN_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Date</Label>
              <Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message / Notes</Label>
            <HubSpotRichTextEditor ref={editorRef} placeholder="What was the message or interaction about?" minHeight="130px" maxHeight="260px" accentColor="teal"
              initialContent={isEdit ? (activity?.description_html ?? activity?.description ?? '') : ''} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="rounded-xl text-slate-600">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-5 gap-2 shadow-sm shadow-sky-200">
            <MousePointerClick className="h-4 w-4" />{isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Log LinkedIn'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};