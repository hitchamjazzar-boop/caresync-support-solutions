import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Building, UserCheck } from 'lucide-react';

interface AssignmentSelectorProps {
  assignmentType: 'all' | 'specific' | 'department';
  assignedTo: string[];
  assignedDepartments: string[];
  onAssignmentTypeChange: (type: 'all' | 'specific' | 'department') => void;
  onAssignedToChange: (ids: string[]) => void;
  onAssignedDepartmentsChange: (departments: string[]) => void;
}

export const AssignmentSelector = ({
  assignmentType,
  assignedTo,
  assignedDepartments,
  onAssignmentTypeChange,
  onAssignedToChange,
  onAssignedDepartmentsChange,
}: AssignmentSelectorProps) => {
  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  // Get unique departments
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[];

  const handleEmployeeToggle = (employeeId: string) => {
    if (assignedTo.includes(employeeId)) {
      onAssignedToChange(assignedTo.filter((id) => id !== employeeId));
    } else {
      onAssignedToChange([...assignedTo, employeeId]);
    }
  };

  const handleDepartmentToggle = (department: string) => {
    if (assignedDepartments.includes(department)) {
      onAssignedDepartmentsChange(assignedDepartments.filter((d) => d !== department));
    } else {
      onAssignedDepartmentsChange([...assignedDepartments, department]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Assignment</Label>
        <Select
          value={assignmentType}
          onValueChange={(v) => onAssignmentTypeChange(v as 'all' | 'specific' | 'department')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Employees
              </div>
            </SelectItem>
            <SelectItem value="specific">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Specific Employees
              </div>
            </SelectItem>
            <SelectItem value="department">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                By Department
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {assignmentType === 'specific' && (
        <div className="space-y-2">
          <Label>Select Employees</Label>
          <ScrollArea className="h-40 rounded-md border p-2">
            <div className="space-y-2">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`employee-${employee.id}`}
                    checked={assignedTo.includes(employee.id)}
                    onCheckedChange={() => handleEmployeeToggle(employee.id)}
                  />
                  <label
                    htmlFor={`employee-${employee.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {employee.full_name}
                    {employee.department && (
                      <span className="text-muted-foreground ml-2">({employee.department})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          {assignedTo.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {assignedTo.length} employee{assignedTo.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {assignmentType === 'department' && (
        <div className="space-y-2">
          <Label>Select Departments</Label>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments found. Assign departments to employees first.
            </p>
          ) : (
            <ScrollArea className="h-40 rounded-md border p-2">
              <div className="space-y-2">
                {departments.map((department) => (
                  <div key={department} className="flex items-center gap-2">
                    <Checkbox
                      id={`dept-${department}`}
                      checked={assignedDepartments.includes(department)}
                      onCheckedChange={() => handleDepartmentToggle(department)}
                    />
                    <label htmlFor={`dept-${department}`} className="text-sm cursor-pointer flex-1">
                      {department}
                      <span className="text-muted-foreground ml-2">
                        ({employees.filter((e) => e.department === department).length} employees)
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          {assignedDepartments.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {assignedDepartments.length} department{assignedDepartments.length !== 1 ? 's' : ''}{' '}
              selected
            </p>
          )}
        </div>
      )}
    </div>
  );
};
