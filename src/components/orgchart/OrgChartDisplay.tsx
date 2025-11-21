import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrgChartTree } from './OrgChartTree';

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

export function OrgChartDisplay() {
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgChart();

    const channel = supabase
      .channel('org-chart-display')
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
    } catch (error) {
      console.error('Error fetching org chart:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          Loading organizational chart...
        </CardContent>
      </Card>
    );
  }

  if (nodes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Our Team Structure</CardTitle>
      </CardHeader>
      <CardContent>
        <OrgChartTree nodes={nodes} editable={false} />
      </CardContent>
    </Card>
  );
}
