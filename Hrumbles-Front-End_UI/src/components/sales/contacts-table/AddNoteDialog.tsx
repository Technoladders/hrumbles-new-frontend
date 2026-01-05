// AddNoteDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import type { SimpleContact } from '@/types/simple-contact.types';

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: SimpleContact;
}

export const AddNoteDialog: React.FC<AddNoteDialogProps> = ({ open, onOpenChange, contact }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);
  
  const [content, setContent] = React.useState('');
  const [isPinned, setIsPinned] = React.useState(false);

  const addNoteMutation = useMutation({
    mutationFn: async (noteData: { content: string; is_pinned: boolean }) => {
      const { data, error } = await supabase
        .from('contact_notes')
        .insert({
          contact_id: contact.id,
          organization_id,
          content: noteData.content,
          is_pinned: noteData.is_pinned,
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactNotes', contact.id] });
      toast({ title: 'Note Added', description: 'Your note has been saved successfully.' });
      setContent('');
      setIsPinned(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Add Note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        title: 'Content Required',
        description: 'Please enter some content for the note.',
        variant: 'destructive',
      });
      return;
    }
    addNoteMutation.mutate({ content, is_pinned: isPinned });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Note for {contact.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note-content">Note Content</Label>
              <Textarea
                id="note-content"
                placeholder="Enter your note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="pin-note"
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
              <Label htmlFor="pin-note" className="cursor-pointer">
                Pin this note to the top
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addNoteMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

