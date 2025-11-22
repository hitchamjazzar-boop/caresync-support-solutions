import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Gift, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AssignmentRevealProps {
  assignment: any;
  eventId: string;
}

interface WishlistItem {
  id: string;
  item_title: string;
  item_description: string | null;
  item_url: string | null;
  priority: 'high' | 'medium' | 'low';
}

export function AssignmentReveal({ assignment, eventId }: AssignmentRevealProps) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceiverWishlist();
  }, [assignment, eventId]);

  const loadReceiverWishlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secret_santa_wishlists')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', assignment.receiver_id)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error loading receiver wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const receiver = assignment.receiver;
  const initials = receiver?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?';

  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  return (
    <Card className="bg-gradient-to-br from-red-50 to-green-50 dark:from-red-950 dark:to-green-950 border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-red-600 dark:text-red-400" />
          🎅 Your Secret Santa Assignment
        </CardTitle>
        <CardDescription>You're the Secret Santa for...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border shadow-sm">
          <Avatar className="h-20 w-20">
            <AvatarImage src={receiver?.photo_url} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">{receiver?.full_name}</h3>
            {receiver?.department && (
              <p className="text-sm text-muted-foreground">{receiver.department}</p>
            )}
            {receiver?.position && (
              <p className="text-xs text-muted-foreground">{receiver.position}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Their Wishlist
          </h4>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : wishlist.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-card">
              <p className="text-muted-foreground text-sm">
                They haven't added any items to their wishlist yet.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Check back later for gift ideas!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlist.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-semibold">{item.item_title}</h5>
                        <Badge 
                          variant="secondary" 
                          className={priorityColors[item.priority]}
                        >
                          {item.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      {item.item_description && (
                        <p className="text-sm text-muted-foreground">
                          {item.item_description}
                        </p>
                      )}
                      {item.item_url && (
                        <a
                          href={item.item_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Product Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
