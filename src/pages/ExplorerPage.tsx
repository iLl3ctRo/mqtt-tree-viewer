// Main explorer page with tree and payload panels

import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TreeView } from '../modules/tree/TreeView';
import { PayloadPanel } from '../modules/payload/PayloadPanel';
import { PropertiesPanel } from '../modules/payload/PropertiesPanel';
import { MessageHistoryPanel } from '../modules/payload/MessageHistoryPanel';
import { Button } from '../modules/ui/Button';
import { Input } from '../modules/ui/Input';
import { useConnectionStore } from '../modules/mqtt/useConnectionStore';
import { useTopicStore } from '../modules/tree/useTopicStore';
import { useUiStore } from '../modules/ui/useUiStore';
import { useMqttClient } from '../modules/mqtt/useMqttClient';
import type { MessageRecord } from '../modules/tree/types';

export function ExplorerPage() {
  const navigate = useNavigate();
  const { disconnect } = useMqttClient();
  const status = useConnectionStore((s) => s.status);
  const activeProfile = useConnectionStore((s) => s.activeProfile);
  const messagesReceived = useConnectionStore((s) => s.messagesReceived);

  const nodes = useTopicStore((s) => s.nodes);
  const messages = useTopicStore((s) => s.messages);
  const messagesByTopic = useTopicStore((s) => s.messagesByTopic);
  const clearAll = useTopicStore((s) => s.clearAll);
  const expandAll = useTopicStore((s) => s.expandAll);
  const collapseAll = useTopicStore((s) => s.collapseAll);

  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const selectedMessageId = useUiStore((s) => s.selectedMessageId);
  const setSelectedMessageId = useUiStore((s) => s.setSelectedMessageId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const isPaused = useUiStore((s) => s.isPaused);
  const togglePause = useUiStore((s) => s.togglePause);
  const showPropertiesPanel = useUiStore((s) => s.showPropertiesPanel);
  const togglePropertiesPanel = useUiStore((s) => s.togglePropertiesPanel);

  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [treeSize, setTreeSize] = useState({ width: 400, height: 600 });

  // Redirect if not connected
  useEffect(() => {
    if (status === 'disconnected') {
      navigate('/');
    }
  }, [status, navigate]);

  // Update tree size on resize
  useEffect(() => {
    const updateSize = () => {
      if (treeContainerRef.current) {
        const { width, height } = treeContainerRef.current.getBoundingClientRect();
        setTreeSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Get message history for selected topic
  const topicMessages = useMemo(() => {
    if (!selectedNodeId) return [];
    const messageIds = messagesByTopic.get(selectedNodeId) || [];
    return messageIds.map(id => messages.get(id)).filter((m): m is MessageRecord => m !== undefined);
  }, [selectedNodeId, messagesByTopic, messages]);

  // Auto-select first message when topic changes
  useEffect(() => {
    if (topicMessages.length > 0 && !selectedMessageId) {
      setSelectedMessageId(topicMessages[0].id);
    }
  }, [topicMessages, selectedMessageId, setSelectedMessageId]);

  // Get the selected message
  const selectedMessage = selectedMessageId ? messages.get(selectedMessageId) || null : null;

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    reconnecting: 'bg-orange-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  }[status];

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">MQTT Explorer</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{status}</span>
            </div>
            {activeProfile && (
              <span className="text-sm text-gray-500 dark:text-gray-400">• {activeProfile.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{messagesReceived} messages</span>
            <Button variant="secondary" size="sm" onClick={togglePause}>
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Tree */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-3 space-y-2 border-b border-gray-200 dark:border-gray-700">
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>
          <div ref={treeContainerRef} className="flex-1 overflow-hidden">
            <TreeView height={treeSize.height} />
          </div>
        </div>

        {/* Right panel - Message history and details */}
        <div className="flex-1 flex flex-col">
          {selectedNodeId ? (
            <>
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-white dark:bg-gray-800 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {selectedNodeId}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {topicMessages.length} {topicMessages.length === 1 ? 'message' : 'messages'}
                  </p>
                </div>
                {selectedMessage && (
                  <Button variant="ghost" size="sm" onClick={togglePropertiesPanel}>
                    {showPropertiesPanel ? 'Hide' : 'Show'} Properties
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-hidden flex">
                {/* Left: Message history */}
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
                  <MessageHistoryPanel
                    messages={topicMessages}
                    selectedMessageId={selectedMessageId}
                    onSelectMessage={setSelectedMessageId}
                  />
                </div>
                {/* Right: Message details */}
                <div className="flex-1 flex flex-col">
                  {selectedMessage ? (
                    <>
                      <div className={showPropertiesPanel ? 'h-1/2' : 'h-full'}>
                        <PayloadPanel message={selectedMessage} />
                      </div>
                      {showPropertiesPanel && (
                        <div className="h-1/2 border-t border-gray-200 dark:border-gray-700 overflow-auto bg-white dark:bg-gray-800">
                          <PropertiesPanel message={selectedMessage} />
                        </div>
                      )}
                    </>
                  ) : topicMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <p>No messages received on this topic</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Select a topic to view its messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
