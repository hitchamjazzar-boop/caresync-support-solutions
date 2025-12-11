import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Award, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AwardCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

interface AwardCategoriesManagerProps {
  onCategoryChange?: () => void;
}

export const AwardCategoriesManager = ({ onCategoryChange }: AwardCategoriesManagerProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AwardCategory | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f59e0b');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('award_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load award categories');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedCategory(null);
    setName('');
    setDescription('');
    setColor('#f59e0b');
    setDialogOpen(true);
  };

  const openEditDialog = (category: AwardCategory) => {
    setSelectedCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setColor(category.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setSaving(true);
    try {
      if (selectedCategory) {
        // Update
        const { error } = await supabase
          .from('award_categories')
          .update({ name: name.trim(), description: description.trim() || null, color })
          .eq('id', selectedCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        // Create
        const { error } = await supabase
          .from('award_categories')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            color,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Category created successfully');
      }

      setDialogOpen(false);
      fetchCategories();
      onCategoryChange?.();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (category: AwardCategory) => {
    try {
      const { error } = await supabase
        .from('award_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;
      toast.success(category.is_active ? 'Category deactivated' : 'Category activated');
      fetchCategories();
      onCategoryChange?.();
    } catch (error: any) {
      console.error('Error toggling category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      const { error } = await supabase
        .from('award_categories')
        .delete()
        .eq('id', selectedCategory.id);

      if (error) throw error;
      toast.success('Category deleted');
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
      fetchCategories();
      onCategoryChange?.();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category. It may have associated voting periods.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading categories...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Award Categories
            </CardTitle>
            <CardDescription>Manage award types for voting</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedCategory ? 'Edit Category' : 'Create Award Category'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Employee of the Month"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this award category..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{color}</span>
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No award categories yet. Create one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {category.name}
                      {!category.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(category)}
                  >
                    {category.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCategory(category);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};