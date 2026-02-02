import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface EarlyClockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workedHours: number;
  workedMinutes: number;
  onConfirm: () => void;
}

export const EarlyClockOutDialog = ({
  open,
  onOpenChange,
  workedHours,
  workedMinutes,
  onConfirm,
}: EarlyClockOutDialogProps) => {
  const requiredHours = 8;
  const totalWorkedMinutes = workedHours * 60 + workedMinutes;
  const requiredMinutes = requiredHours * 60;
  const shortfallMinutes = requiredMinutes - totalWorkedMinutes;
  const shortfallHours = Math.floor(shortfallMinutes / 60);
  const shortfallMins = shortfallMinutes % 60;

  const formatTime = (hours: number, minutes: number) => {
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <AlertDialogTitle>Clock out early?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>You're about to clock out before completing 8 hours of work.</p>
              
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time worked:</span>
                  <span className="font-semibold">{formatTime(workedHours, workedMinutes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Required:</span>
                  <span className="font-medium">{requiredHours} hours</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Shortfall:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-500">
                    {formatTime(shortfallHours, shortfallMins)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This will be recorded in your attendance history.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continue Clock Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
