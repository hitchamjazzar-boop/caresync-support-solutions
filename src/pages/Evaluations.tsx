import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import { Plus, Send, ClipboardCheck, Users, Clock, FileText } from "lucide-react";
import { CreateEvaluationDialog } from "@/components/evaluations/CreateEvaluationDialog";
import { RequestEvaluationDialog } from "@/components/evaluations/RequestEvaluationDialog";
import { RequestPeerEvaluationDialog } from "@/components/evaluations/RequestPeerEvaluationDialog";
import { EvaluationList } from "@/components/evaluations/EvaluationList";
import { EvaluationRequestCard } from "@/components/evaluations/EvaluationRequestCard";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface EvaluationRequest {
  id: string;
  admin_id: string;
  employee_id: string;
  target_employee_id?: string | null;
  review_type: string;
  message: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  admin?: {
    full_name: string;
  };
  target_employee?: {
    full_name: string;
  } | null;
}

interface Stats {
  total: number;
  draft: number;
  finalized: number;
  pendingRequests: number;
}

const Evaluations = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [peerRequestDialogOpen, setPeerRequestDialogOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<EvaluationRequest[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<EvaluationRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, finalized: 0, pendingRequests: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMyPendingRequests();
    if (isAdmin) {
      fetchPendingRequests();
    }
  }, [isAdmin, user]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data: evaluations } = await supabase
        .from('employee_evaluations')
        .select('status');

      const { data: requests } = await supabase
        .from('evaluation_requests')
        .select('status')
        .eq('status', 'pending');

      if (evaluations) {
        setStats({
          total: evaluations.length,
          draft: evaluations.filter(e => e.status === 'draft').length,
          finalized: evaluations.filter(e => e.status === 'finalized').length,
          pendingRequests: requests?.length || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('evaluation_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Collect all profile IDs we need
        const adminIds = [...new Set(data.map(r => r.admin_id))];
        const targetIds = [...new Set(data.filter(r => r.target_employee_id).map(r => r.target_employee_id!))];
        const allIds = [...new Set([...adminIds, ...targetIds])];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', allIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        const enrichedData = data.map(request => ({
          ...request,
          admin: profileMap.get(request.admin_id),
          target_employee: request.target_employee_id ? profileMap.get(request.target_employee_id) : null
        }));
        setPendingRequests(enrichedData);
      } else {
        setPendingRequests([]);
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchMyPendingRequests = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('evaluation_requests')
        .select('*')
        .eq('employee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Collect all profile IDs we need
        const adminIds = [...new Set(data.map(r => r.admin_id))];
        const targetIds = [...new Set(data.filter(r => r.target_employee_id).map(r => r.target_employee_id!))];
        const allIds = [...new Set([...adminIds, ...targetIds])];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', allIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        const enrichedData = data.map(request => ({
          ...request,
          admin: profileMap.get(request.admin_id),
          target_employee: request.target_employee_id ? profileMap.get(request.target_employee_id) : null
        }));
        setMyPendingRequests(enrichedData);
      } else {
        setMyPendingRequests([]);
      }
    } catch (error: any) {
      console.error('Error fetching my requests:', error);
    }
  };

  const handleStartEvaluation = async (requestId: string, targetEmployeeId?: string | null) => {
    if (targetEmployeeId) {
      // Peer evaluation - navigate to create evaluation for specific employee
      navigate(`/evaluations?createFor=${targetEmployeeId}&requestId=${requestId}`);
      setCreateDialogOpen(true);
    } else {
      // Self-evaluation - coming soon
      toast({ title: "Coming soon", description: "Self-evaluation form will be available soon" });
    }
  };

  return (
    <div className="space-y-6">
      {/* My Pending Evaluation Requests (for non-admins) */}
      {myPendingRequests.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              You have pending evaluation requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {myPendingRequests.map(request => (
                <EvaluationRequestCard
                  key={request.id}
                  request={request}
                  onStartEvaluation={handleStartEvaluation}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Employee Evaluations
          </h1>
          <p className="text-muted-foreground">
            Evaluate your colleagues' performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setRequestDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Request Self-Evaluation
              </Button>
              <Button variant="outline" onClick={() => setPeerRequestDialogOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Request Peer Evaluation
              </Button>
            </>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Evaluate Colleague
          </Button>
        </div>
      </div>

      {/* Stats Cards - Admin only */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            [1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Evaluations</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.draft}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.finalized}</p>
                    <p className="text-xs text-muted-foreground">Finalized</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Send className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                    <p className="text-xs text-muted-foreground">Pending Requests</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="evaluations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evaluations">My Evaluations</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="requests">
              Pending Requests
              {stats.pendingRequests > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {stats.pendingRequests}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="evaluations">
          <EvaluationList />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="requests">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No pending evaluation requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map(request => (
                  <EvaluationRequestCard
                    key={request.id}
                    request={request}
                    onStartEvaluation={handleStartEvaluation}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <CreateEvaluationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <RequestEvaluationDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        onSuccess={() => {
          fetchStats();
          fetchPendingRequests();
        }}
      />
      <RequestPeerEvaluationDialog
        open={peerRequestDialogOpen}
        onOpenChange={setPeerRequestDialogOpen}
        onSuccess={() => {
          fetchStats();
          fetchPendingRequests();
        }}
      />
    </div>
  );
};

export default Evaluations;
