'use client';

import { mockUserRelationships } from '@/mocks/metricsData';
import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D, { type GraphData } from 'react-force-graph-2d';
import { Panel } from './Panel';

interface RelationshipsPanelProps {
  maxHeight?: string;
}

interface UserNode {
  id: string;
  value: number;
  x?: number;
  y?: number;
}

export function RelationshipsPanel({ maxHeight }: RelationshipsPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const graphRef = useRef<ForceGraph2D>(null);

  const initializeGraph = useCallback(() => {
    if (graphRef.current) {
      const graph = graphRef.current;
      graph.d3Force('charge').strength(-150);
      graph.d3Force('link').distance(20);
      // @ts-ignore - zoom exists but is not in types
      graph.zoom(0.7); // Start more zoomed out
    }
  }, []);

  useEffect(() => {
    initializeGraph();
  }, [initializeGraph]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Process data to get unique users and their total mentions
  const userMentions = new Map<string, number>();
  for (const rel of mockUserRelationships) {
    userMentions.set(
      rel.source_username,
      (userMentions.get(rel.source_username) || 0) + rel.mention_count,
    );
    userMentions.set(
      rel.target_username,
      (userMentions.get(rel.target_username) || 0) + rel.mention_count,
    );
  }

  // Get top 25 users by total mentions
  const topUsers = Array.from(userMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);

  // Create nodes and links for the visualization
  const graphData: GraphData = {
    nodes: topUsers.map(([id, value]) => ({ id, value })),
    links: mockUserRelationships
      .filter(
        (rel) =>
          topUsers.some(([id]) => id === rel.source_username) &&
          topUsers.some(([id]) => id === rel.target_username),
      )
      .map((rel) => ({
        source: rel.source_username,
        target: rel.target_username,
        value: rel.mention_count,
      })),
  };

  return (
    <Panel maxHeight={maxHeight}>
      <div ref={containerRef} className="h-[calc(100%-1rem)]">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          // @ts-ignore - nodeCanvasObject exists but type is not properly defined
          nodeCanvasObject={(node: UserNode, ctx: CanvasRenderingContext2D) => {
            const fontSize = 12 + node.value / 50; // Scale font size based on mentions
            ctx.font = `${fontSize}px Inter`;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.id.toLowerCase(), node.x || 0, node.y || 0);
          }}
          linkColor={() => '#10b98140'}
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
    </Panel>
  );
}
