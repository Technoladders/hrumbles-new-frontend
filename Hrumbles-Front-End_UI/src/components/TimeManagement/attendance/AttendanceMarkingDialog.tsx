import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AttendanceMarkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const AttendanceMarkingDialog = ({
  open, onOpenChange, date, time,
  onDateChange, onTimeChange, onSubmit, isSubmitting = false,
}: AttendanceMarkingDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md rounded-2xl">
      <DialogHeader>
        <DialogTitle>Mark Attendance</DialogTitle>
        <DialogDescription>Record your attendance for a specific date.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="att-date">Date</Label>
          <Input
            id="att-date"
            type="date"
            value={date}
            onChange={e => onDateChange(e.target.value)}
            className="rounded-lg"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="att-time">Clock-in Time</Label>
          <Input
            id="att-time"
            type="time"
            value={time}
            onChange={e => onTimeChange(e.target.value)}
            className="rounded-lg"
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700">
          {isSubmitting ? 'Saving…' : 'Submit'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);