import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, BarChart3 } from "lucide-react";

export interface KPIData {
  id?: string;
  metric_name: string;
  target_value: string;
  actual_value: string;
  notes: string;
}

interface KPISectionProps {
  kpis: KPIData[];
  onKPIsChange: (kpis: KPIData[]) => void;
  readOnly?: boolean;
}

export const KPISection = ({ kpis, onKPIsChange, readOnly = false }: KPISectionProps) => {
  const [newKPI, setNewKPI] = useState<KPIData>({
    metric_name: '',
    target_value: '',
    actual_value: '',
    notes: ''
  });

  const handleAddKPI = () => {
    if (!newKPI.metric_name.trim()) return;
    onKPIsChange([...kpis, { ...newKPI }]);
    setNewKPI({ metric_name: '', target_value: '', actual_value: '', notes: '' });
  };

  const handleRemoveKPI = (index: number) => {
    onKPIsChange(kpis.filter((_, i) => i !== index));
  };

  const handleUpdateKPI = (index: number, field: keyof KPIData, value: string) => {
    const updated = [...kpis];
    updated[index] = { ...updated[index], [field]: value };
    onKPIsChange(updated);
  };

  const suggestedMetrics = [
    'Tasks completed',
    'Turnaround time',
    'Leads generated',
    'Client tickets resolved',
    'Error rate',
    'Customer satisfaction score',
    'Projects delivered',
    'Training hours completed'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          KPI / Measurable Results
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track quantifiable performance metrics (optional but recommended)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs Table */}
        {kpis.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Notes</TableHead>
                  {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((kpi, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {readOnly ? (
                        <span>{kpi.metric_name}</span>
                      ) : (
                        <Input
                          value={kpi.metric_name}
                          onChange={(e) => handleUpdateKPI(index, 'metric_name', e.target.value)}
                          className="h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span>{kpi.target_value}</span>
                      ) : (
                        <Input
                          value={kpi.target_value}
                          onChange={(e) => handleUpdateKPI(index, 'target_value', e.target.value)}
                          className="h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span>{kpi.actual_value}</span>
                      ) : (
                        <Input
                          value={kpi.actual_value}
                          onChange={(e) => handleUpdateKPI(index, 'actual_value', e.target.value)}
                          className="h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm">{kpi.notes}</span>
                      ) : (
                        <Input
                          value={kpi.notes}
                          onChange={(e) => handleUpdateKPI(index, 'notes', e.target.value)}
                          className="h-8"
                          placeholder="Add note..."
                        />
                      )}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveKPI(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add New KPI */}
        {!readOnly && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium">Add New KPI</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Metric Name</Label>
                <Input
                  value={newKPI.metric_name}
                  onChange={(e) => setNewKPI({ ...newKPI, metric_name: e.target.value })}
                  placeholder="e.g., Tasks completed"
                  list="suggested-metrics"
                />
                <datalist id="suggested-metrics">
                  {suggestedMetrics.map((metric) => (
                    <option key={metric} value={metric} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target Value</Label>
                <Input
                  value={newKPI.target_value}
                  onChange={(e) => setNewKPI({ ...newKPI, target_value: e.target.value })}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Actual Value</Label>
                <Input
                  value={newKPI.actual_value}
                  onChange={(e) => setNewKPI({ ...newKPI, actual_value: e.target.value })}
                  placeholder="e.g., 48"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  value={newKPI.notes}
                  onChange={(e) => setNewKPI({ ...newKPI, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <Button
              onClick={handleAddKPI}
              disabled={!newKPI.metric_name.trim()}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add KPI
            </Button>
          </div>
        )}

        {kpis.length === 0 && readOnly && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No KPIs recorded for this evaluation.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
