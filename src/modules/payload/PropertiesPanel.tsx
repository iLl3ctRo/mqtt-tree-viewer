// MQTT v5 properties panel

import { formatTimestamp } from '../../utils/time';
import type { MessageRecord } from '../tree/types';

export interface PropertiesPanelProps {
  message: MessageRecord;
}

export function PropertiesPanel({ message }: PropertiesPanelProps) {
  return (
    <div className="p-4 space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Topic:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1 font-mono text-xs break-all">{message.topic}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Timestamp:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{formatTimestamp(message.ts)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">QoS:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{message.qos}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Retained:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{message.retained ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Duplicate:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{message.dup ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {message.contentType && (
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Content Type:</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1 font-mono text-xs">{message.contentType}</p>
        </div>
      )}

      {message.properties && Object.keys(message.properties).length > 0 && (
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">MQTT v5 Properties:</span>
          <div className="mt-2 bg-gray-50 dark:bg-gray-900 p-3 rounded space-y-2">
            {Object.entries(message.properties).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">{key}:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono text-xs ml-2">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
