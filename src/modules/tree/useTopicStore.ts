// Zustand store for topic tree and messages

import { create } from 'zustand';
import type { TopicNode, TopicNodeId, MessageRecord } from './types';

// Message batching configuration
const MAX_MESSAGES_STORED = 50000; // Global message cap

type TopicState = {
  nodes: Map<TopicNodeId, TopicNode>;
  messages: Map<string, MessageRecord>;
  messagesByTopic: Map<TopicNodeId, string[]>; // topic path -> message IDs (ordered newest first)
  expanded: Set<TopicNodeId>;
  upsertMessage: (msg: MessageRecord) => void;
  batchUpsertMessages: (msgs: MessageRecord[]) => void;
  toggleExpanded: (id: TopicNodeId) => void;
  clearAll: () => void;
  expandAll: () => void;
  collapseAll: () => void;
};

function ensurePath(nodes: Map<TopicNodeId, TopicNode>, topic: string): void {
  let path = '';
  const parts = topic.split('/');

  parts.forEach((seg, i) => {
    path = i === 0 ? seg : `${path}/${seg}`;

    if (!nodes.has(path)) {
      nodes.set(path, {
        id: path,
        name: seg,
        path,
        parentId: i ? parts.slice(0, i).join('/') : undefined,
        children: [],
        expanded: i < 2, // auto-expand first 2 levels
      });
    }

    const parentPath = i ? parts.slice(0, i).join('/') : '';
    if (parentPath) {
      const parent = nodes.get(parentPath)!;
      if (!parent.children.includes(path)) {
        parent.children.push(path);
        // Keep children sorted
        parent.children.sort();
      }
    }
  });
}

export const useTopicStore = create<TopicState>((set) => ({
  nodes: new Map(),
  messages: new Map(),
  messagesByTopic: new Map(),
  expanded: new Set(),

  toggleExpanded: (id) =>
    set((state) => {
      const expanded = new Set(state.expanded);
      if (expanded.has(id)) {
        expanded.delete(id);
      } else {
        expanded.add(id);
      }

      // Also update the node's expanded property
      const nodes = new Map(state.nodes);
      const node = nodes.get(id);
      if (node) {
        nodes.set(id, { ...node, expanded: !node.expanded });
      }

      return { expanded, nodes };
    }),

  upsertMessage: (msg) =>
    set((state) => {
      // Ensure nodes for path
      const nodes = new Map(state.nodes);
      ensurePath(nodes, msg.topic);

      // Store message
      const messages = new Map(state.messages);
      messages.set(msg.id, msg);

      // Track message history per topic
      const messagesByTopic = new Map(state.messagesByTopic);
      const topicHistory = messagesByTopic.get(msg.topic) || [];
      messagesByTopic.set(msg.topic, [msg.id, ...topicHistory]);

      // Apply message cap (LRU-like: remove oldest by ID if over limit)
      if (messages.size > MAX_MESSAGES_STORED) {
        const oldestId = messages.keys().next().value;
        if (oldestId) {
          messages.delete(oldestId);
          // Also remove from topic history
          messagesByTopic.forEach((history, topic) => {
            const filtered = history.filter(id => id !== oldestId);
            messagesByTopic.set(topic, filtered);
          });
        }
      }

      const leaf = nodes.get(msg.topic)!;
      leaf.lastPayloadId = msg.id;
      leaf.lastTimestamp = msg.ts;
      leaf.retained = msg.retained;
      leaf.qos = msg.qos;
      nodes.set(leaf.id, leaf);

      return { nodes, messages, messagesByTopic };
    }),

  batchUpsertMessages: (msgs) =>
    set((state) => {
      const nodes = new Map(state.nodes);
      const messages = new Map(state.messages);
      const messagesByTopic = new Map(state.messagesByTopic);

      // Process all messages in batch
      for (const msg of msgs) {
        ensurePath(nodes, msg.topic);
        messages.set(msg.id, msg);

        // Track message history per topic
        const topicHistory = messagesByTopic.get(msg.topic) || [];
        messagesByTopic.set(msg.topic, [msg.id, ...topicHistory]);

        const leaf = nodes.get(msg.topic)!;
        leaf.lastPayloadId = msg.id;
        leaf.lastTimestamp = msg.ts;
        leaf.retained = msg.retained;
        leaf.qos = msg.qos;
        nodes.set(leaf.id, leaf);
      }

      // Apply message cap
      if (messages.size > MAX_MESSAGES_STORED) {
        const entriesToDelete = messages.size - MAX_MESSAGES_STORED;
        const keys = Array.from(messages.keys());
        const deletedIds = new Set<string>();
        for (let i = 0; i < entriesToDelete; i++) {
          messages.delete(keys[i]);
          deletedIds.add(keys[i]);
        }
        // Remove from topic history
        messagesByTopic.forEach((history, topic) => {
          const filtered = history.filter(id => !deletedIds.has(id));
          messagesByTopic.set(topic, filtered);
        });
      }

      return { nodes, messages, messagesByTopic };
    }),

  clearAll: () =>
    set({
      nodes: new Map(),
      messages: new Map(),
      messagesByTopic: new Map(),
      expanded: new Set(),
    }),

  expandAll: () =>
    set((state) => {
      const expanded = new Set<TopicNodeId>();
      const nodes = new Map(state.nodes);

      nodes.forEach((node) => {
        if (node.children.length > 0) {
          expanded.add(node.id);
          nodes.set(node.id, { ...node, expanded: true });
        }
      });

      return { expanded, nodes };
    }),

  collapseAll: () =>
    set((state) => {
      const nodes = new Map(state.nodes);

      nodes.forEach((node) => {
        nodes.set(node.id, { ...node, expanded: false });
      });

      return { expanded: new Set(), nodes };
    }),
}));
