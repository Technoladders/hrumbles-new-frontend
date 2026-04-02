// ─── LogWhatsAppDialog ────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Send, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { WHATSAPP_OUTCOMES, LogActivityPayload, CandidateActivity } from '../hooks/useCandidateActivity';
import { HubSpotRichTextEditor, type HubSpotEditorRef } from '@/components/sales/contact-detail/editor/HubSpotRichTextEditor';

interface WAProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  candidateName: string; onSubmit: (payload: LogActivityPayload) => Promise<void>;
  isSubmitting: boolean; activity?: CandidateActivity; mode?: 'create' | 'edit';
}

export const LogWhatsAppDialog = ({ open, onOpenChange, candidateName, onSubmit, isSubmitting, activity, mode = 'create' }: WAProps) => {
  const { toast } = useToast();
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [direction, setDirection] = useState('Sent');
  const [outcome, setOutcome]     = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (open && mode === 'edit' && activity) {
      const dir = activity.direction ?? 'sent';
      setDirection(dir.charAt(0).toUpperCase() + dir.slice(1));
      setOutcome(activity.outcome ?? '');
      setActivityDate(activity.activity_date.slice(0, 16));
    }
  }, [open, mode, activity]);

  const reset = () => { setDirection('Sent'); setOutcome(''); setActivityDate(new Date().toISOString().slice(0, 16)); editorRef.current?.clear(); };

  const handleSubmit = async () => {
    if (!outcome) { toast({ title: 'Please select an outcome', variant: 'destructive' }); return; }
    const html = editorRef.current?.getHTML() ?? '';
    const text = editorRef.current?.getText() ?? '';
    await onSubmit({
      type: 'whatsapp', title: `WhatsApp ${direction} — ${outcome}`,
      description: text, description_html: html, outcome,
      direction: direction.toLowerCase(),
      activity_date: new Date(activityDate).toISOString(),
      metadata: { direction, outcome, activityDate },
    });
    toast({ title: mode === 'edit' ? 'WhatsApp updated' : 'WhatsApp logged' });
    reset(); onOpenChange(false);
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">{isEdit ? 'Edit WhatsApp' : 'Log WhatsApp'}</DialogTitle>
                <p className="text-green-100 text-xs mt-0.5">{candidateName}</p>
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
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${direction === d ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                  {d === 'Sent' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}{d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outcome <span className="text-red-400">*</span></Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="rounded-xl border-slate-200 h-10 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{WHATSAPP_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Date</Label>
              <Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Summary</Label>
            <HubSpotRichTextEditor ref={editorRef} placeholder="Summarise the conversation, shared links, next steps agreed…" minHeight="130px" maxHeight="260px" accentColor="teal"
              initialContent={isEdit ? (activity?.description_html ?? activity?.description ?? '') : ''} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="rounded-xl text-slate-600">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-5 gap-2 shadow-sm shadow-green-200">
            <Send className="h-4 w-4" />{isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Log WhatsApp'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};