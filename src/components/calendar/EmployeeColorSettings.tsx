import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Palette, RotateCcw } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  calendar_color: string | null;
}

const DEFAULT_COLORS = [
  "#FF6B9D", // Pink
  "#4F46E5", // Blue
  "#10B981", // Green
  "#F59E0B", // Orange
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#F97316", // Deep Orange
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#84CC16", // Lime
];

export function EmployeeColorSettings() {
  const { isAdmin } = useAdmin();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, position, calendar_color")
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (employeeId: string, color: string) => {
    setEmployees(prev =>
      prev.map(emp =>
        emp.id === employeeId ? { ...emp, calendar_color: color } : emp
      )
    );
  };

  const handleSave = async (employeeId: string, color: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ calendar_color: color })
        .eq("id", employeeId);

      if (error) throw error;
      toast.success("Color updated successfully");
    } catch (error) {
      console.error("Error saving color:", error);
      toast.error("Failed to save color");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (employeeId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ calendar_color: null })
        .eq("id", employeeId);

      if (error) throw error;
      
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === employeeId ? { ...emp, calendar_color: null } : emp
        )
      );
      
      toast.success("Color reset to default");
    } catch (error) {
      console.error("Error resetting color:", error);
      toast.error("Failed to reset color");
    } finally {
      setSaving(false);
    }
  };

  const getDefaultColor = (index: number) => {
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Employee Calendar Colors</h2>
      </div>

      <div className="grid gap-4">
        {employees.map((employee, index) => {
          const displayColor = employee.calendar_color || getDefaultColor(index);
          
          return (
            <div
              key={employee.id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card"
            >
              <div
                className="w-12 h-12 rounded-full border-2 border-border flex-shrink-0"
                style={{ backgroundColor: displayColor }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{employee.full_name}</div>
                {employee.position && (
                  <div className="text-sm text-muted-foreground truncate">
                    {employee.position}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor={`color-${employee.id}`} className="sr-only">
                  Color for {employee.full_name}
                </Label>
                <input
                  id={`color-${employee.id}`}
                  type="color"
                  value={displayColor}
                  onChange={(e) => handleColorChange(employee.id, e.target.value)}
                  onBlur={(e) => handleSave(employee.id, e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer border border-border"
                  disabled={saving}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReset(employee.id)}
                  disabled={saving || !employee.calendar_color}
                  title="Reset to default"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        Colors are automatically assigned by default. Customize them here to make
        each employee's schedule instantly recognizable.
      </div>
    </div>
  );
}
