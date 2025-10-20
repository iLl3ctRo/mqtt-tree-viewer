// Diff viewer component for comparing two MQTT messages

import { useMemo, useState } from 'react';
import type { MessageRecord } from '../tree/types';
import {
  createTextDiff,
  createJsonDiff,
  createHexDiff,
  createMetadataDiff,
  formatHexByte,
  formatJsonPath,
  type TextDiffResult,
  type JsonDiffResult,
  type HexDiffResult,
  type MetadataDiffResult,
} from '../../utils/diff';

export interface DiffViewerProps {
  oldMessage: MessageRecord; // Earlier message (base)
  newMessage: MessageRecord; // Newer message (changes)
}

type DiffMode = 'text' | 'json' | 'hex' | 'metadata';

export function DiffViewer({ oldMessage, newMessage }: DiffViewerProps) {
  // Always default to text diff
  const [diffMode, setDiffMode] = useState<DiffMode>('text');
  const [copied, setCopied] = useState(false);

  // Calculate diffs
  const textDiff = useMemo<TextDiffResult | null>(() => {
    if (oldMessage.payloadText && newMessage.payloadText) {
      return createTextDiff(oldMessage.payloadText, newMessage.payloadText);
    }
    return null;
  }, [oldMessage.payloadText, newMessage.payloadText]);

  const jsonDiff = useMemo<JsonDiffResult | null>(() => {
    if (oldMessage.payloadJson !== undefined && newMessage.payloadJson !== undefined) {
      return createJsonDiff(oldMessage.payloadJson, newMessage.payloadJson);
    }
    return null;
  }, [oldMessage.payloadJson, newMessage.payloadJson]);

  const hexDiff = useMemo<HexDiffResult>(() => {
    return createHexDiff(oldMessage.payload, newMessage.payload);
  }, [oldMessage.payload, newMessage.payload]);

  const metadataDiff = useMemo<MetadataDiffResult>(() => {
    return createMetadataDiff(oldMessage, newMessage);
  }, [oldMessage, newMessage]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if messages are identical
  const areIdentical =
    !textDiff?.hasChanges &&
    !jsonDiff?.hasChanges &&
    !hexDiff.hasChanges &&
    !metadataDiff.hasChanges;

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex gap-2">
          {textDiff && (
            <button
              onClick={() => setDiffMode('text')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                diffMode === 'text'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Text Diff
            </button>
          )}
          {jsonDiff && (
            <button
              onClick={() => setDiffMode('json')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                diffMode === 'json'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              JSON Diff
            </button>
          )}
          <button
            onClick={() => setDiffMode('hex')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              diffMode === 'hex'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Hex Diff
          </button>
          <button
            onClick={() => setDiffMode('metadata')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              diffMode === 'metadata'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Metadata
          </button>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(oldMessage.ts).toLocaleTimeString()} → {new Date(newMessage.ts).toLocaleTimeString()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {areIdentical && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">✓</div>
              <div>Messages are identical</div>
            </div>
          </div>
        )}

        {!areIdentical && diffMode === 'text' && textDiff && (
          <TextDiffView diff={textDiff} onCopy={handleCopy} copied={copied} />
        )}

        {!areIdentical && diffMode === 'json' && jsonDiff && (
          <JsonDiffView diff={jsonDiff} onCopy={handleCopy} copied={copied} />
        )}

        {!areIdentical && diffMode === 'hex' && (
          <HexDiffView diff={hexDiff} onCopy={handleCopy} copied={copied} />
        )}

        {diffMode === 'metadata' && (
          <MetadataDiffView diff={metadataDiff} onCopy={handleCopy} copied={copied} />
        )}
      </div>
    </div>
  );
}

// Text diff view component
function TextDiffView({
  diff,
  onCopy,
  copied,
}: {
  diff: TextDiffResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const diffText = useMemo(() => {
    return diff.hunks
      .map(hunk => {
        return hunk.lines.map(line => {
          const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
          return `${prefix} ${line.content}`;
        }).join('\n');
      })
      .join('\n\n');
  }, [diff]);

  return (
    <div className="relative">
      <button
        onClick={() => onCopy(diffText)}
        className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors z-10"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div className="bg-gray-50 dark:bg-gray-900 rounded overflow-auto">
        {diff.hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx} className="mb-4 last:mb-0">
            <div className="bg-gray-200 dark:bg-gray-800 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 font-mono sticky top-0">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {hunk.lines.map((line, lineIdx) => (
              <div
                key={lineIdx}
                className={`px-3 py-0.5 font-mono text-sm ${
                  line.type === 'added'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : line.type === 'removed'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                <span className="inline-block w-8 text-right mr-4 text-gray-500 dark:text-gray-500 select-none">
                  {line.type === 'removed' ? line.oldLineNumber : line.newLineNumber}
                </span>
                <span
                  className={`inline-block w-4 mr-2 select-none ${
                    line.type === 'added'
                      ? 'text-green-600 dark:text-green-400'
                      : line.type === 'removed'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span className="whitespace-pre-wrap break-words">{line.content || ' '}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// JSON diff view component
function JsonDiffView({
  diff,
  onCopy,
  copied,
}: {
  diff: JsonDiffResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const diffText = useMemo(() => {
    return diff.changes
      .map(change => {
        const path = formatJsonPath(change.path);
        if (change.type === 'added') {
          return `+ ${path}: ${JSON.stringify(change.newValue)}`;
        } else if (change.type === 'removed') {
          return `- ${path}: ${JSON.stringify(change.oldValue)}`;
        } else {
          return `~ ${path}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`;
        }
      })
      .join('\n');
  }, [diff]);

  return (
    <div className="relative">
      <button
        onClick={() => onCopy(diffText)}
        className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors z-10"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Path</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Change</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Old Value</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">New Value</th>
            </tr>
          </thead>
          <tbody>
            {diff.changes.map((change, idx) => (
              <tr key={idx} className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-2 px-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {formatJsonPath(change.path)}
                </td>
                <td className="py-2 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      change.type === 'added'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : change.type === 'removed'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}
                  >
                    {change.type === 'added' ? 'Added' : change.type === 'removed' ? 'Removed' : 'Changed'}
                  </span>
                </td>
                <td className="py-2 px-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {change.oldValue !== undefined ? (
                    <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">
                      {JSON.stringify(change.oldValue)}
                    </code>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-2 px-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {change.newValue !== undefined ? (
                    <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">
                      {JSON.stringify(change.newValue)}
                    </code>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Hex diff view component
function HexDiffView({
  diff,
  onCopy,
  copied,
}: {
  diff: HexDiffResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const diffText = useMemo(() => {
    return diff.changes
      .map(change => {
        const offset = change.offset.toString(16).padStart(8, '0').toUpperCase();
        if (change.type === 'added') {
          return `+${offset}: ${formatHexByte(change.newByte)}`;
        } else if (change.type === 'removed') {
          return `-${offset}: ${formatHexByte(change.oldByte)}`;
        } else {
          return `~${offset}: ${formatHexByte(change.oldByte)} → ${formatHexByte(change.newByte)}`;
        }
      })
      .join('\n');
  }, [diff]);


  return (
    <div className="relative">
      <button
        onClick={() => onCopy(diffText)}
        className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors z-10"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Offset</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Change</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Old Byte</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">New Byte</th>
            </tr>
          </thead>
          <tbody>
            {diff.changes.slice(0, 100).map((change, idx) => (
              <tr key={idx} className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-1 px-2 text-xs text-gray-600 dark:text-gray-400">
                  0x{change.offset.toString(16).padStart(8, '0').toUpperCase()}
                </td>
                <td className="py-1 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      change.type === 'added'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : change.type === 'removed'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}
                  >
                    {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~'}
                  </span>
                </td>
                <td className="py-1 px-2 text-xs text-gray-600 dark:text-gray-400">
                  {formatHexByte(change.oldByte)}
                </td>
                <td className="py-1 px-2 text-xs text-gray-600 dark:text-gray-400">
                  {formatHexByte(change.newByte)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {diff.changes.length > 100 && (
          <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            Showing first 100 of {diff.changes.length} changes
          </div>
        )}
      </div>
    </div>
  );
}

// Metadata diff view component
function MetadataDiffView({
  diff,
  onCopy,
  copied,
}: {
  diff: MetadataDiffResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const diffText = useMemo(() => {
    if (!diff.hasChanges) return 'No metadata differences';
    return diff.differences
      .map(d => `${d.field}: ${JSON.stringify(d.oldValue)} → ${JSON.stringify(d.newValue)}`)
      .join('\n');
  }, [diff]);

  if (!diff.hasChanges) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">✓</div>
          <div>No metadata differences</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => onCopy(diffText)}
        className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors z-10"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Field</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Old Value</th>
              <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">New Value</th>
            </tr>
          </thead>
          <tbody>
            {diff.differences.map((difference, idx) => (
              <tr key={idx} className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{difference.field}</td>
                <td className="py-2 px-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                  <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {JSON.stringify(difference.oldValue)}
                  </code>
                </td>
                <td className="py-2 px-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                  <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {JSON.stringify(difference.newValue)}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
