import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WishlistItem {
  id: string;
  item_title: string;
}

interface WishlistManagerProps {
  eventId: string;
  userId: string;
}

export function WishlistManager({ eventId, userId }: WishlistManagerProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, [eventId, userId]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secret_santa_wishlists')
        .select('id, item_title')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load wishlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemTitle.trim()) return;

    if (items.length >= 10) {
      toast({
        title: 'Limit Reached',
        description: 'You can add up to 10 items to your wishlist',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('secret_santa_wishlists')
        .insert({
          event_id: eventId,
          user_id: userId,
          item_title: newItemTitle,
        });

      if (error) throw error;

      setNewItemTitle('');
      loadWishlist();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('secret_santa_wishlists')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      loadWishlist();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Wishlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddItem} className="flex gap-2">
          <Input
            placeholder="Add a gift idea..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            disabled={adding}
          />
          <Button type="submit" disabled={adding} size="icon" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No items yet. Add your gift ideas above!
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <span className="text-sm">{item.item_title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteItem(item.id)}
                  className="h-8 w-8 shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
