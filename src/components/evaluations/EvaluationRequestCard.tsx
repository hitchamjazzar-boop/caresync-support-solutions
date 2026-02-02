import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ClipboardList, Calendar, Clock, User } from "lucide-react";
import { REVIEW_TYPES } from "@/lib/evaluationConstants";

interface EvaluationRequest {
  id: string;
  admin_id: string;
  review_type: string;
  message: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  admin?: {
    full_name: string;
  };
}

interface EvaluationRequestCardProps {
  request: EvaluationRequest;
  onStartEvaluation: (requestId: string) => void;
}

export const EvaluationRequestCard = ({ request, onStartEvaluation }: EvaluationRequestCardProps) => {
  const reviewTypeLabel = REVIEW_TYPES.find(t => t.value === request.review_type)?.label || request.review_type;
  const isOverdue = request.due_date && new Date(request.due_date) < new Date() && request.status === 'pending';

  return (
    <Card className={`border-l-4 ${isOverdue ? 'border-l-destructive' : 'border-l-primary'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Self-Evaluation Request
          </CardTitle>
          <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
            {isOverdue ? 'Overdue' : request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>From: {request.admin?.full_name || 'Admin'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{reviewTypeLabel}</span>
          </div>
          {request.due_date && (
            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="h-3.5 w-3.5" />
              <span>Due: {format(new Date(request.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {request.message && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Message:</p>
            <p className="text-sm">{request.message}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-muted-foreground">
            Requested on {format(new Date(request.created_at), 'MMM d, yyyy')}
          </span>
          {request.status === 'pending' && (
            <Button size="sm" onClick={() => onStartEvaluation(request.id)}>
              Start Evaluation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
