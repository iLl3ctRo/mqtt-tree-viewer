// Topic tree flattening and filtering utilities

import type { TopicNode, TopicNodeId, FlattenedTreeItem } from './types';

export function flattenTree(
  nodes: Map<TopicNodeId, TopicNode>,
  expandedSet: Set<TopicNodeId>,
  rootIds: TopicNodeId[] = []
): FlattenedTreeItem[] {
  const result: FlattenedTreeItem[] = [];

  // Find root nodes (nodes without parents)
  if (rootIds.length === 0) {
    nodes.forEach((node) => {
      if (!node.parentId) {
        rootIds.push(node.id);
      }
    });
    rootIds.sort();
  }

  function traverse(nodeId: TopicNodeId, depth: number) {
    const node = nodes.get(nodeId);
    if (!node) return;

    result.push({ id: nodeId, depth });

    // Only traverse children if this node is expanded
    if (expandedSet.has(nodeId) || node.expanded) {
      node.children.forEach((childId) => {
        traverse(childId, depth + 1);
      });
    }
  }

  rootIds.forEach((rootId) => traverse(rootId, 0));

  return result;
}

export function filterTree(
  nodes: Map<TopicNodeId, TopicNode>,
  query: string,
  retainedOnly: boolean = false,
  changedInMinutes: number | null = null
): Set<TopicNodeId> {
  const now = Date.now();
  const timeThreshold = changedInMinutes ? now - changedInMinutes * 60 * 1000 : null;
  const matchedIds = new Set<TopicNodeId>();

  nodes.forEach((node, id) => {
    let matches = true;

    // Text filter
    if (query) {
      const lowerQuery = query.toLowerCase();
      matches = node.path.toLowerCase().includes(lowerQuery) || node.name.toLowerCase().includes(lowerQuery);
    }

    // Retained filter
    if (matches && retainedOnly) {
      matches = node.retained === true;
    }

    // Time filter
    if (matches && timeThreshold && node.lastTimestamp) {
      matches = node.lastTimestamp >= timeThreshold;
    }

    if (matches) {
      matchedIds.add(id);
      // Also include all ancestors to maintain tree structure
      let parentId = node.parentId;
      while (parentId) {
        matchedIds.add(parentId);
        const parent = nodes.get(parentId);
        parentId = parent?.parentId;
      }
    }
  });

  return matchedIds;
}
