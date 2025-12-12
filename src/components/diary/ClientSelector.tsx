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
import { Building2 } from 'lucide-react';

interface ClientSelectorProps {
  value: string | null;
  onChange: (clientId: string | null) => void;
}

export const ClientSelector = ({ value, onChange }: ClientSelectorProps) => {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Client / Company
      </Label>
      <Select
        value={value || 'none'}
        onValueChange={(v) => onChange(v === 'none' ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a client (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No client</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
