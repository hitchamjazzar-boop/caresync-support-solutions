import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReceiverWishlistProps {
  eventId: string;
  receiverId: string;
  receiverName: string;
}

interface WishlistItem {
  id: string;
  item_title: string;
  item_description: string | null;
  item_url: string | null;
  priority: 'high' | 'medium' | 'low';
}

export function ReceiverWishlist({ eventId, receiverId, receiverName }: ReceiverWishlistProps) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, [eventId, receiverId]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secret_santa_wishlists')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', receiverId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          {receiverName}'s Wishlist
        </CardTitle>
        <CardDescription>
          Gift ideas from your Secret Santa recipient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/50">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              No wishlist items yet
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {receiverName} hasn't added any items. Check back later!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {wishlist.map((item) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h5 className="font-semibold flex-1">{item.item_title}</h5>
                    <Badge 
                      variant="secondary" 
                      className={priorityColors[item.priority]}
                    >
                      {item.priority.toUpperCase()}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
