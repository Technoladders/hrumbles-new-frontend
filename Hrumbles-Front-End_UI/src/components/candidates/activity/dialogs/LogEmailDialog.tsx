import { useState, useRef, useEffect } from 'react';
import { Mail, SendHorizonal, CalendarDays, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { EMAIL_OUTCOMES, LogActivityPayload, CandidateActivity } from '../hooks/useCandidateActivity';
import { HubSpotRichTextEditor, type HubSpotEditorRef } from '@/components/sales/contact-detail/editor/HubSpotRichTextEditor';

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void;
  candidateName: string; onSubmit: (payload: LogActivityPayload) => Promise<void>;
  isSubmitting: boolean; activity?: CandidateActivity; mode?: 'create' | 'edit';
}

export const LogEmailDialog = ({ open, onOpenChange, candidateName, onSubmit, isSubmitting, activity, mode = 'create' }: Props) => {
  const { toast } = useToast();
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [direction, setDirection] = useState('Sent');
  const [subject, setSubject]     = useState('');
  const [outcome, setOutcome]     = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (open && mode === 'edit' && activity) {
      const dir = activity.direction ?? 'sent';
      setDirection(dir.charAt(0).toUpperCase() + dir.slice(1));
      setOutcome(activity.outcome ?? '');
      setActivityDate(activity.activity_date.slice(0, 16));
      setSubject(activity.metadata?.subject ?? '');
    }
  }, [open, mode, activity]);

  const reset = () => { setDirection('Sent'); setSubject(''); setOutcome(''); setActivityDate(new Date().toISOString().slice(0, 16)); editorRef.current?.clear(); };

  const handleSubmit = async () => {
    if (!subject.trim()) { toast({ title: 'Please enter a subject', variant: 'destructive' }); return; }
    if (!outcome) { toast({ title: 'Please select an outcome', variant: 'destructive' }); return; }
    const html = editorRef.current?.getHTML() ?? '';
    const text = editorRef.current?.getText() ?? '';
    await onSubmit({
      type: 'email',
      title: `${direction === 'Sent' ? 'Email Sent' : 'Email Received'}: ${subject}`,
      description: text, description_html: html, outcome,
      direction: direction.toLowerCase(),
      activity_date: new Date(activityDate).toISOString(),
      metadata: { direction, subject, outcome, activityDate },
    });
    toast({ title: mode === 'edit' ? 'Email updated' : 'Email logged successfully' });
    reset(); onOpenChange(false);
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><Mail className="h-5 w-5 text-white" /></div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">{isEdit ? 'Edit Email' : 'Log Email'}</DialogTitle>
                <p className="text-blue-100 text-xs mt-0.5">{candidateName}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4 bg-white">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['Sent', 'Received'] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDirection(d)}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${direction === d ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                  {d === 'Sent' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}{d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject <span className="text-red-400">*</span></Label>
              <Input placeholder="Email subject…" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outcome <span className="text-red-400">*</span></Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="rounded-xl border-slate-200 h-10 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{EMAIL_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Date</Label>
              <Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Body / Summary</Label>
            <HubSpotRichTextEditor ref={editorRef} placeholder="Paste or summarise the email content…" minHeight="130px" maxHeight="260px" accentColor="teal"
              initialContent={isEdit ? (activity?.description_html ?? activity?.description ?? '') : ''} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="rounded-xl text-slate-600">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 gap-2 shadow-sm shadow-blue-200">
            <SendHorizonal className="h-4 w-4" />{isSubmitting ? 'Saving…' : isEdit ? 'Update Email' : 'Log Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};