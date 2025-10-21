// Main explorer page with tree and payload panels

import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TreeViewArborist } from '../modules/tree/TreeViewArborist';
import { PayloadPanel } from '../modules/payload/PayloadPanel';
import { PropertiesPanel } from '../modules/payload/PropertiesPanel';
import { MessageHistoryPanel } from '../modules/payload/MessageHistoryPanel';
import { Button } from '../modules/ui/Button';
import { Input } from '../modules/ui/Input';
import { LanguageSwitcher } from '../modules/ui/LanguageSwitcher';
import { useConnectionStore } from '../modules/mqtt/useConnectionStore';
import { useTopicStore } from '../modules/tree/useTopicStore';
import { useUiStore } from '../modules/ui/useUiStore';
import { useMqttClient } from '../modules/mqtt/useMqttClient';
import type { MessageRecord } from '../modules/tree/types';

export function ExplorerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { disconnect } = useMqttClient();
  const status = useConnectionStore((s) => s.status);
  const activeProfile = useConnectionStore((s) => s.activeProfile);
  const messagesReceived = useConnectionStore((s) => s.messagesReceived);

  const messages = useTopicStore((s) => s.messages);
  const messagesByTopic = useTopicStore((s) => s.messagesByTopic);
  const clearAll = useTopicStore((s) => s.clearAll);
  const expandAll = useTopicStore((s) => s.expandAll);
  const collapseAll = useTopicStore((s) => s.collapseAll);

  const resetStats = useConnectionStore((s) => s.resetStats);

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
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [compareMessageId, setCompareMessageId] = useState<string | null>(null);

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

  // Clear comparison when switching topics
  useEffect(() => {
    setCompareMessageId(null);
  }, [selectedNodeId]);

  // Get the selected message
  const selectedMessage = selectedMessageId ? messages.get(selectedMessageId) || null : null;

  // Get the compare message (for diff mode)
  // If user has manually selected a message to compare, use that
  // Otherwise, if there are 2+ messages and we're viewing the newest, auto-compare with second-newest
  const compareMessage = useMemo(() => {
    if (compareMessageId) {
      return messages.get(compareMessageId) || null;
    }
    // Auto-enable diff mode when viewing newest message and there are 2+ messages
    if (topicMessages.length >= 2 && selectedMessageId === topicMessages[0].id) {
      return topicMessages[1]; // Second-newest message
    }
    return null;
  }, [compareMessageId, messages, topicMessages, selectedMessageId]);

  // Handle comparison toggle
  const handleCompareMessage = (messageId: string | null) => {
    setCompareMessageId(messageId);
  };

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('explorer.title')}</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{t(`status.${status}`)}</span>
            </div>
            {activeProfile && (
              <span className="text-sm text-gray-500 dark:text-gray-400">• {activeProfile.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {messagesReceived} {messagesReceived === 1 ? t('explorer.message') : t('explorer.messages')}
            </span>
            <LanguageSwitcher />
            <Button variant="secondary" size="sm" onClick={togglePause}>
              {isPaused ? t('explorer.resume') : t('explorer.pause')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              {t('explorer.disconnect')}
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
              placeholder={t('explorer.searchTopics')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                {t('explorer.expandAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                {t('explorer.collapseAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { clearAll(); resetStats(); }}>
                {t('explorer.clear')}
              </Button>
            </div>
          </div>
          <div ref={treeContainerRef} className="flex-1 overflow-hidden">
            <TreeViewArborist height={treeSize.height} width={treeSize.width} />
          </div>
        </div>

        {/* Right panel - Message details and history */}
        <div className="flex-1 flex flex-col">
          {selectedNodeId ? (
            <>
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-white dark:bg-gray-800 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {selectedNodeId}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {topicMessages.length} {topicMessages.length === 1 ? t('explorer.message') : t('explorer.messages')}
                  </p>
                </div>
                {selectedMessage && (
                  <Button variant="ghost" size="sm" onClick={togglePropertiesPanel}>
                    {showPropertiesPanel ? t('explorer.hideProperties') : t('explorer.showProperties')}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Message details section */}
                <div className={`${isHistoryCollapsed ? 'flex-1' : 'h-1/2'} flex flex-col border-b border-gray-200 dark:border-gray-700`}>
                  {selectedMessage ? (
                    <>
                      <div className={showPropertiesPanel ? 'h-1/2' : 'h-full'}>
                        <PayloadPanel
                          message={selectedMessage}
                          compareWithMessage={compareMessage || undefined}
                        />
                      </div>
                      {showPropertiesPanel && (
                        <div className="h-1/2 border-t border-gray-200 dark:border-gray-700 overflow-auto bg-white dark:bg-gray-800">
                          <PropertiesPanel message={selectedMessage} />
                        </div>
                      )}
                    </>
                  ) : topicMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <p>{t('explorer.noMessages')}</p>
                    </div>
                  ) : null}
                </div>
                {/* Message history section */}
                <div className={`${isHistoryCollapsed ? 'h-auto' : 'h-1/2'} flex flex-col`}>
                  <div
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t('explorer.messageHistory')}
                    </h3>
                    <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                      {isHistoryCollapsed ? '▲' : '▼'}
                    </button>
                  </div>
                  {!isHistoryCollapsed && (
                    <div className="flex-1 overflow-hidden">
                      <MessageHistoryPanel
                        messages={topicMessages}
                        selectedMessageId={selectedMessageId}
                        onSelectMessage={setSelectedMessageId}
                        compareMessageId={compareMessageId}
                        onCompareMessage={handleCompareMessage}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>{t('explorer.selectTopic')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
