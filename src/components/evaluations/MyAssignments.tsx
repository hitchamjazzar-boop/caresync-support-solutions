import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ClipboardList, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Assignment {
  id: string;
  campaign_id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  campaign: {
    id: string;
    employee_id: string;
    review_type: string;
    include_leadership: boolean;
    status: string;
  };
  employee?: {
    id: string;
    full_name: string;
    photo_url: string | null;
    position: string | null;
  };
  evaluation_id?: string;
}

export const MyAssignments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch assignments for current user
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('evaluation_assignments')
        .select(`
          id,
          campaign_id,
          status,
          submitted_at,
          created_at
        `)
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch campaigns
      const campaignIds = assignmentsData?.map(a => a.campaign_id) || [];
      const { data: campaigns } = await supabase
        .from('evaluation_campaigns')
        .select('*')
        .in('id', campaignIds);

      // Fetch employee profiles
      const employeeIds = [...new Set(campaigns?.map(c => c.employee_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position')
        .in('id', employeeIds);

      // Fetch existing evaluations
      const { data: evaluations } = await supabase
        .from('employee_evaluations')
        .select('id, campaign_id')
        .eq('reviewer_id', user.id)
        .in('campaign_id', campaignIds);

      // Combine data
      const enrichedAssignments = assignmentsData?.map(assignment => {
        const campaign = campaigns?.find(c => c.id === assignment.campaign_id);
        const employee = profiles?.find(p => p.id === campaign?.employee_id);
        const evaluation = evaluations?.find(e => e.campaign_id === assignment.campaign_id);
        return {
          ...assignment,
          campaign: campaign!,
          employee,
          evaluation_id: evaluation?.id
        };
      }).filter(a => a.campaign?.status === 'open') || [];

      setAssignments(enrichedAssignments);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEvaluation = async (assignment: Assignment) => {
    if (assignment.evaluation_id) {
      // Already started, navigate to it
      navigate(`/evaluations/${assignment.evaluation_id}`);
      return;
    }

    // Create new evaluation
    try {
      const { data: evaluation, error } = await supabase
        .from('employee_evaluations')
        .insert({
          campaign_id: assignment.campaign_id,
          employee_id: assignment.campaign.employee_id,
          reviewer_id: user?.id,
          evaluation_type: 'peer_review',
          include_leadership: assignment.campaign.include_leadership,
          status: 'draft',
          max_possible_score: assignment.campaign.include_leadership ? 50 : 45
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/evaluations/${evaluation.id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No pending evaluation assignments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={assignment.employee?.photo_url || ''} />
                  <AvatarFallback>
                    {assignment.employee?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Evaluate: {assignment.employee?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {assignment.employee?.position} • {assignment.campaign.review_type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Assigned {format(new Date(assignment.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {assignment.status === 'submitted' ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}

                <Button 
                  onClick={() => handleStartEvaluation(assignment)}
                  disabled={assignment.status === 'submitted'}
                >
                  {assignment.evaluation_id ? 'Continue' : 'Start'} Evaluation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
