import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getOverallResult } from "@/lib/evaluationConstants";
import { BarChart3, Users, TrendingUp, Award } from "lucide-react";

interface ReviewerScore {
  reviewer_id: string;
  reviewer_name: string;
  reviewer_photo: string | null;
  reviewer_position: string | null;
  total_score: number;
  max_score: number;
  status: string;
}

interface SectionScore {
  section_number: number;
  section_name: string;
  average_rating: number;
  responses_count: number;
  min_rating: number;
  max_rating: number;
}

interface CampaignSummaryReportProps {
  employeeName: string;
  reviewType: string;
  includeLeadership: boolean;
  reviewerScores: ReviewerScore[];
  sectionScores: SectionScore[];
  status: string;
}

export const CampaignSummaryReport = ({
  employeeName,
  reviewType,
  includeLeadership,
  reviewerScores,
  sectionScores,
  status
}: CampaignSummaryReportProps) => {
  const maxPossibleScore = includeLeadership ? 50 : 45;
  
  // Calculate overall stats
  const submittedReviews = reviewerScores.filter(r => r.status === 'submitted');
  const totalSubmitted = submittedReviews.length;
  
  // Calculate overall average score
  const overallTotalScore = sectionScores.reduce((sum, s) => sum + s.average_rating, 0);
  const overallPercentage = totalSubmitted > 0 ? (overallTotalScore / maxPossibleScore) * 100 : 0;
  const overallResult = getOverallResult(overallTotalScore, maxPossibleScore);

  // Calculate average per reviewer
  const avgScorePerReviewer = totalSubmitted > 0 
    ? submittedReviews.reduce((sum, r) => sum + r.total_score, 0) / totalSubmitted 
    : 0;
  const avgPercentagePerReviewer = (avgScorePerReviewer / maxPossibleScore) * 100;

  // Find highest and lowest sections
  const sortedSections = [...sectionScores].sort((a, b) => b.average_rating - a.average_rating);
  const topSection = sortedSections[0];
  const bottomSection = sortedSections[sortedSections.length - 1];

  // Rating distribution for color coding
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 4) return 'text-emerald-600 bg-emerald-100';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-100';
    if (rating >= 2) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (totalSubmitted === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No evaluations have been submitted yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Overall Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Score */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className={`text-5xl font-bold ${getPercentageColor(overallPercentage)}`}>
                {overallPercentage.toFixed(1)}%
              </p>
              <p className="text-lg font-medium text-muted-foreground">
                {overallTotalScore.toFixed(1)} / {maxPossibleScore} points
              </p>
              <Badge className="text-lg px-4 py-1 mt-2">{overallResult}</Badge>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-muted-foreground">Reviewers Submitted</span>
                <span className="font-semibold">{totalSubmitted} / {reviewerScores.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-muted-foreground">Avg Score/Reviewer</span>
                <span className="font-semibold">{avgScorePerReviewer.toFixed(1)} pts</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-muted-foreground">Avg Percentage</span>
                <span className={`font-semibold ${getPercentageColor(avgPercentagePerReviewer)}`}>
                  {avgPercentagePerReviewer.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-4">
              {topSection && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-xs text-green-600 font-medium mb-1">Highest Rated</p>
                  <p className="text-sm font-medium truncate">{topSection.section_name}</p>
                  <p className="text-lg font-bold text-green-600">{topSection.average_rating.toFixed(1)}/5</p>
                </div>
              )}
              {bottomSection && topSection !== bottomSection && (
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-xs text-amber-600 font-medium mb-1">Needs Improvement</p>
                  <p className="text-sm font-medium truncate">{bottomSection.section_name}</p>
                  <p className="text-lg font-bold text-amber-600">{bottomSection.average_rating.toFixed(1)}/5</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Reviewer Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Individual Reviewer Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviewerScores.map((reviewer) => {
              const percentage = (reviewer.total_score / reviewer.max_score) * 100;
              const result = getOverallResult(reviewer.total_score, reviewer.max_score);
              
              return (
                <div 
                  key={reviewer.reviewer_id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={reviewer.reviewer_photo || ''} />
                    <AvatarFallback>
                      {reviewer.reviewer_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reviewer.reviewer_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {reviewer.reviewer_position}
                    </p>
                  </div>
                  {reviewer.status === 'submitted' ? (
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="text-right w-20">
                        <p className={`font-bold ${getPercentageColor(percentage)}`}>
                          {percentage.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reviewer.total_score}/{reviewer.max_score}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-28 justify-center">
                        {result}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Section-by-Section Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sectionScores.map((section) => {
              const percentage = (section.average_rating / 5) * 100;
              
              return (
                <div key={section.section_number} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {section.section_number}. {section.section_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {section.responses_count} reviewer(s) • 
                        Range: {section.min_rating.toFixed(1)} - {section.max_rating.toFixed(1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <Progress value={percentage} className="h-3" />
                      </div>
                      <Badge className={`${getRatingColor(section.average_rating)} min-w-16 justify-center`}>
                        {section.average_rating.toFixed(1)}/5
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="my-6" />

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Outstanding (4.5-5.0)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Excellent (4.0-4.4)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>Good (3.0-3.9)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span>Fair (2.0-2.9)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Needs Work (&lt;2.0)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
