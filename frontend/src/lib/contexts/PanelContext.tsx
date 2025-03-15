'use client';

import {
  type PanelId,
  defaultLayout,
  panelConfigs,
} from '@/lib/config/metrics';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import type { Layout } from 'react-grid-layout';

interface PanelContextType {
  visiblePanels: Set<PanelId>;
  layout: Layout[];
  handleAddPanel: (panelId: PanelId) => void;
  handleRemovePanel: (panelId: PanelId) => void;
  handleLayoutChange: (newLayout: Layout[]) => void;
}

const PanelContext = createContext<PanelContextType | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<Layout[]>(defaultLayout);
  const [visiblePanels, setVisiblePanels] = useState<Set<PanelId>>(
    new Set(Object.keys(panelConfigs) as PanelId[]),
  );

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    // Ensure each layout item has the required properties
    const validLayout = newLayout.map((item) => ({
      ...item,
      minH: 2,
      maxH: 4,
      i: item.i,
      x: Math.max(0, item.x), // Ensure x is not negative
      y: Math.max(0, item.y), // Ensure y is not negative
      w: Math.max(1, item.w), // Ensure width is at least 1
      h: Math.max(2, item.h), // Ensure height is at least 2
    }));
    setLayout(validLayout);
  }, []);

  const handleRemovePanel = useCallback((panelId: PanelId) => {
    setVisiblePanels((prev) => {
      const next = new Set(prev);
      next.delete(panelId);
      return next;
    });

    setLayout((prev) => {
      // Remove the panel
      const filteredLayout = prev.filter((item) => item.i !== panelId);

      // Sort by y position to maintain order
      const sortedLayout = [...filteredLayout].sort((a, b) => a.y - b.y);

      // Compact vertically
      return sortedLayout.map((item, index) => {
        const itemsAbove = sortedLayout.slice(0, index);
        const maxY = itemsAbove
          .filter((above) => above.x === item.x)
          .reduce((max, above) => Math.max(max, above.y + above.h), 0);

        return {
          ...item,
          y: maxY,
        };
      });
    });
  }, []);

  const handleAddPanel = useCallback(
    (panelId: PanelId) => {
      if (visiblePanels.has(panelId)) {
        return;
      }

      setVisiblePanels((prev) => {
        const next = new Set(prev);
        next.add(panelId);
        return next;
      });

      const config = panelConfigs[panelId];

      setLayout((prev) => {
        // Find the first empty column
        const usedColumns = new Set(prev.map((item) => item.x));
        let x = 0;
        while (usedColumns.has(x) && x < 4) {
          x++;
        }

        return [
          ...prev,
          {
            i: panelId,
            x: Math.min(x, 3), // Ensure we don't exceed grid width
            y: 0,
            w: Math.min(config.w, 4 - x), // Adjust width if near grid edge
            h: config.h,
            minH: 2,
            maxH: 4,
          },
        ];
      });
    },
    [visiblePanels],
  );

  return (
    <PanelContext.Provider
      value={{
        visiblePanels,
        layout,
        handleAddPanel,
        handleRemovePanel,
        handleLayoutChange,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function usePanels() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanels must be used within a PanelProvider');
  }
  return context;
}
