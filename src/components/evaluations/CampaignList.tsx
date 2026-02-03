import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, Trash2, CheckCircle, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Campaign {
  id: string;
  employee_id: string;
  review_type: string;
  include_leadership: boolean;
  status: string;
  created_at: string;
  finalized_at: string | null;
  employee?: {
    full_name: string;
    photo_url: string | null;
    position: string | null;
  };
  assignments_count: number;
  submitted_count: number;
}

interface CampaignListProps {
  refreshTrigger?: number;
}

export const CampaignList = ({ refreshTrigger }: CampaignListProps) => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [refreshTrigger]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('evaluation_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch employee profiles
      const employeeIds = [...new Set(campaignsData?.map(c => c.employee_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position')
        .in('id', employeeIds);

      // Fetch assignment counts
      const campaignIds = campaignsData?.map(c => c.id) || [];
      const { data: assignments } = await supabase
        .from('evaluation_assignments')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds);

      // Fetch actual submission counts from employee_evaluations
      const { data: evaluations } = await supabase
        .from('employee_evaluations')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds);

      // Combine data
      const enrichedCampaigns = campaignsData?.map(campaign => {
        const employee = profiles?.find(p => p.id === campaign.employee_id);
        const campaignAssignments = assignments?.filter(a => a.campaign_id === campaign.id) || [];
        const campaignEvaluations = evaluations?.filter(e => e.campaign_id === campaign.id) || [];
        return {
          ...campaign,
          employee,
          assignments_count: campaignAssignments.length,
          submitted_count: campaignEvaluations.filter(e => e.status === 'submitted').length
        };
      }) || [];

      setCampaigns(enrichedCampaigns);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('evaluation_campaigns')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast({ title: "Deleted", description: "Campaign deleted successfully" });
      fetchCampaigns();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Open</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Closed</Badge>;
      case 'finalized':
        return <Badge variant="default" className="bg-green-500/10 text-green-500">Finalized</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No evaluation campaigns yet. Create one to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={campaign.employee?.photo_url || ''} />
                  <AvatarFallback>
                    {campaign.employee?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{campaign.employee?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {campaign.employee?.position} • {campaign.review_type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <div className="flex-1 sm:w-40">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span>{campaign.submitted_count}/{campaign.assignments_count} submitted</span>
                  </div>
                  <Progress 
                    value={(campaign.submitted_count / campaign.assignments_count) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(campaign.status)}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/evaluations/campaign/${campaign.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {campaign.status !== 'finalized' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDeleteId(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the evaluation campaign and all associated responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
