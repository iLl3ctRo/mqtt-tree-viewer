// Custom node renderer for react-arborist

import type { NodeRendererProps } from 'react-arborist';
import { useUiStore } from '../ui/useUiStore';
import { formatTime } from '../../utils/time';
import type { TreeNodeData } from './treeAdapter';

export function ArboristNode({ node, style, dragHandle }: NodeRendererProps<TreeNodeData>) {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.data.id;
  const isOpen = node.isOpen;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`
        flex items-center px-3 py-1 border-b border-gray-200 dark:border-gray-700
        hover:bg-gray-100 dark:hover:bg-gray-800
        cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}
      `}
      onClick={(e) => {
        node.handleClick(e);
        if (hasChildren) {
          node.toggle();
        }
      }}
    >
      {/* Expand/collapse button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) {
            node.toggle();
          }
        }}
        className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        aria-label={isOpen ? 'Collapse' : 'Expand'}
      >
        {hasChildren ? (isOpen ? '▾' : '▸') : '•'}
      </button>

      {/* Node name */}
      <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
        {node.data.name}
      </span>

      {/* Metadata badges */}
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        {node.data.retained && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded border border-blue-200 dark:border-blue-800">
            R
          </span>
        )}
        {node.data.qos !== undefined && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            QoS {node.data.qos}
          </span>
        )}
        {node.data.lastTimestamp && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatTime(node.data.lastTimestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
