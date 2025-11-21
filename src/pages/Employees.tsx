import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog';
import { DeleteEmployeeDialog } from '@/components/employees/DeleteEmployeeDialog';
import { ResetPasswordDialog } from '@/components/employees/ResetPasswordDialog';
import { SendMemoDialog } from '@/components/memos/SendMemoDialog';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export default function Employees() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [memoDialogOpen, setMemoDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const fetchEmployees = async () => {
    if (!user) return;

    if (isAdmin) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) {
        toast.error('Failed to load employees');
      } else {
        setEmployees(data || []);
      }
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error('Failed to load your profile');
      } else {
        setEmployees([data]);
      }
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user, isAdmin]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Employee Management' : 'My Profile'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Manage your team members and their information'
              : 'View your profile information'}
          </p>
        </div>
        {isAdmin && (
          <AddEmployeeDialog onSuccess={fetchEmployees} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card
            key={employee.id}
            className="flex flex-col cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/employees/${employee.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={employee.full_name}
                    className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {employee.full_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{employee.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {employee.position || 'Staff'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col">
              <div className="space-y-2 flex-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Department: </span>
                  <span className="break-words">{employee.department || 'Not assigned'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Email: </span>
                  <span className="break-all">{employee.contact_email}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Start Date: </span>
                  <span>{new Date(employee.start_date).toLocaleDateString()}</span>
                </div>
              </div>
              {isAdmin && (
                <div
                  className="space-y-2 pt-2 border-t"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <EditEmployeeDialog employee={employee} onSuccess={fetchEmployees} />
                    <ResetPasswordDialog 
                      userId={employee.id} 
                      userName={employee.full_name}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmployeeId(employee.id);
                      setMemoDialogOpen(true);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Memo
                  </Button>
                  <DeleteEmployeeDialog
                    employeeId={employee.id}
                    employeeName={employee.full_name}
                    onSuccess={fetchEmployees}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <SendMemoDialog
        open={memoDialogOpen}
        onOpenChange={setMemoDialogOpen}
        preSelectedEmployeeId={selectedEmployeeId}
      />
    </div>
  );
}
