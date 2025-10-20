// Payload display panel with multiple views

import { useState } from 'react';
import { JsonViewer } from './JsonViewer';
import { toHex, toBase64, formatBytes } from '../../utils/bytes';
import type { MessageRecord } from '../tree/types';

export interface PayloadPanelProps {
  message: MessageRecord;
}

type ViewMode = 'pretty' | 'text' | 'hex' | 'base64';

export function PayloadPanel({ message }: PayloadPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(
    message.payloadJson !== undefined ? 'pretty' : message.payloadText ? 'text' : 'hex'
  );

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex gap-2">
          {message.payloadJson !== undefined && (
            <button
              onClick={() => setViewMode('pretty')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'pretty'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Pretty JSON
            </button>
          )}
          {message.payloadText && (
            <button
              onClick={() => setViewMode('text')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'text'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Text
            </button>
          )}
          <button
            onClick={() => setViewMode('hex')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'hex'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Hex
          </button>
          <button
            onClick={() => setViewMode('base64')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'base64'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Base64
          </button>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(message.payload.length)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'pretty' && message.payloadJson !== undefined && <JsonViewer data={message.payloadJson} />}

        {viewMode === 'text' && message.payloadText && (
          <div className="relative">
            <button
              onClick={() => handleCopy(message.payloadText!)}
              className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <pre className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded overflow-auto text-sm whitespace-pre-wrap break-words">
              {message.payloadText}
            </pre>
          </div>
        )}

        {viewMode === 'hex' && (
          <div className="relative">
            <button
              onClick={() => handleCopy(toHex(message.payload))}
              className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <pre className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded overflow-auto text-xs font-mono">
              {toHex(message.payload)}
            </pre>
          </div>
        )}

        {viewMode === 'base64' && (
          <div className="relative">
            <button
              onClick={() => handleCopy(toBase64(message.payload))}
              className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <pre className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded overflow-auto text-xs font-mono break-all">
              {toBase64(message.payload)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
