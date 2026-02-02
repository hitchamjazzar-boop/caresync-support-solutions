import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignSummaryReport } from "@/components/evaluations/CampaignSummaryReport";

interface Campaign {
  id: string;
  employee_id: string;
  review_type: string;
  include_leadership: boolean;
  status: string;
  created_at: string;
  finalized_at: string | null;
}

interface Assignment {
  id: string;
  reviewer_id: string;
  status: string;
  submitted_at: string | null;
  reviewer?: {
    full_name: string;
    photo_url: string | null;
    position: string | null;
  };
}

interface Evaluation {
  id: string;
  reviewer_id: string;
  total_score: number | null;
  max_possible_score: number | null;
  status: string;
}

interface AggregatedScore {
  section_number: number;
  section_name: string;
  average_rating: number;
  responses_count: number;
  min_rating: number;
  max_rating: number;
}

interface ReviewerScore {
  reviewer_id: string;
  reviewer_name: string;
  reviewer_photo: string | null;
  reviewer_position: string | null;
  total_score: number;
  max_score: number;
  status: string;
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [aggregatedScores, setAggregatedScores] = useState<AggregatedScore[]>([]);
  const [reviewerScores, setReviewerScores] = useState<ReviewerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);

  const fetchCampaignData = async () => {
    setIsLoading(true);
    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('evaluation_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch employee profile
      const { data: employeeData } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position, department')
        .eq('id', campaignData.employee_id)
        .single();
      setEmployee(employeeData);

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('evaluation_assignments')
        .select('*')
        .eq('campaign_id', id);

      // Fetch reviewer profiles
      const reviewerIds = assignmentsData?.map(a => a.reviewer_id) || [];
      const { data: reviewers } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position')
        .in('id', reviewerIds);

      const enrichedAssignments = assignmentsData?.map(a => ({
        ...a,
        reviewer: reviewers?.find(r => r.id === a.reviewer_id)
      })) || [];
      setAssignments(enrichedAssignments);

      // Fetch evaluations
      const { data: evaluationsData } = await supabase
        .from('employee_evaluations')
        .select('id, reviewer_id, total_score, max_possible_score, status')
        .eq('campaign_id', id);
      setEvaluations(evaluationsData || []);

      // Build reviewer scores for the report
      const reviewerScoresList: ReviewerScore[] = enrichedAssignments.map(a => {
        const evaluation = evaluationsData?.find(e => e.reviewer_id === a.reviewer_id);
        return {
          reviewer_id: a.reviewer_id,
          reviewer_name: a.reviewer?.full_name || 'Unknown',
          reviewer_photo: a.reviewer?.photo_url || null,
          reviewer_position: a.reviewer?.position || null,
          total_score: evaluation?.total_score || 0,
          max_score: evaluation?.max_possible_score || (campaignData.include_leadership ? 50 : 45),
          status: a.status
        };
      });
      setReviewerScores(reviewerScoresList);

      // Fetch section scores for aggregation
      const evalIds = evaluationsData?.filter(e => e.status === 'submitted').map(e => e.id) || [];
      if (evalIds.length > 0) {
        const { data: scores } = await supabase
          .from('evaluation_section_scores')
          .select('*')
          .in('evaluation_id', evalIds);

        // Aggregate scores by section
        const sectionMap = new Map<number, { ratings: number[], name: string }>();
        scores?.forEach(score => {
          if (score.rating !== null) {
            if (!sectionMap.has(score.section_number)) {
              sectionMap.set(score.section_number, { ratings: [], name: score.section_name });
            }
            sectionMap.get(score.section_number)!.ratings.push(score.rating);
          }
        });

        const aggregated: AggregatedScore[] = [];
        sectionMap.forEach((value, key) => {
          const avg = value.ratings.reduce((a, b) => a + b, 0) / value.ratings.length;
          const min = Math.min(...value.ratings);
          const max = Math.max(...value.ratings);
          aggregated.push({
            section_number: key,
            section_name: value.name,
            average_rating: Math.round(avg * 10) / 10,
            responses_count: value.ratings.length,
            min_rating: min,
            max_rating: max
          });
        });
        aggregated.sort((a, b) => a.section_number - b.section_number);
        setAggregatedScores(aggregated);
      }

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate('/evaluations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!campaign || !id) return;
    setIsFinalizing(true);
    try {
      const { error } = await supabase
        .from('evaluation_campaigns')
        .update({
          status: 'finalized',
          finalized_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Campaign finalized. Employee can now see aggregated results." });
      fetchCampaignData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsFinalizing(false);
      setFinalizeDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      // Delete evaluations first
      await supabase.from('employee_evaluations').delete().eq('campaign_id', id);
      // Delete assignments
      await supabase.from('evaluation_assignments').delete().eq('campaign_id', id);
      // Delete campaign
      const { error } = await supabase.from('evaluation_campaigns').delete().eq('id', id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Campaign deleted successfully." });
      navigate('/evaluations');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const submittedCount = assignments.filter(a => a.status === 'submitted').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Campaign Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/evaluations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Evaluations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/evaluations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Evaluation Campaign</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={campaign.status === 'finalized' ? 'default' : 'outline'}>
                {campaign.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status !== 'finalized' && submittedCount > 0 && (
            <Button onClick={() => setFinalizeDialogOpen(true)} disabled={isFinalizing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalize Campaign
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Employee Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee?.photo_url || ''} />
              <AvatarFallback className="text-lg">
                {employee?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{employee?.full_name}</h2>
              <p className="text-sm text-muted-foreground">
                {employee?.position} • {employee?.department}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {campaign.review_type.replace('_', ' ')} Review
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Report */}
      <CampaignSummaryReport
        employeeName={employee?.full_name || ''}
        reviewType={campaign.review_type}
        includeLeadership={campaign.include_leadership}
        reviewerScores={reviewerScores}
        sectionScores={aggregatedScores}
        status={campaign.status}
      />

      {/* Finalize Dialog */}
      <AlertDialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Once finalized, {employee?.full_name} will be able to see the aggregated evaluation results.
              No more submissions will be accepted. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>
              {isFinalizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this evaluation campaign and all associated submissions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampaignDetail;
