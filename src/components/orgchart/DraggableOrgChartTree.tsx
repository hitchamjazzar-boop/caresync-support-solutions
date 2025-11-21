import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, User, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

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

interface DraggableOrgChartTreeProps {
  nodes: OrgChartNode[];
  onEdit: (node: OrgChartNode) => void;
  onDelete: (node: OrgChartNode) => void;
  onDragEnd: (nodeId: string, newParentId: string | null, newOrder: number) => void;
  collapsedNodes?: Set<string>;
  onToggleCollapse?: (nodeId: string) => void;
}

interface NodeCardProps {
  node: OrgChartNode;
  onEdit: (node: OrgChartNode) => void;
  onDelete: (node: OrgChartNode) => void;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (nodeId: string) => void;
  childCount: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function NodeCard({
  node,
  onEdit,
  onDelete,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  childCount,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: NodeCardProps) {
  return (
    <Card
      className={`w-64 mb-4 transition-all ${
        isDragging ? 'opacity-50 scale-95' : isDragOver ? 'ring-2 ring-primary shadow-lg scale-105' : 'hover:shadow-lg'
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="cursor-grab active:cursor-grabbing mt-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
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
            {hasChildren && (
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {childCount} {childCount === 1 ? 'report' : 'reports'}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onToggleCollapse(node.id)}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(node)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(node)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DraggableOrgChartTree({
  nodes,
  onEdit,
  onDelete,
  onDragEnd,
  collapsedNodes: externalCollapsedNodes,
  onToggleCollapse: externalToggleCollapse,
}: DraggableOrgChartTreeProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [internalCollapsedNodes, setInternalCollapsedNodes] = useState<Set<string>>(new Set());

  const collapsedNodes = externalCollapsedNodes || internalCollapsedNodes;
  const toggleCollapse =
    externalToggleCollapse ||
    ((nodeId: string) => {
      setInternalCollapsedNodes((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
    });

  const buildTree = (parentId: string | null = null): OrgChartNode[] => {
    return nodes
      .filter((node) => node.parent_id === parentId)
      .sort((a, b) => a.position_order - b.position_order);
  };

  const countAllDescendants = (nodeId: string): number => {
    const children = buildTree(nodeId);
    return children.reduce((count, child) => {
      return count + 1 + countAllDescendants(child.id);
    }, 0);
  };

  const getDescendants = (nodeId: string): string[] => {
    const descendants: string[] = [nodeId];
    const children = nodes.filter((n) => n.parent_id === nodeId);
    children.forEach((child) => {
      descendants.push(...getDescendants(child.id));
    });
    return descendants;
  };

  const handleDragStart = (nodeId: string) => (e: React.DragEvent) => {
    setDraggedNodeId(nodeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
  };

  const handleDragOver = (nodeId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedNodeId && draggedNodeId !== nodeId) {
      const draggedNode = nodes.find((n) => n.id === draggedNodeId);
      if (draggedNode && !getDescendants(draggedNodeId).includes(nodeId)) {
        setDragOverNodeId(nodeId);
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverNodeId(null);
  };

  const handleDrop = (targetNodeId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedNodeId || draggedNodeId === targetNodeId) {
      handleDragEnd();
      return;
    }

    const draggedNode = nodes.find((n) => n.id === draggedNodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);

    if (!draggedNode || !targetNode) {
      handleDragEnd();
      return;
    }

    // Prevent dropping on descendants
    if (getDescendants(draggedNodeId).includes(targetNodeId)) {
      handleDragEnd();
      return;
    }

    // Check if reordering siblings or changing parent
    if (draggedNode.parent_id === targetNode.parent_id) {
      // Reordering siblings
      const siblings = buildTree(draggedNode.parent_id);
      const targetIndex = siblings.findIndex((n) => n.id === targetNodeId);
      onDragEnd(draggedNodeId, draggedNode.parent_id, targetIndex);
    } else {
      // Make it a sibling of target node
      const targetSiblings = buildTree(targetNode.parent_id);
      const targetIndex = targetSiblings.findIndex((n) => n.id === targetNodeId);
      onDragEnd(draggedNodeId, targetNode.parent_id, targetIndex + 1);
    }

    handleDragEnd();
  };

  const renderNode = (node: OrgChartNode): JSX.Element => {
    const children = buildTree(node.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    const childCount = countAllDescendants(node.id);
    const isDragging = draggedNodeId === node.id;
    const isDragOver = dragOverNodeId === node.id;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <NodeCard
          node={node}
          onEdit={onEdit}
          onDelete={onDelete}
          hasChildren={hasChildren}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          childCount={childCount}
          isDragging={isDragging}
          isDragOver={isDragOver}
          onDragStart={handleDragStart(node.id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver(node.id)}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop(node.id)}
        />
        {hasChildren && !isCollapsed && (
          <div className="relative animate-fade-in">
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
                  {renderNode(child)}
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
        {rootNodes.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
