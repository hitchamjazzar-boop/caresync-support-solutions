import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ScreenMonitoringDialogProps {
  open: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

export const ScreenMonitoringDialog = ({ open, onAllow, onCancel }: ScreenMonitoringDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Screen Monitoring Required</DialogTitle>
          <DialogDescription className="text-center">
            Screen monitoring is required for your work session. You must share your screen to continue working.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1.5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
            <span>Your entire screen will be captured every 5 minutes</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
            <span>Screenshots are stored securely and visible only to admins</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
            <span>Monitoring pauses during breaks</span>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
            <span className="text-destructive">If you cancel, your clock-in will be reverted and you won't be able to work.</span>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel Clock-In
          </Button>
          <Button onClick={onAllow} className="w-full sm:w-auto gap-2">
            <Monitor className="h-4 w-4" />
            Share Screen & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
