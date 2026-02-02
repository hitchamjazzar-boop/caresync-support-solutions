import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RATING_SCALE } from "@/lib/evaluationConstants";
import { Badge } from "@/components/ui/badge";

interface EvaluationSectionCardProps {
  sectionNumber: number;
  sectionName: string;
  criteria: string[];
  rating: number | null;
  comments: string;
  onRatingChange: (rating: number) => void;
  onCommentsChange: (comments: string) => void;
  readOnly?: boolean;
  optional?: boolean;
}

export const EvaluationSectionCard = ({
  sectionNumber,
  sectionName,
  criteria,
  rating,
  comments,
  onRatingChange,
  onCommentsChange,
  readOnly = false,
  optional = false
}: EvaluationSectionCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
              {sectionNumber}
            </span>
            {sectionName}
          </CardTitle>
          {optional && (
            <Badge variant="outline" className="text-xs">Optional</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Criteria List */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Evaluation Criteria:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {criteria.map((criterion, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-primary">•</span>
                {criterion}
              </li>
            ))}
          </ul>
        </div>

        {/* Rating Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Rating <span className="text-destructive">*</span>
          </Label>
          {!readOnly && rating === null && (
            <p className="text-xs text-destructive">Required</p>
          )}
          <RadioGroup
            value={rating?.toString() || ""}
            onValueChange={(value) => onRatingChange(parseInt(value))}
            disabled={readOnly}
            className="flex flex-wrap gap-2"
          >
            {RATING_SCALE.map((scale) => (
              <div key={scale.value} className="flex items-center">
                <RadioGroupItem
                  value={scale.value.toString()}
                  id={`section-${sectionNumber}-rating-${scale.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`section-${sectionNumber}-rating-${scale.value}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all
                    ${rating === scale.value 
                      ? 'border-primary bg-primary/10 text-primary font-medium' 
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                    }
                    ${readOnly ? 'cursor-default' : ''}
                  `}
                >
                  <span className="font-bold">{scale.value}</span>
                  <span className="text-xs hidden sm:inline">{scale.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          {rating && (
            <p className="text-xs text-muted-foreground">
              {RATING_SCALE.find(s => s.value === rating)?.description}
            </p>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label htmlFor={`section-${sectionNumber}-comments`} className="text-sm font-medium">
            Comments
          </Label>
          <Textarea
            id={`section-${sectionNumber}-comments`}
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder="Add specific observations, examples, or feedback..."
            className="min-h-[80px] resize-none"
            disabled={readOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
};
