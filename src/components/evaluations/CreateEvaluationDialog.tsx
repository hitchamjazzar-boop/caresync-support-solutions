import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { REVIEW_TYPES } from "@/lib/evaluationConstants";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface CreateEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
}

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  department: string | null;
}

export const CreateEvaluationDialog = ({
  open,
  onOpenChange,
  preselectedEmployeeId
}: CreateEvaluationDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>(preselectedEmployeeId || '');
  const [reviewType, setReviewType] = useState<string>('quarterly');
  const [includeLeadership, setIncludeLeadership] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      if (preselectedEmployeeId) {
        setSelectedEmployee(preselectedEmployeeId);
      }
    }
  }, [open, preselectedEmployeeId]);

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

  const handleCreate = async () => {
    if (!selectedEmployee || !user) return;

    setIsLoading(true);
    try {
      const maxScore = includeLeadership ? 50 : 45;
      
      const { data: evaluation, error } = await supabase
        .from('employee_evaluations')
        .insert({
          employee_id: selectedEmployee,
          reviewer_id: user.id,
          evaluation_type: 'admin_review',
          status: 'draft',
          include_leadership: includeLeadership,
          max_possible_score: maxScore,
          total_score: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: "Evaluation created successfully" });
      onOpenChange(false);
      navigate(`/evaluations/${evaluation.id}`);
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
          <DialogTitle>Create New Evaluation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee"} />
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

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label>Include Leadership Section</Label>
              <p className="text-xs text-muted-foreground">
                Section 9 - For supervisory/management roles
              </p>
            </div>
            <Switch
              checked={includeLeadership}
              onCheckedChange={setIncludeLeadership}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Max score: {includeLeadership ? '50' : '45'} points ({includeLeadership ? '10' : '9'} sections)
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selectedEmployee || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Evaluation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
