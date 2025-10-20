// Message history list component

import { formatTime } from '../../utils/time';
import { formatBytes } from '../../utils/bytes';
import type { MessageRecord } from '../tree/types';

export interface MessageHistoryPanelProps {
  messages: MessageRecord[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
  compareMessageId?: string | null;
  onCompareMessage?: (messageId: string | null) => void;
}

export function MessageHistoryPanel({
  messages,
  selectedMessageId,
  onSelectMessage,
  compareMessageId,
  onCompareMessage,
}: MessageHistoryPanelProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No messages received on this topic yet</p>
      </div>
    );
  }

  const newestMessageId = messages.length > 0 ? messages[0].id : null;

  const handleCompareClick = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCompareMessage) return;

    // Toggle comparison if clicking the same message
    if (compareMessageId === messageId) {
      onCompareMessage(null);
    } else {
      onCompareMessage(messageId);
    }
  };

  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-800">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {messages.map((message) => {
          const isSelected = selectedMessageId === message.id;
          const isComparing = compareMessageId === message.id;
          const isNewest = message.id === newestMessageId;
          const payloadPreview = message.payloadText
            ? message.payloadText.substring(0, 100)
            : `Binary (${formatBytes(message.payload.length)})`;

          return (
            <div
              key={message.id}
              onClick={() => onSelectMessage(message.id)}
              className={`
                px-4 py-3 cursor-pointer transition-colors
                hover:bg-gray-50 dark:hover:bg-gray-700
                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' : ''}
                ${isComparing ? 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500' : ''}
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(message.ts)}
                    </span>
                    {message.retained && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded border border-blue-200 dark:border-blue-800">
                        R
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">QoS {message.qos}</span>
                    {isComparing && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded border border-purple-200 dark:border-purple-800">
                        Comparing
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate font-mono">
                    {payloadPreview}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isNewest && onCompareMessage && (
                    <button
                      onClick={(e) => handleCompareClick(message.id, e)}
                      className={`
                        flex-shrink-0 px-2 py-1 text-xs rounded transition-colors
                        ${
                          isComparing
                            ? 'bg-purple-500 text-white hover:bg-purple-600'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }
                      `}
                      title="Compare with newest message"
                    >
                      {isComparing ? 'Clear' : 'Compare'}
                    </button>
                  )}
                  <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {formatBytes(message.payload.length)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
