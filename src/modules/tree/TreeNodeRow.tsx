// Tree node row component for virtualized list

import type { CSSProperties } from 'react';
import { useTopicStore } from './useTopicStore';
import { useUiStore } from '../ui/useUiStore';
import { formatTime } from '../../utils/time';
import type { TopicNodeId } from './types';

export interface TreeNodeRowProps {
  nodeId: TopicNodeId;
  depth: number;
  style?: CSSProperties;
}

export function TreeNodeRow({ nodeId, depth, style }: TreeNodeRowProps) {
  const nodes = useTopicStore((s) => s.nodes);
  const toggleExpanded = useTopicStore((s) => s.toggleExpanded);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useUiStore((s) => s.setSelectedNodeId);

  const node = nodes.get(nodeId);

  if (!node) return null;

  const hasChildren = node.children.length > 0;
  const isSelected = selectedNodeId === nodeId;
  const isExpanded = node.expanded;

  return (
    <div
      style={style}
      className={`
        flex items-center px-3 py-1 border-b border-gray-200 dark:border-gray-700
        hover:bg-gray-100 dark:hover:bg-gray-800
        cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}
      `}
      onClick={() => {
        setSelectedNodeId(nodeId);
        if (hasChildren) {
          toggleExpanded(nodeId);
        }
      }}
    >
      <div style={{ width: depth * 20 }} className="flex-shrink-0" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) {
            toggleExpanded(nodeId);
          }
        }}
        className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
      </button>

      <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{node.name}</span>

      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        {node.retained && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded border border-blue-200 dark:border-blue-800">
            R
          </span>
        )}
        {node.qos !== undefined && (
          <span className="text-xs text-gray-500 dark:text-gray-400">QoS {node.qos}</span>
        )}
        {node.lastTimestamp && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(node.lastTimestamp)}</span>
        )}
      </div>
    </div>
  );
}
