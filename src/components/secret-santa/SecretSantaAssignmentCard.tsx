import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SecretSantaAssignmentCardProps {
  receiver: any;
  onViewDetails: () => void;
}

export function SecretSantaAssignmentCard({ receiver, onViewDetails }: SecretSantaAssignmentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const initials = receiver?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card className="bg-gradient-to-br from-red-50 to-green-50 dark:from-red-950 dark:to-green-950 border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          🎁 🎅 Your Secret Santa Assignment
        </CardTitle>
        <CardDescription>You're the Secret Santa for...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
          <Avatar className="h-16 w-16">
            <AvatarImage src={receiver?.photo_url} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{receiver?.full_name}</h3>
            {receiver?.department && (
              <p className="text-sm text-muted-foreground">{receiver.department}</p>
            )}
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            setExpanded(!expanded);
            if (!expanded) onViewDetails();
          }}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              View Full Details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
