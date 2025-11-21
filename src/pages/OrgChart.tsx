import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddToOrgChartDialog } from '@/components/orgchart/AddToOrgChartDialog';
import { EditOrgChartDialog } from '@/components/orgchart/EditOrgChartDialog';
import { OrgChartTree } from '@/components/orgchart/OrgChartTree';
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
  };
}

export default function OrgChart() {
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OrgChartNode | null>(null);
  const { toast } = useToast();

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
          *,
          profiles!org_chart_user_id_fkey (
            full_name,
            position,
            photo_url
          )
        `)
        .order('hierarchy_level', { ascending: true })
        .order('position_order', { ascending: true });

      if (error) throw error;
      setNodes(data || []);
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
          <p className="text-muted-foreground">Manage your organization's hierarchy</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add to Org Chart
        </Button>
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
            <CardTitle>Organization Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgChartTree 
              nodes={nodes} 
              onEdit={handleEdit}
              onDelete={handleDelete}
              editable={true}
            />
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
