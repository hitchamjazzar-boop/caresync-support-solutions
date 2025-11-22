import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Users, Search } from 'lucide-react';

interface EmployeeSelectorProps {
  selectedEmployees: string[];
  onSelectionChange: (employeeIds: string[]) => void;
}

export function EmployeeSelector({ selectedEmployees, onSelectionChange }: EmployeeSelectorProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position, department')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleEmployee = (employeeId: string) => {
    onSelectionChange(
      selectedEmployees.includes(employeeId)
        ? selectedEmployees.filter(id => id !== employeeId)
        : [...selectedEmployees, employeeId]
    );
  };

  const selectAll = () => {
    onSelectionChange(employees.map(e => e.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Employees
          {selectedEmployees.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedEmployees.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Select Employees</h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredEmployees.map(employee => (
              <div
                key={employee.id}
                className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg cursor-pointer"
                onClick={() => toggleEmployee(employee.id)}
              >
                <Checkbox checked={selectedEmployees.includes(employee.id)} />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={employee.photo_url} />
                  <AvatarFallback>{employee.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{employee.full_name}</div>
                  {employee.position && (
                    <div className="text-xs text-muted-foreground truncate">{employee.position}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}