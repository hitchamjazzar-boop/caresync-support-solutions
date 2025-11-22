import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AssignmentRevealProps {
  assignment: any;
  eventId: string;
}

interface WishlistItem {
  id: string;
  item_title: string;
  item_description?: string;
  item_url?: string;
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
        .order('priority', { ascending: true });

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error loading receiver wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const receiver = assignment.receiver;
  const initials = receiver?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Your Secret Santa Assignment
        </CardTitle>
        <CardDescription>
          You are the Secret Santa for this person! Keep it secret! 🤫
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Receiver Info */}
        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <Avatar className="h-16 w-16">
            <AvatarImage src={receiver?.photo_url} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{receiver?.full_name}</h3>
            {receiver?.position && (
              <p className="text-sm text-muted-foreground">{receiver.position}</p>
            )}
            {receiver?.department && (
              <p className="text-sm text-muted-foreground">{receiver.department}</p>
            )}
          </div>
        </div>

        {/* Their Wishlist */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">Their Wishlist</h4>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : wishlist.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              They haven't added any items to their wishlist yet.
            </p>
          ) : (
            wishlist.map((item) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg bg-card space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h5 className="font-medium">{item.item_title}</h5>
                  <Badge variant={getPriorityColor(item.priority)}>
                    {item.priority}
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
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View Product <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
