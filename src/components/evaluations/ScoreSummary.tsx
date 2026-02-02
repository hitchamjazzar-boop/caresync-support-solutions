import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getOverallResult, getResultBadgeVariant } from "@/lib/evaluationConstants";
import { Trophy, Target, TrendingUp } from "lucide-react";

interface ScoreSummaryProps {
  totalScore: number;
  maxScore: number;
  includeLeadership: boolean;
  sectionScores: Array<{ sectionNumber: number; rating: number | null }>;
}

export const ScoreSummary = ({
  totalScore,
  maxScore,
  includeLeadership,
  sectionScores
}: ScoreSummaryProps) => {
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const result = getOverallResult(totalScore, maxScore);
  const completedSections = sectionScores.filter(s => s.rating !== null).length;
  const totalSections = includeLeadership ? 10 : 9;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Score Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className="text-center py-4 bg-muted/50 rounded-lg">
          <div className="text-4xl font-bold text-primary">
            {totalScore} <span className="text-xl text-muted-foreground">/ {maxScore}</span>
          </div>
          <div className="text-2xl font-semibold mt-1">{percentage}%</div>
          <Badge variant={getResultBadgeVariant(result)} className="mt-2 text-sm px-4 py-1">
            {result}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Sections Rated</p>
              <p className="font-semibold">{completedSections} / {totalSections}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Max Possible</p>
              <p className="font-semibold">{maxScore} pts</p>
            </div>
          </div>
        </div>

        {/* Score Breakdown Legend */}
        <div className="pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">Result Ranges:</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>90-100%: Outstanding</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>80-89%: Very Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>60-79%: Meets Expectations</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>40-59%: Needs Improvement</span>
            </div>
            <div className="flex items-center gap-1 col-span-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>&lt;40%: Unsatisfactory</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
