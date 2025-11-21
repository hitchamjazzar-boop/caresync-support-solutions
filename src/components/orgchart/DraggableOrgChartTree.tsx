import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, User, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

interface SortableNodeProps {
  node: OrgChartNode;
  onEdit: (node: OrgChartNode) => void;
  onDelete: (node: OrgChartNode) => void;
  children?: React.ReactNode;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (nodeId: string) => void;
  childCount?: number;
}

function SortableNode({ 
  node, 
  onEdit, 
  onDelete, 
  children, 
  hasChildren, 
  isCollapsed, 
  onToggleCollapse,
  childCount = 0 
}: SortableNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col items-center">
      <Card className={`w-64 mb-4 transition-all ${isDragging ? 'shadow-2xl scale-105' : 'hover:shadow-lg'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1"
            >
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
      {!isCollapsed && children}
    </div>
  );
}

function NodeCard({ node }: { node: OrgChartNode }) {
  return (
    <Card className="w-64 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [internalCollapsedNodes, setInternalCollapsedNodes] = useState<Set<string>>(new Set());

  // Use external state if provided, otherwise use internal state
  const collapsedNodes = externalCollapsedNodes || internalCollapsedNodes;
  const toggleCollapse = externalToggleCollapse || ((nodeId: string) => {
    setInternalCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const buildTree = (parentId: string | null = null): OrgChartNode[] => {
    return nodes
      .filter(node => node.parent_id === parentId)
      .sort((a, b) => a.position_order - b.position_order);
  };

  const countAllDescendants = (nodeId: string): number => {
    const children = buildTree(nodeId);
    return children.reduce((count, child) => {
      return count + 1 + countAllDescendants(child.id);
    }, 0);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const activeNode = nodes.find(n => n.id === active.id);
    const overNode = nodes.find(n => n.id === over.id);

    if (!activeNode || !overNode) return;

    // Prevent dropping a node on its own descendants
    const getDescendants = (nodeId: string): string[] => {
      const descendants: string[] = [nodeId];
      const children = nodes.filter(n => n.parent_id === nodeId);
      children.forEach(child => {
        descendants.push(...getDescendants(child.id));
      });
      return descendants;
    };

    if (getDescendants(activeNode.id).includes(overNode.id)) {
      return;
    }

    // Check if we're reordering siblings or changing parent
    if (activeNode.parent_id === overNode.parent_id) {
      // Reordering siblings
      const siblings = buildTree(activeNode.parent_id);
      const oldIndex = siblings.findIndex(n => n.id === active.id);
      const newIndex = siblings.findIndex(n => n.id === over.id);

      if (oldIndex !== newIndex) {
        onDragEnd(activeNode.id, activeNode.parent_id, newIndex);
      }
    } else {
      // Changing parent - make it a sibling of the over node
      const overSiblings = buildTree(overNode.parent_id);
      const overIndex = overSiblings.findIndex(n => n.id === over.id);
      onDragEnd(activeNode.id, overNode.parent_id, overIndex + 1);
    }
  };

  const renderNode = (node: OrgChartNode, level: number = 0): JSX.Element => {
    const children = buildTree(node.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    const childCount = countAllDescendants(node.id);

    return (
      <SortableNode
        key={node.id}
        node={node}
        onEdit={onEdit}
        onDelete={onDelete}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        childCount={childCount}
      >
        {hasChildren && !isCollapsed && (
          <div className="relative animate-fade-in">
            <div className="absolute left-1/2 top-0 w-0.5 h-4 bg-border -translate-x-1/2" />
            <SortableContext
              items={children.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
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
            </SortableContext>
          </div>
        )}
      </SortableNode>
    );
  };

  const rootNodes = buildTree(null);
  const activeNode = activeId ? nodes.find(n => n.id === activeId) : null;

  if (rootNodes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No positions in the organizational chart
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex justify-center gap-12 min-w-max p-8">
          <SortableContext
            items={rootNodes.map(n => n.id)}
            strategy={verticalListSortingStrategy}
          >
            {rootNodes.map(node => renderNode(node))}
          </SortableContext>
        </div>
      </div>
      <DragOverlay>
        {activeNode ? <NodeCard node={activeNode} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
