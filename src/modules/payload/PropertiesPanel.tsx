// MQTT v5 properties panel

import { formatTimestamp } from '../../utils/time';
import { useTranslation } from 'react-i18next';
import type { MessageRecord } from '../tree/types';

export interface PropertiesPanelProps {
  message: MessageRecord;
}

export function PropertiesPanel({ message }: PropertiesPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="p-4 space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('properties.topic')}</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1 font-mono text-xs break-all">{message.topic}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('properties.timestamp')}</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{formatTimestamp(message.ts)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('properties.qos')}</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{message.qos}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('properties.retained')}</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{message.retained ? t('properties.yes') : t('properties.no')}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('properties.duplicate')}</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1">{message.dup ? t('properties.yes') : t('properties.no')}</p>
        </div>
      </div>

      {message.contentType && (
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('properties.contentType')}</span>
          <p className="text-gray-900 dark:text-gray-100 mt-1 font-mono text-xs">{message.contentType}</p>
        </div>
      )}

      {message.properties && Object.keys(message.properties).length > 0 && (
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('properties.mqttV5Properties')}</span>
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
