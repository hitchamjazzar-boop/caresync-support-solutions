import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { REVIEW_TYPES } from "@/lib/evaluationConstants";
import { Loader2, Users } from "lucide-react";

interface RequestPeerEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  department: string | null;
}

export const RequestPeerEvaluationDialog = ({
  open,
  onOpenChange,
  onSuccess
}: RequestPeerEvaluationDialogProps) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reviewerId, setReviewerId] = useState<string>('');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  const [reviewType, setReviewType] = useState<string>('quarterly');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      // Reset form
      setReviewerId('');
      setTargetEmployeeId('');
      setMessage('');
      setDueDate('');
    }
  }, [open]);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, position, department')
      .order('full_name');

    if (error) {
      toast({ title: "Error", description: "Failed to load employees", variant: "destructive" });
    } else {
      setEmployees(data || []);
    }
    setIsLoadingEmployees(false);
  };

  const handleRequest = async () => {
    if (!reviewerId || !targetEmployeeId || !user) return;

    if (reviewerId === targetEmployeeId) {
      toast({ 
        title: "Invalid Selection", 
        description: "The reviewer cannot evaluate themselves. Use 'Request Self-Evaluation' instead.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('evaluation_requests')
        .insert({
          admin_id: user.id,
          employee_id: reviewerId,
          target_employee_id: targetEmployeeId,
          review_type: reviewType,
          message: message || null,
          due_date: dueDate || null,
          status: 'pending'
        });

      if (error) throw error;

      const reviewer = employees.find(e => e.id === reviewerId);
      const target = employees.find(e => e.id === targetEmployeeId);

      toast({ 
        title: "Request Sent", 
        description: `${reviewer?.full_name} has been asked to evaluate ${target?.full_name}` 
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Request Peer Evaluation
          </DialogTitle>
          <DialogDescription>
            Ask an employee to evaluate one of their colleagues
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Who should do the evaluation? *</Label>
            <Select value={reviewerId} onValueChange={setReviewerId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select reviewer"} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex flex-col">
                      <span>{emp.full_name}</span>
                      {emp.position && (
                        <span className="text-xs text-muted-foreground">{emp.position}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Who should be evaluated? *</Label>
            <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee to evaluate"} />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter(emp => emp.id !== reviewerId)
                  .map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex flex-col">
                        <span>{emp.full_name}</span>
                        {emp.position && (
                          <span className="text-xs text-muted-foreground">{emp.position}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Review Type</Label>
            <Select value={reviewType} onValueChange={setReviewType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label>Message to Reviewer (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any specific instructions or context for the evaluation..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRequest} disabled={!reviewerId || !targetEmployeeId || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
