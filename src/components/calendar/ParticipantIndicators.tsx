import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Employee {
  id: string;
  full_name: string;
  photo_url: string | null;
  calendar_color: string | null;
}

interface ParticipantIndicatorsProps {
  participants: Employee[];
  maxVisible?: number;
}

const DEFAULT_COLORS = [
  "#FF6B9D", "#4F46E5", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444",
  "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1", "#84CC16",
];

export function ParticipantIndicators({
  participants,
  maxVisible = 3,
}: ParticipantIndicatorsProps) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - maxVisible);

  const getEmployeeColor = (employee: Employee, index: number) => {
    return employee.calendar_color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (participants.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {visibleParticipants.map((participant, index) => (
          <Tooltip key={participant.id}>
            <TooltipTrigger>
              <div
                className="w-5 h-5 rounded-full border-2 border-background flex items-center justify-center"
                style={{ backgroundColor: getEmployeeColor(participant, index) }}
              >
                {participant.photo_url ? (
                  <Avatar className="w-full h-full">
                    <AvatarImage src={participant.photo_url} alt={participant.full_name} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(participant.full_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="text-[8px] font-semibold text-white">
                    {getInitials(participant.full_name)}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{participant.full_name}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <div className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-[8px] font-semibold text-muted-foreground">
                  +{remainingCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {participants.slice(maxVisible).map(p => (
                  <p key={p.id}>{p.full_name}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
