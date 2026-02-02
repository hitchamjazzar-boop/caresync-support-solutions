import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { REVIEW_TYPES } from "@/lib/evaluationConstants";
import { Loader2, Users, UserCheck, Link, Copy, Check } from "lucide-react";

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
  const [requestAllEmployees, setRequestAllEmployees] = useState(true);
  const [reviewerId, setReviewerId] = useState<string>('');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  const [reviewType, setReviewType] = useState<string>('quarterly');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      // Reset form
      setRequestAllEmployees(true);
      setReviewerId('');
      setTargetEmployeeId('');
      setMessage('');
      setDueDate('');
      setGeneratedLink(null);
      setLinkCopied(false);
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
    if (!targetEmployeeId || !user) return;
    
    if (!requestAllEmployees && !reviewerId) {
      toast({ title: "Error", description: "Please select a reviewer", variant: "destructive" });
      return;
    }

    if (!requestAllEmployees && reviewerId === targetEmployeeId) {
      toast({ 
        title: "Invalid Selection", 
        description: "The reviewer cannot evaluate themselves.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      if (requestAllEmployees) {
        // Request all employees (except the target) to evaluate the target
        const reviewers = employees.filter(e => e.id !== targetEmployeeId);
        
        const requests = reviewers.map(reviewer => ({
          admin_id: user.id,
          employee_id: reviewer.id,
          target_employee_id: targetEmployeeId,
          review_type: reviewType,
          message: message || null,
          due_date: dueDate || null,
          status: 'pending'
        }));

        const { error } = await supabase
          .from('evaluation_requests')
          .insert(requests);

        if (error) throw error;

        const target = employees.find(e => e.id === targetEmployeeId);
        toast({ 
          title: "Requests Sent", 
          description: `${reviewers.length} employees have been asked to evaluate ${target?.full_name}` 
        });
      } else {
        // Single reviewer request
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
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = () => {
    if (!targetEmployeeId) {
      toast({ title: "Error", description: "Please select an employee to evaluate", variant: "destructive" });
      return;
    }
    
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/evaluations?evaluateTarget=${targetEmployeeId}&reviewType=${reviewType}`;
    setGeneratedLink(link);
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      toast({ title: "Link Copied", description: "The evaluation link has been copied to your clipboard" });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  const eligibleReviewerCount = employees.filter(e => e.id !== targetEmployeeId).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Request Peer Evaluation
          </DialogTitle>
          <DialogDescription>
            Ask employees to evaluate one of their colleagues
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Who should be evaluated? *</Label>
            <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee to evaluate"} />
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

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Request from all employees
              </Label>
              <p className="text-sm text-muted-foreground">
                {targetEmployeeId 
                  ? `${eligibleReviewerCount} employees will be asked to evaluate`
                  : "Select an employee first"}
              </p>
            </div>
            <Switch
              checked={requestAllEmployees}
              onCheckedChange={setRequestAllEmployees}
            />
          </div>

          {!requestAllEmployees && (
            <div className="space-y-2">
              <Label>Who should do the evaluation? *</Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select reviewer"} />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(emp => emp.id !== targetEmployeeId)
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
          )}

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
            <Label>Message to Reviewers (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any specific instructions or context for the evaluation..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {generatedLink && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Label className="flex items-center gap-2 text-primary">
                <Link className="h-4 w-4" />
                Shareable Evaluation Link
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Share this link with employees. They must be logged in to submit their evaluation.
              </p>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="flex-1 text-sm bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleGenerateLink}
            disabled={!targetEmployeeId}
            className="w-full sm:w-auto"
          >
            <Link className="h-4 w-4 mr-2" />
            Generate Link
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequest} 
              disabled={!targetEmployeeId || (!requestAllEmployees && !reviewerId) || isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {requestAllEmployees 
                ? `Send to ${eligibleReviewerCount} Employees` 
                : "Send Request"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
