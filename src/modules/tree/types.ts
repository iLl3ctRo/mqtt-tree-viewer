// Topic tree and message types

export type TopicNodeId = string; // stable path key e.g. sensors/room1/temp

export type TopicNode = {
  id: TopicNodeId;
  name: string; // segment name
  path: string; // full topic path till this node
  parentId?: TopicNodeId;
  children: TopicNodeId[];
  expanded: boolean;
  // Message metadata
  lastPayloadId?: string;
  lastTimestamp?: number;
  retained?: boolean;
  qos?: 0 | 1 | 2;
  hasChildrenPlaceholder?: boolean; // for lazy UI expansion
  highlightedUntil?: number; // timestamp when highlight should end
};

export type MessageRecord = {
  id: string; // uuid
  topic: string;
  ts: number;
  // raw bytes & decoded previews
  payload: Uint8Array;
  payloadText?: string; // utf-8 try
  payloadJson?: unknown; // parsed if valid
  contentType?: string; // v5 property (User Properties or Content Type)
  properties?: Record<string, unknown>; // all v5 props
  retained: boolean;
  qos: 0 | 1 | 2;
  dup?: boolean;
};

export type FlattenedTreeItem = {
  id: TopicNodeId;
  depth: number;
};
