import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Loader2, 
  Target, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";

interface SectionScore {
  section_number: number;
  section_name: string;
  average_rating: number;
  responses_count: number;
  min_rating: number;
  max_rating: number;
}

interface ReviewerComment {
  section: string;
  comment: string;
}

interface SuggestedKPI {
  metric: string;
  target: string;
}

interface ActionItem {
  action: string;
  timeline: string;
  priority: "high" | "medium" | "low";
}

interface AISummary {
  executiveSummary: string;
  keyStrengths: string[];
  areasForImprovement: string[];
  suggestedKPIs: SuggestedKPI[];
  actionPlan: ActionItem[];
  overallAssessment: string;
}

interface AISummaryReportProps {
  employeeName: string;
  reviewType: string;
  sectionScores: SectionScore[];
  reviewerComments: ReviewerComment[];
  overallScore: number;
  overallPercentage: number;
}

export const AISummaryReport = ({
  employeeName,
  reviewType,
  sectionScores,
  reviewerComments,
  overallScore,
  overallPercentage
}: AISummaryReportProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-evaluation-summary', {
        body: {
          employeeName,
          reviewType,
          sectionScores,
          reviewerComments,
          overallScore,
          overallPercentage
        }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setSummary(data);
      toast({
        title: "Summary Generated",
        description: "AI has analyzed the evaluation data and generated a comprehensive report."
      });
    } catch (err: any) {
      console.error("Error generating summary:", err);
      setError(err.message || "Failed to generate summary");
      toast({
        title: "Error",
        description: err.message || "Failed to generate AI summary",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Generate AI-Powered Summary</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Let AI analyze all reviewer feedback and scores to create a comprehensive performance summary with suggested KPIs and action plans.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            <Button onClick={generateSummary} disabled={isGenerating || sectionScores.length === 0}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Feedback...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
            {sectionScores.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                No evaluation data available to analyze.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-line">{summary.executiveSummary}</p>
          <Separator className="my-4" />
          <div className="bg-background/60 p-3 rounded-lg">
            <p className="text-sm font-medium text-primary">{summary.overallAssessment}</p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.keyStrengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.areasForImprovement.map((area, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Suggested KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Suggested KPIs for Next Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.suggestedKPIs.map((kpi, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg border">
                <p className="font-medium text-sm mb-1">{kpi.metric}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Target:</span> {kpi.target}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recommended Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.actionPlan.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.timeline}</span>
                  </div>
                </div>
                <Badge className={`${getPriorityColor(item.priority)} capitalize`}>
                  {item.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={generateSummary} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate Summary
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
