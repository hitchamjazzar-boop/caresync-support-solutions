import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, Eye, FileText, ClipboardCheck, Pencil, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getResultBadgeVariant, REVIEW_TYPES } from "@/lib/evaluationConstants";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Evaluation {
  id: string;
  employee_id: string;
  reviewer_id: string;
  evaluation_type: string;
  status: string;
  total_score: number | null;
  max_possible_score: number | null;
  overall_result: string | null;
  created_at: string;
  finalized_at: string | null;
  employee?: {
    full_name: string;
    photo_url: string | null;
    position: string | null;
    department: string | null;
  };
  reviewer?: {
    full_name: string;
  };
}

interface EvaluationListProps {
  employeeId?: string;
  showFilters?: boolean;
}

export const EvaluationList = ({ employeeId, showFilters = true }: EvaluationListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<Evaluation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchEvaluations();
  }, [employeeId]);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('employee_evaluations')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch employee and reviewer profiles
      if (data && data.length > 0) {
        const employeeIds = [...new Set(data.map(e => e.employee_id))];
        const reviewerIds = [...new Set(data.map(e => e.reviewer_id))];
        const allIds = [...new Set([...employeeIds, ...reviewerIds])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, photo_url, position, department')
          .in('id', allIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        const enrichedData = data.map(evaluation => ({
          ...evaluation,
          employee: profileMap.get(evaluation.employee_id),
          reviewer: profileMap.get(evaluation.reviewer_id)
        }));

        setEvaluations(enrichedData);
      } else {
        setEvaluations([]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = !searchTerm || 
      evaluation.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.employee?.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: 'outline',
      submitted: 'secondary',
      reviewed: 'default',
      finalized: 'default'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const canDeleteEvaluation = (evaluation: Evaluation) => {
    // Admins can delete any evaluation
    if (isAdmin) return true;
    // Reviewers can delete their own draft evaluations
    return evaluation.reviewer_id === user?.id && evaluation.status === 'draft';
  };

  const handleDeleteClick = (evaluation: Evaluation) => {
    setEvaluationToDelete(evaluation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!evaluationToDelete) return;
    setIsDeleting(true);
    try {
      // Delete section scores first
      await supabase.from('evaluation_section_scores').delete().eq('evaluation_id', evaluationToDelete.id);
      // Delete KPIs
      await supabase.from('evaluation_kpis').delete().eq('evaluation_id', evaluationToDelete.id);
      // Delete evaluation
      const { error } = await supabase.from('employee_evaluations').delete().eq('id', evaluationToDelete.id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Evaluation deleted successfully." });
      fetchEvaluations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEvaluationToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Evaluations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Table */}
        {filteredEvaluations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No evaluations found</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={evaluation.employee?.photo_url || ''} />
                          <AvatarFallback>
                            {evaluation.employee?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{evaluation.employee?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {evaluation.employee?.position}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">
                        {evaluation.evaluation_type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                    <TableCell>
                      {evaluation.total_score !== null ? (
                        <span className="font-medium">
                          {evaluation.total_score}/{evaluation.max_possible_score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {evaluation.overall_result ? (
                        <Badge variant={getResultBadgeVariant(evaluation.overall_result)}>
                          {evaluation.overall_result}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(new Date(evaluation.created_at), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/evaluations/${evaluation.id}`)}
                        >
                          {evaluation.status === 'draft' && evaluation.reviewer_id === user?.id ? (
                            <>
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </>
                          )}
                        </Button>
                        {canDeleteEvaluation(evaluation) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(evaluation)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Evaluation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this evaluation for {evaluationToDelete?.employee?.full_name}? 
                This will also remove all section scores and KPIs. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
