import * as Diff from 'diff';
import type { MessageRecord } from '../modules/tree/types';

// Text diff using unified diff format
export interface TextDiffResult {
  type: 'text';
  hunks: DiffHunk[];
  hasChanges: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function createTextDiff(oldText: string, newText: string): TextDiffResult {
  // Use a very large context value to show all lines
  const patch = Diff.structuredPatch('', '', oldText, newText, '', '', { context: 999999 });

  const hunks: DiffHunk[] = patch.hunks.map(hunk => {
    const lines: DiffLine[] = [];
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    hunk.lines.forEach(line => {
      const firstChar = line[0];
      const content = line.slice(1);

      if (firstChar === '+') {
        lines.push({
          type: 'added',
          content,
          newLineNumber: newLine++,
        });
      } else if (firstChar === '-') {
        lines.push({
          type: 'removed',
          content,
          oldLineNumber: oldLine++,
        });
      } else {
        lines.push({
          type: 'unchanged',
          content,
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    });

    return {
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart,
      newLines: hunk.newLines,
      lines,
    };
  });

  return {
    type: 'text',
    hunks,
    hasChanges: hunks.some(h => h.lines.some(l => l.type !== 'unchanged')),
  };
}

// JSON diff with deep comparison
export interface JsonDiffResult {
  type: 'json';
  changes: JsonChange[];
  hasChanges: boolean;
}

export interface JsonChange {
  path: string[];
  type: 'added' | 'removed' | 'changed';
  oldValue?: unknown;
  newValue?: unknown;
}

export function createJsonDiff(oldJson: unknown, newJson: unknown): JsonDiffResult {
  const changes: JsonChange[] = [];

  function compareValues(path: string[], oldVal: unknown, newVal: unknown) {
    // Handle null/undefined
    if (oldVal === newVal) return;

    if (oldVal === null || oldVal === undefined) {
      changes.push({ path, type: 'added', newValue: newVal });
      return;
    }

    if (newVal === null || newVal === undefined) {
      changes.push({ path, type: 'removed', oldValue: oldVal });
      return;
    }

    // Handle different types
    const oldType = typeof oldVal;
    const newType = typeof newVal;

    if (oldType !== newType || !isObject(oldVal) || !isObject(newVal)) {
      if (oldVal !== newVal) {
        changes.push({ path, type: 'changed', oldValue: oldVal, newValue: newVal });
      }
      return;
    }

    // Handle arrays
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const maxLen = Math.max(oldVal.length, newVal.length);
      for (let i = 0; i < maxLen; i++) {
        compareValues([...path, `[${i}]`], oldVal[i], newVal[i]);
      }
      return;
    }

    // Handle objects
    if (Array.isArray(oldVal) || Array.isArray(newVal)) {
      changes.push({ path, type: 'changed', oldValue: oldVal, newValue: newVal });
      return;
    }

    const oldObj = oldVal as Record<string, unknown>;
    const newObj = newVal as Record<string, unknown>;

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      compareValues([...path, key], oldObj[key], newObj[key]);
    }
  }

  compareValues([], oldJson, newJson);

  return {
    type: 'json',
    changes,
    hasChanges: changes.length > 0,
  };
}

function isObject(val: unknown): val is Record<string, unknown> | unknown[] {
  return val !== null && typeof val === 'object';
}

// Hex diff for byte-by-byte comparison
export interface HexDiffResult {
  type: 'hex';
  changes: HexChange[];
  hasChanges: boolean;
}

export interface HexChange {
  offset: number;
  oldByte?: number;
  newByte?: number;
  type: 'added' | 'removed' | 'changed';
}

export function createHexDiff(oldBytes: Uint8Array, newBytes: Uint8Array): HexDiffResult {
  const changes: HexChange[] = [];
  const maxLen = Math.max(oldBytes.length, newBytes.length);

  for (let i = 0; i < maxLen; i++) {
    const oldByte = i < oldBytes.length ? oldBytes[i] : undefined;
    const newByte = i < newBytes.length ? newBytes[i] : undefined;

    if (oldByte === undefined && newByte !== undefined) {
      changes.push({ offset: i, newByte, type: 'added' });
    } else if (oldByte !== undefined && newByte === undefined) {
      changes.push({ offset: i, oldByte, type: 'removed' });
    } else if (oldByte !== newByte) {
      changes.push({ offset: i, oldByte, newByte, type: 'changed' });
    }
  }

  return {
    type: 'hex',
    changes,
    hasChanges: changes.length > 0,
  };
}

// Metadata comparison
export interface MetadataDiffResult {
  type: 'metadata';
  differences: MetadataDifference[];
  hasChanges: boolean;
}

export interface MetadataDifference {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export function createMetadataDiff(
  oldMsg: MessageRecord,
  newMsg: MessageRecord
): MetadataDiffResult {
  const differences: MetadataDifference[] = [];

  // Compare QoS
  if (oldMsg.qos !== newMsg.qos) {
    differences.push({ field: 'QoS', oldValue: oldMsg.qos, newValue: newMsg.qos });
  }

  // Compare retained
  if (oldMsg.retained !== newMsg.retained) {
    differences.push({ field: 'Retained', oldValue: oldMsg.retained, newValue: newMsg.retained });
  }

  // Compare dup flag
  if (oldMsg.dup !== newMsg.dup) {
    differences.push({ field: 'Duplicate', oldValue: oldMsg.dup ?? false, newValue: newMsg.dup ?? false });
  }

  // Compare contentType
  if (oldMsg.contentType !== newMsg.contentType) {
    differences.push({
      field: 'Content Type',
      oldValue: oldMsg.contentType ?? 'none',
      newValue: newMsg.contentType ?? 'none',
    });
  }

  // Compare properties (MQTT v5)
  const oldProps = oldMsg.properties ?? {};
  const newProps = newMsg.properties ?? {};
  const allPropKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of allPropKeys) {
    const oldVal = oldProps[key];
    const newVal = newProps[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      differences.push({
        field: `Property: ${key}`,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return {
    type: 'metadata',
    differences,
    hasChanges: differences.length > 0,
  };
}

// Utility to format bytes as hex string
export function formatHexByte(byte: number | undefined): string {
  if (byte === undefined) return '--';
  return byte.toString(16).padStart(2, '0').toUpperCase();
}

// Utility to format path for display
export function formatJsonPath(path: string[]): string {
  if (path.length === 0) return '(root)';
  return path.join('.');
}
