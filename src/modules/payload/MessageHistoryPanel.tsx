// Message history list component

import { formatTime } from '../../utils/time';
import { formatBytes } from '../../utils/bytes';
import type { MessageRecord } from '../tree/types';

export interface MessageHistoryPanelProps {
  messages: MessageRecord[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
}

export function MessageHistoryPanel({ messages, selectedMessageId, onSelectMessage }: MessageHistoryPanelProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No messages received on this topic yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-800">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {messages.map((message) => {
          const isSelected = selectedMessageId === message.id;
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
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate font-mono">
                    {payloadPreview}
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {formatBytes(message.payload.length)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
