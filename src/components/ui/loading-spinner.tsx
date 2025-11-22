import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const LoadingDots = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex space-x-2", className)} role="status" aria-label="Loading">
      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const LoadingPulse = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center justify-center", className)} role="status" aria-label="Loading">
      <div className="relative h-12 w-12">
        <div className="absolute h-full w-full animate-ping rounded-full bg-primary opacity-75"></div>
        <div className="relative h-full w-full rounded-full bg-primary"></div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export const LoadingOverlay = ({ message = "Loading...", className }: LoadingOverlayProps) => {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
};
