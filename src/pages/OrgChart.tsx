import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, Pencil, Trash2, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddToOrgChartDialog } from '@/components/orgchart/AddToOrgChartDialog';
import { EditOrgChartDialog } from '@/components/orgchart/EditOrgChartDialog';
import { DraggableOrgChartTree } from '@/components/orgchart/DraggableOrgChartTree';
import { useAdmin } from '@/hooks/useAdmin';
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

interface OrgChartNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  hierarchy_level: number;
  position_order: number;
  profiles: {
    full_name: string;
    position: string | null;
    photo_url: string | null;
    department: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  };
}

export default function OrgChart() {
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OrgChartNode | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const { isAdmin } = useAdmin();
  
  const getDefaultZoom = () => {
    if (typeof window === 'undefined') return 100;
    const width = window.innerWidth;
    if (width < 640) return 60;
    if (width < 1024) return 80;
    return 100;
  };
  
  const [zoom, setZoom] = useState<number>(getDefaultZoom());
  const { toast } = useToast();

  useEffect(() => {
    const handleResize = () => {
      setZoom(getDefaultZoom());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchOrgChart();

    const channel = supabase
      .channel('org-chart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'org_chart'
        },
        () => {
          fetchOrgChart();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrgChart = async () => {
    try {
      const { data, error } = await supabase
        .from('org_chart')
        .select(`
          id,
          user_id,
          parent_id,
          hierarchy_level,
          position_order,
          created_at,
          updated_at,
          profiles!inner (
            full_name,
            position,
            photo_url,
            department,
            contact_email,
            contact_phone
          )
        `)
        .order('hierarchy_level', { ascending: true })
        .order('position_order', { ascending: true });

      if (error) throw error;
      setNodes(data as any || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (node: OrgChartNode) => {
    setSelectedNode(node);
    setEditDialogOpen(true);
  };

  const handleDelete = (node: OrgChartNode) => {
    setSelectedNode(node);
    setDeleteDialogOpen(true);
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setCollapsedNodes(new Set());
    toast({
      title: 'Expanded',
      description: 'All branches expanded',
    });
  };

  const collapseAll = () => {
    const allNodeIds = nodes
      .filter(node => {
        // Only collapse nodes that have children
        const hasChildren = nodes.some(n => n.parent_id === node.id);
        return hasChildren;
      })
      .map(n => n.id);
    setCollapsedNodes(new Set(allNodeIds));
    toast({
      title: 'Collapsed',
      description: 'All branches collapsed',
    });
  };

  const confirmDelete = async () => {
    if (!selectedNode) return;

    try {
      const { error } = await supabase
        .from('org_chart')
        .delete()
        .eq('id', selectedNode.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Position removed from org chart',
      });
      
      setDeleteDialogOpen(false);
      setSelectedNode(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (nodeId: string, newParentId: string | null, newOrder: number) => {
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Calculate new hierarchy level based on parent
      let hierarchyLevel = 0;
      if (newParentId) {
        const parent = nodes.find(n => n.id === newParentId);
        hierarchyLevel = parent ? parent.hierarchy_level + 1 : 0;
      }

      // Get all siblings at the new position
      const siblings = nodes
        .filter(n => n.parent_id === newParentId && n.id !== nodeId)
        .sort((a, b) => a.position_order - b.position_order);

      // Insert at the new position
      siblings.splice(newOrder, 0, node);

      // Update position orders for all affected nodes
      const updates = siblings.map((sibling, index) => ({
        id: sibling.id,
        position_order: index,
        ...(sibling.id === nodeId ? {
          parent_id: newParentId,
          hierarchy_level: hierarchyLevel,
        } : {}),
      }));

      // Execute all updates
      for (const update of updates) {
        const { error } = await supabase
          .from('org_chart')
          .update({
            parent_id: update.parent_id !== undefined ? update.parent_id : undefined,
            hierarchy_level: update.hierarchy_level,
            position_order: update.position_order,
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Organization chart updated',
      });

      fetchOrgChart();
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
      <div className="container mx-auto py-8">
        <div className="text-center">Loading organizational chart...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organizational Chart</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage your organization\'s hierarchy' : 'View your organization\'s hierarchy'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={expandAll}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Expand All
          </Button>
          <Button variant="outline" onClick={collapseAll}>
            <Minimize2 className="h-4 w-4 mr-2" />
            Collapse All
          </Button>
          {isAdmin && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Org Chart
            </Button>
          )}
        </div>
      </div>

      {nodes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No organizational chart set up yet. Add positions to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organization Hierarchy</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin 
                    ? 'Drag and drop employees to reorganize the hierarchy' 
                    : 'View your organization structure'}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    min={50}
                    max={150}
                    step={10}
                    className="w-24 md:w-32"
                  />
                  <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
                    {zoom}%
                  </span>
                </div>
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DraggableOrgChartTree 
              nodes={nodes} 
              onEdit={isAdmin ? handleEdit : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
              onDragEnd={isAdmin ? handleDragEnd : undefined}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={toggleCollapse}
              zoom={zoom}
              editable={isAdmin}
            />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <>
          <AddToOrgChartDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSuccess={fetchOrgChart}
            existingNodes={nodes}
          />

          <EditOrgChartDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            node={selectedNode}
            onSuccess={fetchOrgChart}
            existingNodes={nodes}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from Org Chart?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove {selectedNode?.profiles?.full_name} from the organizational chart.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
