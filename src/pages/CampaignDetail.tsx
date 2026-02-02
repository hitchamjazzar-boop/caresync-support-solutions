import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ArrowLeft, CheckCircle, Users, Loader2, 
  ClipboardCheck, AlertTriangle, Eye
} from "lucide-react";
import { EVALUATION_SECTIONS, getOverallResult } from "@/lib/evaluationConstants";
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
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [aggregatedScores, setAggregatedScores] = useState<AggregatedScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);

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
          aggregated.push({
            section_number: key,
            section_name: value.name,
            average_rating: Math.round(avg * 10) / 10,
            responses_count: value.ratings.length
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

  const submittedCount = assignments.filter(a => a.status === 'submitted').length;
  const totalAssignments = assignments.length;
  const totalScore = aggregatedScores.reduce((sum, s) => sum + s.average_rating, 0);
  const maxScore = campaign?.include_leadership ? 50 : 45;

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
        {campaign.status !== 'finalized' && submittedCount > 0 && (
          <Button onClick={() => setFinalizeDialogOpen(true)} disabled={isFinalizing}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalize Campaign
          </Button>
        )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reviewers Progress */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Reviewers ({submittedCount}/{totalAssignments} submitted)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress 
                value={(submittedCount / totalAssignments) * 100} 
                className="h-2 mb-4"
              />
              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const evaluation = evaluations.find(e => e.reviewer_id === assignment.reviewer_id);
                  return (
                    <div 
                      key={assignment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={assignment.reviewer?.photo_url || ''} />
                          <AvatarFallback>
                            {assignment.reviewer?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{assignment.reviewer?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.reviewer?.position}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {assignment.status === 'submitted' ? (
                          <>
                            <Badge variant="default" className="bg-green-500/10 text-green-500">
                              <ClipboardCheck className="h-3 w-3 mr-1" />
                              Submitted
                            </Badge>
                            {evaluation && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/evaluations/${evaluation.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Aggregated Scores */}
          {aggregatedScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aggregated Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aggregatedScores.map((score) => (
                    <div key={score.section_number} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {score.section_number}. {score.section_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {score.responses_count} response(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(score.average_rating / 5) * 100} 
                          className="w-24 h-2"
                        />
                        <span className="text-sm font-medium w-12 text-right">
                          {score.average_rating}/5
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aggregatedScores.length > 0 ? (
                <>
                  <div className="text-center">
                    <p className="text-4xl font-bold">
                      {totalScore.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      out of {maxScore} points
                    </p>
                  </div>
                  <Progress 
                    value={(totalScore / maxScore) * 100}
                    className="h-3"
                  />
                  <div className="text-center">
                    <Badge className="text-lg px-4 py-1">
                      {getOverallResult(totalScore, maxScore)}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      {((totalScore / maxScore) * 100).toFixed(1)}%
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground">
                  No submissions yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  );
};

export default CampaignDetail;
