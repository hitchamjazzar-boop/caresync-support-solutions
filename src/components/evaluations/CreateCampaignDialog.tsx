import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { REVIEW_TYPES } from "@/lib/evaluationConstants";
import { Loader2 } from "lucide-react";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  department: string | null;
  photo_url: string | null;
}

export const CreateCampaignDialog = ({
  open,
  onOpenChange,
  onSuccess
}: CreateCampaignDialogProps) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [reviewType, setReviewType] = useState<string>('quarterly');
  const [includeLeadership, setIncludeLeadership] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setSelectedEmployee('');
      setSelectedReviewers([]);
      setReviewType('quarterly');
      setIncludeLeadership(false);
    }
  }, [open]);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, position, department, photo_url')
      .order('full_name');

    if (error) {
      toast({ title: "Error", description: "Failed to load employees", variant: "destructive" });
    } else {
      setEmployees(data || []);
    }
    setIsLoadingEmployees(false);
  };

  const toggleReviewer = (reviewerId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(reviewerId)
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  const selectAllReviewers = () => {
    const availableReviewers = employees
      .filter(emp => emp.id !== selectedEmployee)
      .map(emp => emp.id);
    setSelectedReviewers(availableReviewers);
  };

  const deselectAllReviewers = () => {
    setSelectedReviewers([]);
  };

  const handleCreate = async () => {
    if (!selectedEmployee || selectedReviewers.length === 0 || !user) return;

    setIsLoading(true);
    try {
      // Create the campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('evaluation_campaigns')
        .insert({
          employee_id: selectedEmployee,
          created_by: user.id,
          review_type: reviewType,
          include_leadership: includeLeadership,
          status: 'open'
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create assignments for each reviewer
      const assignments = selectedReviewers.map(reviewerId => ({
        campaign_id: campaign.id,
        reviewer_id: reviewerId,
        status: 'pending'
      }));

      const { error: assignmentError } = await supabase
        .from('evaluation_assignments')
        .insert(assignments);

      if (assignmentError) throw assignmentError;

      toast({ 
        title: "Success", 
        description: `Evaluation campaign created with ${selectedReviewers.length} reviewers assigned` 
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const availableReviewers = employees.filter(emp => emp.id !== selectedEmployee);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Evaluation Campaign</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employee to Evaluate</Label>
            <Select value={selectedEmployee} onValueChange={(val) => {
              setSelectedEmployee(val);
              setSelectedReviewers(prev => prev.filter(id => id !== val));
            }}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee"} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={emp.photo_url || ''} />
                        <AvatarFallback className="text-xs">{emp.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span>{emp.full_name}</span>
                        {emp.position && (
                          <span className="text-xs text-muted-foreground">{emp.position}</span>
                        )}
                      </div>
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

          {selectedEmployee && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assign Reviewers ({selectedReviewers.length} selected)</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllReviewers}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllReviewers}>
                    Clear
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {availableReviewers.map((emp) => (
                    <div 
                      key={emp.id} 
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleReviewer(emp.id)}
                    >
                      <Checkbox 
                        checked={selectedReviewers.includes(emp.id)}
                        onCheckedChange={() => toggleReviewer(emp.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={emp.photo_url || ''} />
                        <AvatarFallback>{emp.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!selectedEmployee || selectedReviewers.length === 0 || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
