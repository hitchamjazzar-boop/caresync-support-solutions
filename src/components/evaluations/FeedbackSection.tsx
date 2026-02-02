import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Target, BookOpen, Flag, ClipboardList } from "lucide-react";

interface FeedbackSectionProps {
  strengths: string;
  areasForImprovement: string;
  trainingNeeded: string;
  goalsNextPeriod: string;
  actionPlan: string;
  onStrengthsChange: (value: string) => void;
  onAreasChange: (value: string) => void;
  onTrainingChange: (value: string) => void;
  onGoalsChange: (value: string) => void;
  onActionPlanChange: (value: string) => void;
  readOnly?: boolean;
}

export const FeedbackSection = ({
  strengths,
  areasForImprovement,
  trainingNeeded,
  goalsNextPeriod,
  actionPlan,
  onStrengthsChange,
  onAreasChange,
  onTrainingChange,
  onGoalsChange,
  onActionPlanChange,
  readOnly = false
}: FeedbackSectionProps) => {
  const feedbackFields = [
    {
      id: 'strengths',
      label: 'Strengths',
      icon: MessageSquare,
      value: strengths,
      onChange: onStrengthsChange,
      placeholder: 'List key strengths demonstrated during this period...',
      description: 'What does the employee do particularly well?'
    },
    {
      id: 'areas',
      label: 'Areas for Improvement',
      icon: Target,
      value: areasForImprovement,
      onChange: onAreasChange,
      placeholder: 'Identify specific areas that need development...',
      description: 'Where can the employee grow or improve?'
    },
    {
      id: 'training',
      label: 'Training/Support Needed',
      icon: BookOpen,
      value: trainingNeeded,
      onChange: onTrainingChange,
      placeholder: 'Recommend training programs, courses, or support...',
      description: 'What resources would help their development?'
    },
    {
      id: 'goals',
      label: 'Goals for Next Period',
      icon: Flag,
      value: goalsNextPeriod,
      onChange: onGoalsChange,
      placeholder: 'Set specific, measurable goals for the next review period...',
      description: 'What should the employee focus on achieving?'
    },
    {
      id: 'action',
      label: 'Action Plan',
      icon: ClipboardList,
      value: actionPlan,
      onChange: onActionPlanChange,
      placeholder: 'Outline specific steps and timeline for improvement...',
      description: 'What concrete steps will be taken?'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Feedback & Development
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {feedbackFields.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor={field.id} className="font-medium">
                  {field.label}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">{field.description}</p>
              <Textarea
                id={field.id}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                className="min-h-[100px] resize-none"
                disabled={readOnly}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
