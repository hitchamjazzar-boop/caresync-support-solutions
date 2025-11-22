import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  calendar_color: string | null;
}

interface MoveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Employee[];
  targetEmployee: Employee;
  onUpdateAll: () => void;
  onCreateSeparate: () => void;
}

const DEFAULT_COLORS = [
  "#FF6B9D", "#4F46E5", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444",
  "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1", "#84CC16",
];

export function MoveConfirmDialog({
  open,
  onOpenChange,
  participants,
  targetEmployee,
  onUpdateAll,
  onCreateSeparate,
}: MoveConfirmDialogProps) {
  const getEmployeeColor = (employee: Employee, index: number) => {
    return employee.calendar_color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Move Multi-Participant Event?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div>
              This event has {participants.length} participant
              {participants.length > 1 ? "s" : ""}:
            </div>

            <div className="space-y-2 pl-4">
              {participants.map((participant, index) => (
                <div key={participant.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: getEmployeeColor(participant, index) }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {participant.full_name}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              Moving to: <span className="font-medium">{targetEmployee.full_name}</span>
            </div>

            <div className="text-sm">Choose how to handle this event:</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction
            onClick={onUpdateAll}
            className="w-full"
          >
            Update for All Participants
          </AlertDialogAction>
          
          <button
            onClick={onCreateSeparate}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Create Separate Event for {targetEmployee.full_name}
          </button>
          
          <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
