import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog';
import { DeleteEmployeeDialog } from '@/components/employees/DeleteEmployeeDialog';

export default function Employees() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [employees, setEmployees] = useState<any[]>([]);

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
          <Card key={employee.id}>
            <CardHeader>
              <div className="flex items-start gap-4">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={employee.full_name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {employee.full_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{employee.position || 'Staff'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Department: </span>
                <span>{employee.department || 'Not assigned'}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span>{employee.contact_email}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Start Date: </span>
                <span>{new Date(employee.start_date).toLocaleDateString()}</span>
              </div>
              {isAdmin && (
                <div className="mt-2 space-y-2">
                  <EditEmployeeDialog employee={employee} onSuccess={fetchEmployees} />
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
    </div>
  );
}
