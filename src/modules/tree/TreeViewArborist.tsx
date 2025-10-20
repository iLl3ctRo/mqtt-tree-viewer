// React-Arborist tree view component

import { useMemo, useRef } from 'react';
import { Tree, type NodeApi } from 'react-arborist';
import { useTopicStore } from './useTopicStore';
import { useUiStore } from '../ui/useUiStore';
import { filterTree } from './topicTree';
import { transformToArboristData, convertExpandedSetToOpenMap, type TreeNodeData } from './treeAdapter';
import { ArboristNode } from './ArboristNode';

const ROW_HEIGHT = 32;

export interface TreeViewArboristProps {
  height: number;
  width?: number;
}

export function TreeViewArborist({ height, width }: TreeViewArboristProps) {
  const nodes = useTopicStore((s) => s.nodes);
  const expanded = useTopicStore((s) => s.expanded);
  const toggleExpanded = useTopicStore((s) => s.toggleExpanded);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const filterRetainedOnly = useUiStore((s) => s.filterRetainedOnly);
  const filterChangedInMinutes = useUiStore((s) => s.filterChangedInMinutes);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useUiStore((s) => s.setSelectedNodeId);

  const treeRef = useRef<any>(null);

  // Apply filters before transformation
  const filteredNodes = useMemo(() => {
    // Apply metadata filters (retained, time-based)
    let filteredNodeIds: Set<string> | undefined;
    if (filterRetainedOnly || filterChangedInMinutes !== null) {
      filteredNodeIds = filterTree(nodes, '', filterRetainedOnly, filterChangedInMinutes);
    }

    // Create filtered map
    const result = filteredNodeIds
      ? new Map(Array.from(nodes.entries()).filter(([id]) => filteredNodeIds!.has(id)))
      : nodes;

    return result;
  }, [nodes, filterRetainedOnly, filterChangedInMinutes]);

  // Transform to nested tree structure
  const treeData = useMemo(() => {
    return transformToArboristData(filteredNodes);
  }, [filteredNodes]);

  // Convert expanded Set to OpenMap
  const initialOpenState = useMemo(() => {
    return convertExpandedSetToOpenMap(expanded);
  }, [expanded]);

  // Custom search function for text matching
  const searchMatch = useMemo(() => {
    if (!searchQuery) return undefined;

    const lowerQuery = searchQuery.toLowerCase();
    return (node: NodeApi<TreeNodeData>) => {
      return (
        node.data.name.toLowerCase().includes(lowerQuery) ||
        node.data.path.toLowerCase().includes(lowerQuery)
      );
    };
  }, [searchQuery]);

  // Handle toggle event
  const handleToggle = (nodeId: string) => {
    toggleExpanded(nodeId);
  };

  // Handle selection event
  const handleSelect = (nodes: NodeApi<TreeNodeData>[]) => {
    if (nodes.length > 0) {
      setSelectedNodeId(nodes[0].data.id);
    } else {
      setSelectedNodeId(null);
    }
  };

  // Empty state
  if (treeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded">
        <p>No topics yet. Connect to a broker to start receiving messages.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded">
      <Tree
        ref={treeRef}
        data={treeData}
        height={height}
        width={width || '100%'}
        rowHeight={ROW_HEIGHT}
        openByDefault={false}
        initialOpenState={initialOpenState}
        idAccessor="id"
        childrenAccessor="children"
        searchTerm={searchQuery}
        searchMatch={searchMatch}
        selection={selectedNodeId || undefined}
        onToggle={handleToggle}
        onSelect={handleSelect}
        disableMultiSelection={true}
      >
        {ArboristNode}
      </Tree>
    </div>
  );
}
