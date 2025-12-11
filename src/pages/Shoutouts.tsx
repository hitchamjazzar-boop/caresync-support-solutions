import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoutoutsList } from '@/components/shoutouts/ShoutoutsList';
import { SendShoutoutRequestDialog } from '@/components/shoutouts/SendShoutoutRequestDialog';
import { Heart } from 'lucide-react';

export default function Shoutouts() {
  const { isAdmin } = useAdmin();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Shout Outs
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isAdmin
              ? 'Manage shout out requests and employee recognitions'
              : 'Give recognition to your colleagues'}
          </p>
        </div>
        {isAdmin && <SendShoutoutRequestDialog />}
      </div>

      {isAdmin ? (
        <ShoutoutsList />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You'll be able to see published shout outs here soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
