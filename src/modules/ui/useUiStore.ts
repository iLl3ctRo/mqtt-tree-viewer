// Zustand store for UI state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TopicNodeId } from '../tree/types';

type UiState = {
  // Selection
  selectedNodeId: TopicNodeId | null;
  selectedMessageId: string | null;

  // Search/filter
  searchQuery: string;
  filterRetainedOnly: boolean;
  filterChangedInMinutes: number | null;

  // UI controls
  isPaused: boolean;
  showPropertiesPanel: boolean;

  // Preferences (persisted)
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';

  // Actions
  setSelectedNodeId: (id: TopicNodeId | null) => void;
  setSelectedMessageId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterRetainedOnly: (value: boolean) => void;
  setFilterChangedInMinutes: (minutes: number | null) => void;
  togglePause: () => void;
  togglePropertiesPanel: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Selection
      selectedNodeId: null,
      selectedMessageId: null,

      // Search/filter
      searchQuery: '',
      filterRetainedOnly: false,
      filterChangedInMinutes: null,

      // UI controls
      isPaused: false,
      showPropertiesPanel: true,

      // Preferences
      theme: 'system',
      fontSize: 'medium',

      // Actions
      setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedMessageId: null }),
      setSelectedMessageId: (id) => set({ selectedMessageId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterRetainedOnly: (value) => set({ filterRetainedOnly: value }),
      setFilterChangedInMinutes: (minutes) => set({ filterChangedInMinutes: minutes }),
      togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
      togglePropertiesPanel: () => set((state) => ({ showPropertiesPanel: !state.showPropertiesPanel })),
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: 'mqtt-ui-preferences',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        showPropertiesPanel: state.showPropertiesPanel,
      }),
    }
  )
);
