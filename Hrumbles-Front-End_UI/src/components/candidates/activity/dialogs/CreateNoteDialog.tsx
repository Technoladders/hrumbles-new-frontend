import { useState, useRef, useEffect } from 'react';
import { StickyNote, CalendarDays, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { NOTE_TAGS, LogActivityPayload, CandidateActivity } from '../hooks/useCandidateActivity';
import { HubSpotRichTextEditor, type HubSpotEditorRef } from '@/components/sales/contact-detail/editor/HubSpotRichTextEditor';

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void;
  candidateName: string; onSubmit: (payload: LogActivityPayload) => Promise<void>;
  isSubmitting: boolean; activity?: CandidateActivity; mode?: 'create' | 'edit';
}

export const CreateNoteDialog = ({ open, onOpenChange, candidateName, onSubmit, isSubmitting, activity, mode = 'create' }: Props) => {
  const { toast } = useToast();
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [title, setTitle]           = useState('');
  const [tag, setTag]               = useState('General');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (open && mode === 'edit' && activity) {
      setTitle(activity.title ?? '');
      setTag(activity.metadata?.tag ?? 'General');
      setActivityDate(activity.activity_date.slice(0, 10));
    }
  }, [open, mode, activity]);

  const reset = () => { setTitle(''); setTag('General'); setActivityDate(new Date().toISOString().slice(0, 10)); editorRef.current?.clear(); };

  const handleSubmit = async () => {
    if (!title.trim())            { toast({ title: 'Please enter a title',   variant: 'destructive' }); return; }
    if (editorRef.current?.isEmpty()) { toast({ title: 'Please write content', variant: 'destructive' }); return; }
    const html = editorRef.current?.getHTML() ?? '';
    const text = editorRef.current?.getText() ?? '';
    await onSubmit({
      type: 'note', title: title.trim(),
      description: text, description_html: html,
      activity_date: new Date(activityDate).toISOString(),
      metadata: { tag, activityDate },
    });
    toast({ title: mode === 'edit' ? 'Note updated' : 'Note saved' });
    reset(); onOpenChange(false);
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700 px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><StickyNote className="h-5 w-5 text-white" /></div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">{isEdit ? 'Edit Note' : 'Create Note'}</DialogTitle>
                <p className="text-violet-100 text-xs mt-0.5">{candidateName}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4 bg-white">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title <span className="text-red-400">*</span></Label>
            <Input placeholder="Note title…" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm focus:ring-violet-500 focus:border-violet-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Tag className="h-3 w-3" /> Tag</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="rounded-xl border-slate-200 h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{NOTE_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Date</Label>
              <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="rounded-xl border-slate-200 h-10 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note Content <span className="text-red-400">*</span></Label>
            <HubSpotRichTextEditor ref={editorRef} placeholder="Write your note here…" minHeight="180px" maxHeight="340px" accentColor="violet"
              initialContent={isEdit ? (activity?.description_html ?? activity?.description ?? '') : ''} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="rounded-xl text-slate-600">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 gap-2 shadow-sm shadow-violet-200">
            <StickyNote className="h-4 w-4" />{isSubmitting ? 'Saving…' : isEdit ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};