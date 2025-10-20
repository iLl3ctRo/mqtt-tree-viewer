// Adapter layer to convert Zustand flat Map structure to react-arborist nested tree

import type { TopicNode, TopicNodeId } from './types';

/**
 * Tree node data structure for react-arborist
 */
export interface TreeNodeData {
  id: string;
  name: string;
  path: string;
  children?: TreeNodeData[];

  // Metadata
  lastTimestamp?: number;
  retained?: boolean;
  qos?: 0 | 1 | 2;
  lastPayloadId?: string;
  highlightedUntil?: number;
}

/**
 * OpenState map for react-arborist (id -> boolean)
 */
export type OpenMap = Record<string, boolean>;

/**
 * Transforms flat Map of TopicNodes into nested tree structure for react-arborist
 *
 * @param nodes - Flat Map of TopicNode objects from Zustand store
 * @returns Array of root-level TreeNodeData with nested children
 */
export function transformToArboristData(
  nodes: Map<TopicNodeId, TopicNode>
): TreeNodeData[] {
  if (nodes.size === 0) {
    return [];
  }

  // Find root nodes (nodes without parentId)
  const rootNodes: TopicNode[] = [];
  nodes.forEach((node) => {
    if (!node.parentId) {
      rootNodes.push(node);
    }
  });

  // Sort root nodes alphabetically by name
  rootNodes.sort((a, b) => a.name.localeCompare(b.name));

  // Build nested tree structure recursively
  return rootNodes.map((rootNode) => buildNestedChildren(rootNode, nodes));
}

/**
 * Recursively builds nested children for a given node
 *
 * @param node - Current TopicNode to process
 * @param nodesMap - Complete Map of all nodes for lookups
 * @returns TreeNodeData with nested children populated
 */
function buildNestedChildren(
  node: TopicNode,
  nodesMap: Map<TopicNodeId, TopicNode>
): TreeNodeData {
  const treeNode: TreeNodeData = {
    id: node.id,
    name: node.name,
    path: node.path,
    // Metadata passthrough
    lastTimestamp: node.lastTimestamp,
    retained: node.retained,
    qos: node.qos,
    lastPayloadId: node.lastPayloadId,
    highlightedUntil: node.highlightedUntil,
  };

  // If node has children, recursively build them
  if (node.children.length > 0) {
    treeNode.children = node.children
      .map((childId) => nodesMap.get(childId))
      .filter((child): child is TopicNode => child !== undefined)
      .map((child) => buildNestedChildren(child, nodesMap));
  }

  return treeNode;
}

/**
 * Converts Zustand expanded Set to react-arborist OpenMap format
 *
 * @param expandedSet - Set of expanded node IDs from Zustand store
 * @returns OpenMap object where keys are node IDs and values are true
 */
export function convertExpandedSetToOpenMap(
  expandedSet: Set<TopicNodeId>
): OpenMap {
  const openMap: OpenMap = {};
  expandedSet.forEach((id) => {
    openMap[id] = true;
  });
  return openMap;
}

/**
 * Creates a memoization key for data transformation
 * Used to prevent unnecessary recalculations when nodes haven't changed
 *
 * @param nodes - Map of nodes
 * @returns String key representing current state (size + sample of IDs)
 */
export function createMemoKey(nodes: Map<TopicNodeId, TopicNode>): string {
  // Simple memoization key based on size and a sample of node IDs
  // This is a lightweight approach - for more robust caching, consider
  // tracking modification timestamps in the store
  const size = nodes.size;
  const sampleIds = Array.from(nodes.keys()).slice(0, 5).join(',');
  return `${size}-${sampleIds}`;
}
