import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, User } from 'lucide-react';

interface OrgChartNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  hierarchy_level: number;
  position_order: number;
  profiles: {
    full_name: string;
    position: string | null;
    photo_url: string | null;
  };
}

interface OrgChartTreeProps {
  nodes: OrgChartNode[];
  onEdit?: (node: OrgChartNode) => void;
  onDelete?: (node: OrgChartNode) => void;
  editable?: boolean;
}

export function OrgChartTree({ nodes, onEdit, onDelete, editable = false }: OrgChartTreeProps) {
  const buildTree = (parentId: string | null = null): OrgChartNode[] => {
    return nodes
      .filter(node => node.parent_id === parentId)
      .sort((a, b) => a.position_order - b.position_order);
  };

  const renderNode = (node: OrgChartNode, level: number = 0) => {
    const children = buildTree(node.id);
    const hasChildren = children.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <Card className="w-64 mb-4 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={node.profiles.photo_url || undefined} />
                <AvatarFallback>
                  {node.profiles.full_name?.charAt(0) || <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{node.profiles.full_name}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {node.profiles.position || 'No position set'}
                </p>
              </div>
              {editable && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit?.(node)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onDelete?.(node)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {hasChildren && (
          <div className="relative">
            <div className="absolute left-1/2 top-0 w-0.5 h-4 bg-border -translate-x-1/2" />
            <div className="flex gap-8 pt-4">
              {children.map((child, index) => (
                <div key={child.id} className="relative">
                  {index === 0 && children.length > 1 && (
                    <div className="absolute left-0 top-0 right-1/2 h-0.5 bg-border" />
                  )}
                  {index === children.length - 1 && children.length > 1 && (
                    <div className="absolute right-0 top-0 left-1/2 h-0.5 bg-border" />
                  )}
                  {index > 0 && index < children.length - 1 && (
                    <div className="absolute left-0 top-0 right-0 h-0.5 bg-border" />
                  )}
                  <div className="absolute left-1/2 top-0 w-0.5 h-4 bg-border -translate-x-1/2" />
                  {renderNode(child, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootNodes = buildTree(null);

  if (rootNodes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No positions in the organizational chart
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex justify-center gap-12 min-w-max p-8">
        {rootNodes.map(node => renderNode(node))}
      </div>
    </div>
  );
}
