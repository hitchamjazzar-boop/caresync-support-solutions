import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AssignmentRevealProps {
  assignment: any;
  eventId: string;
}

interface WishlistItem {
  id: string;
  item_title: string;
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
        .select('id, item_title')
        .eq('event_id', eventId)
        .eq('user_id', assignment.receiver_id)
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

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle>Your Secret Santa Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3 text-destructive">
          <Gift className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">You are Secret Santa for:</p>
            <p className="text-3xl font-bold">{receiver?.full_name}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">{receiver?.full_name}'s Wishlist</h4>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : wishlist.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              They haven't added any items yet.
            </p>
          ) : (
            <div className="space-y-2">
              {wishlist.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg bg-card"
                >
                  <p className="text-sm">{item.item_title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
