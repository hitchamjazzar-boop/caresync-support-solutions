import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink, Loader2, ListTodo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WishlistItem {
  id: string;
  item_title: string;
  item_description?: string;
  item_url?: string;
  priority: 'high' | 'medium' | 'low';
}

interface WishlistManagerProps {
  eventId: string;
  userId: string;
}

export function WishlistManager({ eventId, userId }: WishlistManagerProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    url: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  useEffect(() => {
    loadWishlist();
  }, [eventId, userId]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secret_santa_wishlists')
        .select('*')
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

  const handleAddItem = async () => {
    if (!newItem.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an item title',
        variant: 'destructive',
      });
      return;
    }

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
          item_title: newItem.title,
          item_description: newItem.description || null,
          item_url: newItem.url || null,
          priority: newItem.priority,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item added to your wishlist',
      });

      setNewItem({ title: '', description: '', url: '', priority: 'medium' });
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

      toast({
        title: 'Success',
        description: 'Item removed from wishlist',
      });
      loadWishlist();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          My Wishlist
        </CardTitle>
        <CardDescription>
          Add items you'd like to receive. Your Secret Santa will see this list!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Item Form */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Input
              placeholder="Item title *"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              rows={2}
            />
            <Input
              placeholder="Product URL (optional)"
              value={newItem.url}
              onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            />
            <div className="flex gap-2">
              <Select
                value={newItem.priority}
                onValueChange={(value: 'high' | 'medium' | 'low') =>
                  setNewItem({ ...newItem, priority: value })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddItem} disabled={adding} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                {adding ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </div>
        </div>

        {/* Wishlist Items */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items in your wishlist yet. Add some items above!
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 border rounded-lg bg-card"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{item.item_title}</h4>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {items.length}/10 items added
        </p>
      </CardContent>
    </Card>
  );
}
