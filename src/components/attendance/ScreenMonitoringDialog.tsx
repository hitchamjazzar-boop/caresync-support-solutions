import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, ShieldCheck } from 'lucide-react';

interface ScreenMonitoringDialogProps {
  open: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

export const ScreenMonitoringDialog = ({ open, onAllow, onSkip }: ScreenMonitoringDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Screen Monitoring</DialogTitle>
          <DialogDescription className="text-center">
            Your organization uses screen monitoring during work hours. Would you like to share your screen?
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1.5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
            <span>Screenshots are captured periodically and stored securely</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
            <span>You choose which screen or window to share</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
            <span>Monitoring pauses during breaks</span>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onSkip} className="w-full sm:w-auto">
            Skip
          </Button>
          <Button onClick={onAllow} className="w-full sm:w-auto gap-2">
            <Monitor className="h-4 w-4" />
            Allow Screen Sharing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
