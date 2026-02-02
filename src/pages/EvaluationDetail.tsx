import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ArrowLeft, Save, CheckCircle, User, Calendar, 
  FileText, Loader2, AlertTriangle, BarChart3 
} from "lucide-react";
import { EvaluationSectionCard } from "@/components/evaluations/EvaluationSectionCard";
import { ScoreSummary } from "@/components/evaluations/ScoreSummary";
import { FeedbackSection } from "@/components/evaluations/FeedbackSection";
import { EVALUATION_SECTIONS, getOverallResult } from "@/lib/evaluationConstants";
import { Skeleton } from "@/components/ui/skeleton";
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

interface SectionScore {
  section_number: number;
  section_name: string;
  rating: number | null;
  comments: string;
}

interface Evaluation {
  id: string;
  employee_id: string;
  reviewer_id: string;
  evaluation_type: string;
  status: string;
  include_leadership: boolean;
  total_score: number | null;
  max_possible_score: number | null;
  overall_result: string | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  training_needed: string | null;
  goals_next_period: string | null;
  action_plan: string | null;
  created_at: string;
  finalized_at: string | null;
  campaign_id: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  department: string | null;
}

const EvaluationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [reviewer, setReviewer] = useState<Profile | null>(null);
  const [sectionScores, setSectionScores] = useState<SectionScore[]>([]);
  const [feedback, setFeedback] = useState({
    strengths: '',
    areas_for_improvement: '',
    training_needed: ''
  });
  const [includeLeadership, setIncludeLeadership] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [adminFinalizeDialogOpen, setAdminFinalizeDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvaluation();
    }
  }, [id]);

  const fetchEvaluation = async () => {
    setIsLoading(true);
    try {
      // Fetch evaluation
      const { data: evalData, error: evalError } = await supabase
        .from('employee_evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (evalError) throw evalError;
      setEvaluation(evalData);
      setIncludeLeadership(evalData.include_leadership);
      setFeedback({
        strengths: evalData.strengths || '',
        areas_for_improvement: evalData.areas_for_improvement || '',
        training_needed: evalData.training_needed || ''
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position, department')
        .in('id', [evalData.employee_id, evalData.reviewer_id]);

      if (profiles) {
        setEmployee(profiles.find(p => p.id === evalData.employee_id) || null);
        setReviewer(profiles.find(p => p.id === evalData.reviewer_id) || null);
      }

      // Fetch section scores
      const { data: scores } = await supabase
        .from('evaluation_section_scores')
        .select('*')
        .eq('evaluation_id', id)
        .order('section_number');

      // Initialize all sections
      const allSections = EVALUATION_SECTIONS.map(section => {
        const existingScore = scores?.find(s => s.section_number === section.number);
        return {
          section_number: section.number,
          section_name: section.name,
          rating: existingScore?.rating || null,
          comments: existingScore?.comments || ''
        };
      });
      setSectionScores(allSections);


    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate('/evaluations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSectionRatingChange = (sectionNumber: number, rating: number) => {
    setSectionScores(prev => prev.map(s => 
      s.section_number === sectionNumber ? { ...s, rating } : s
    ));
  };

  const handleSectionCommentsChange = (sectionNumber: number, comments: string) => {
    setSectionScores(prev => prev.map(s => 
      s.section_number === sectionNumber ? { ...s, comments } : s
    ));
  };

  const calculateTotalScore = () => {
    const sectionsToCount = includeLeadership 
      ? sectionScores 
      : sectionScores.filter(s => s.section_number !== 9);
    return sectionsToCount.reduce((sum, s) => sum + (s.rating || 0), 0);
  };

  const getMaxScore = () => includeLeadership ? 50 : 45;

  const handleSave = async (submit = false) => {
    if (!evaluation || !id) return;

    // Validation for submission
    if (submit) {
      const sectionsToValidate = includeLeadership 
        ? sectionScores 
        : sectionScores.filter(s => s.section_number !== 9);
      
      const missingRatings = sectionsToValidate.filter(s => s.rating === null);
      const missingComments = sectionsToValidate.filter(s => !s.comments?.trim());
      
      if (missingRatings.length > 0) {
        toast({ 
          title: "Incomplete Evaluation", 
          description: `Please rate all sections before submitting. Missing ratings: ${missingRatings.map(s => `Section ${s.section_number}`).join(', ')}`,
          variant: "destructive" 
        });
        return;
      }
      
      if (missingComments.length > 0) {
        toast({ 
          title: "Comments Required", 
          description: `Please add comments for all sections. Missing comments: ${missingComments.map(s => `Section ${s.section_number}`).join(', ')}`,
          variant: "destructive" 
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const totalScore = calculateTotalScore();
      const maxScore = getMaxScore();
      const result = getOverallResult(totalScore, maxScore);

      // Update evaluation
      const { error: evalError } = await supabase
        .from('employee_evaluations')
        .update({
          include_leadership: includeLeadership,
          total_score: totalScore,
          max_possible_score: maxScore,
          overall_result: result,
          status: submit ? 'submitted' : 'draft',
          submitted_at: submit ? new Date().toISOString() : null,
          strengths: feedback.strengths || null,
          areas_for_improvement: feedback.areas_for_improvement || null,
          training_needed: feedback.training_needed || null
        })
        .eq('id', id);

      if (evalError) throw evalError;

      // Delete existing section scores
      await supabase.from('evaluation_section_scores').delete().eq('evaluation_id', id);

      // Insert section scores
      const scoresToInsert = sectionScores
        .filter(s => includeLeadership || s.section_number !== 9)
        .map(s => ({
          evaluation_id: id,
          section_number: s.section_number,
          section_name: s.section_name,
          rating: s.rating,
          comments: s.comments || null
        }));

      if (scoresToInsert.length > 0) {
        const { error: scoresError } = await supabase
          .from('evaluation_section_scores')
          .insert(scoresToInsert);
        if (scoresError) throw scoresError;
      }

      // Update assignment status if submitting
      if (submit && evaluation.campaign_id) {
        await supabase
          .from('evaluation_assignments')
          .update({ status: 'submitted', submitted_at: new Date().toISOString() })
          .eq('campaign_id', evaluation.campaign_id)
          .eq('reviewer_id', user?.id);
      }

      // Mark the evaluation request as submitted when submitting
      // Match by requestId from URL, or by matching reviewer and target employee
      if (submit) {
        if (requestId) {
          await supabase
            .from('evaluation_requests')
            .update({ status: 'submitted' })
            .eq('id', requestId);
        } else {
          // Find and mark any matching pending request as submitted
          await supabase
            .from('evaluation_requests')
            .update({ status: 'submitted' })
            .eq('employee_id', user?.id)
            .eq('target_employee_id', evaluation.employee_id)
            .eq('status', 'pending');
        }
      }

      toast({ 
        title: submit ? "Evaluation Submitted" : "Saved", 
        description: submit 
          ? "Your evaluation has been submitted successfully"
          : "Changes saved successfully" 
      });

      if (submit) {
        navigate('/evaluations');
      } else {
        fetchEvaluation();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
      setFinalizeDialogOpen(false);
    }
  };

  // Admin finalize - creates official evaluation with KPIs and Feedback
  const handleAdminFinalize = async () => {
    if (!evaluation || !id || !isAdmin) return;

    setIsSaving(true);

    try {
      const totalScore = calculateTotalScore();
      const maxScore = getMaxScore();
      const result = getOverallResult(totalScore, maxScore);

      // Update evaluation to finalized status
      const { error: evalError } = await supabase
        .from('employee_evaluations')
        .update({
          include_leadership: includeLeadership,
          total_score: totalScore,
          max_possible_score: maxScore,
          overall_result: result,
          status: 'finalized',
          finalized_at: new Date().toISOString(),
          strengths: feedback.strengths || null,
          areas_for_improvement: feedback.areas_for_improvement || null,
          training_needed: feedback.training_needed || null
        })
        .eq('id', id);

      if (evalError) throw evalError;

      // Save section scores
      await supabase.from('evaluation_section_scores').delete().eq('evaluation_id', id);
      
      const scoresToInsert = sectionScores
        .filter(s => includeLeadership || s.section_number !== 9)
        .map(s => ({
          evaluation_id: id,
          section_number: s.section_number,
          section_name: s.section_name,
          rating: s.rating,
          comments: s.comments || null
        }));

      if (scoresToInsert.length > 0) {
        await supabase.from('evaluation_section_scores').insert(scoresToInsert);
      }

      toast({ 
        title: "Evaluation Finalized", 
        description: "The evaluation has been finalized and is now visible to the employee."
      });

      fetchEvaluation();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
      setAdminFinalizeDialogOpen(false);
    }
  };

  // Determine if read-only: submitted/finalized evaluations are read-only, OR if user is not the reviewer
  const isReviewer = evaluation?.reviewer_id === user?.id;
  const isEmployee = evaluation?.employee_id === user?.id && !isReviewer;
  const isSubmitted = evaluation?.status === 'submitted';
  const isFinalized = evaluation?.status === 'finalized';
  
  // Regular users can't edit submitted/finalized, but admins can edit KPI/Feedback on submitted
  const isReadOnly = isFinalized || (!isAdmin && (isSubmitted || !isReviewer));
  
  // Admin can edit KPI/Feedback on submitted evaluations (before finalizing)
  const canAdminEditKPIFeedback = isAdmin && isSubmitted && !isFinalized;
  
  // Employees viewing their own evaluation shouldn't see KPIs and Feedback sections
  const showKPIAndFeedback = isAdmin || isReviewer;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Evaluation Not Found</h2>
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
            <h1 className="text-2xl font-bold">Performance Evaluation</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={evaluation.status === 'finalized' ? 'default' : 'outline'}>
                {evaluation.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created {format(new Date(evaluation.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isReadOnly && (
            <>
              <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={() => setFinalizeDialogOpen(true)} disabled={isSaving}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </>
          )}
          {/* Admin Finalize Button - shown for submitted evaluations */}
          {isAdmin && isSubmitted && !isFinalized && (
            <Button onClick={() => setAdminFinalizeDialogOpen(true)} disabled={isSaving} variant="default">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalize for Employee
            </Button>
          )}
          {/* View Campaign Summary - for admins when evaluation is part of a campaign */}
          {isAdmin && evaluation.campaign_id && (
            <Button variant="outline" onClick={() => navigate(`/evaluations/campaign/${evaluation.campaign_id}`)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Campaign Summary
            </Button>
          )}
        </div>
      </div>

      {/* Employee Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Reviewer: {reviewer?.full_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="capitalize">{evaluation.evaluation_type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leadership Toggle */}
      {!isReadOnly && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Include Leadership Section</Label>
                <p className="text-sm text-muted-foreground">
                  Section 9 - For supervisory/management roles (Max score: {includeLeadership ? '50' : '45'})
                </p>
              </div>
              <Switch
                checked={includeLeadership}
                onCheckedChange={setIncludeLeadership}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sections */}
        <div className="lg:col-span-2 space-y-4">
          {EVALUATION_SECTIONS.map((section) => {
            if (section.number === 9 && !includeLeadership) return null;
            const score = sectionScores.find(s => s.section_number === section.number);
            return (
              <EvaluationSectionCard
                key={section.number}
                sectionNumber={section.number}
                sectionName={section.name}
                criteria={section.criteria}
                rating={score?.rating || null}
                comments={score?.comments || ''}
                onRatingChange={(rating) => handleSectionRatingChange(section.number, rating)}
                onCommentsChange={(comments) => handleSectionCommentsChange(section.number, comments)}
                readOnly={isReadOnly}
                optional={section.optional}
              />
            );
          })}

          {/* Feedback - Hidden from employees viewing their own evaluation, editable by admin on submitted */}
          {showKPIAndFeedback && (
            <FeedbackSection
              strengths={feedback.strengths}
              areasForImprovement={feedback.areas_for_improvement}
              trainingNeeded={feedback.training_needed}
              onStrengthsChange={(v) => setFeedback(f => ({ ...f, strengths: v }))}
              onAreasChange={(v) => setFeedback(f => ({ ...f, areas_for_improvement: v }))}
              onTrainingChange={(v) => setFeedback(f => ({ ...f, training_needed: v }))}
              readOnly={isReadOnly && !canAdminEditKPIFeedback}
            />
          )}
        </div>

        {/* Score Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <ScoreSummary
              totalScore={calculateTotalScore()}
              maxScore={getMaxScore()}
              includeLeadership={includeLeadership}
              sectionScores={sectionScores.map(s => ({
                sectionNumber: s.section_number,
                rating: s.rating
              }))}
            />
          </div>
        </div>
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, you cannot edit this evaluation. The admin will review all submissions
              before finalizing the results. Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSave(true)}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Finalize Dialog */}
      <AlertDialog open={adminFinalizeDialogOpen} onOpenChange={setAdminFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Evaluation for Employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize the evaluation and make it visible to the employee. 
              Make sure you have added KPIs and feedback before finalizing.
              The employee will see the ratings and comments but not the KPIs and Feedback sections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminFinalize}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EvaluationDetail;
