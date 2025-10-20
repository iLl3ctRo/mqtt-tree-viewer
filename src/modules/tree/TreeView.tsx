// Virtualized tree view component

import { useMemo } from 'react';
import { useTopicStore } from './useTopicStore';
import { useUiStore } from '../ui/useUiStore';
import { flattenTree, filterTree } from './topicTree';
import { TreeNodeRow } from './TreeNodeRow';
import { VirtualList } from '../ui/VirtualList';

const ROW_HEIGHT = 32;

export interface TreeViewProps {
  height: number;
}

export function TreeView({ height }: TreeViewProps) {
  const nodes = useTopicStore((s) => s.nodes);
  const expanded = useTopicStore((s) => s.expanded);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const filterRetainedOnly = useUiStore((s) => s.filterRetainedOnly);
  const filterChangedInMinutes = useUiStore((s) => s.filterChangedInMinutes);

  const flattenedItems = useMemo(() => {
    // Apply filters
    let filteredNodeIds: Set<string> | undefined;
    if (searchQuery || filterRetainedOnly || filterChangedInMinutes !== null) {
      filteredNodeIds = filterTree(nodes, searchQuery, filterRetainedOnly, filterChangedInMinutes);
    }

    // Create filtered map
    const filteredNodes = filteredNodeIds
      ? new Map(Array.from(nodes.entries()).filter(([id]) => filteredNodeIds!.has(id)))
      : nodes;

    // Flatten for virtualization
    return flattenTree(filteredNodes, expanded);
  }, [nodes, expanded, searchQuery, filterRetainedOnly, filterChangedInMinutes]);

  if (flattenedItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No topics yet. Connect to a broker to start receiving messages.</p>
      </div>
    );
  }

  return (
    <VirtualList
      items={flattenedItems}
      height={height}
      itemHeight={ROW_HEIGHT}
      className="border border-gray-200 dark:border-gray-700 rounded"
      renderItem={(item, _index, style) => (
        <TreeNodeRow nodeId={item.id} depth={item.depth} style={style} />
      )}
    />
  );
}
