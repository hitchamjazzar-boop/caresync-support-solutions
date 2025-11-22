import { LoadingSpinner } from "./loading-spinner";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const PageLoader = ({ 
  message = "Loading...", 
  fullScreen = true,
  className 
}: PageLoaderProps) => {
  if (fullScreen) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center bg-background", className)}>
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="xl" />
          {message && (
            <p className="animate-pulse text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        {message && (
          <p className="animate-pulse text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
};

export const InlineLoader = ({ message }: { message?: string }) => {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <LoadingSpinner size="sm" />
      {message && <span>{message}</span>}
    </div>
  );
};
