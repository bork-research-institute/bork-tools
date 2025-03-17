'use client';

import type { UserRelationship } from '@/lib/services/relationships';
import * as d3 from 'd3';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D, {
  type GraphData,
  type GraphLink,
} from 'react-force-graph-2d';
import { Panel } from './Panel';

interface RelationshipsPanelProps {
  maxHeight?: string;
  relationships: UserRelationship[];
  loading: boolean;
}

interface UserNode {
  id: string;
  value: number;
  x?: number;
  y?: number;
  fontSize?: number;
  group?: number;
}

interface LinkObject extends GraphLink {
  source: string;
  target: string;
  value: number;
}

// Define a color scale for different groups
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

export function RelationshipsPanel({
  maxHeight,
  relationships,
  loading,
}: RelationshipsPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const graphRef = useRef<ForceGraph2D>(null);

  const initializeGraph = useCallback(() => {
    if (graphRef.current) {
      const graph = graphRef.current;

      // Stronger repulsion between nodes
      graph.d3Force('charge').strength(-100);

      // Longer distance between connected nodes
      graph.d3Force('link').distance(50);

      // Add collision force to prevent overlap with a fixed radius
      // @ts-ignore - d3Force exists but type is not properly defined
      graph.d3Force('collision', d3.forceCollide(50));

      // @ts-ignore - zoom exists but is not in types
      graph.zoom(0.5); // Start more zoomed out
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
  for (const rel of relationships) {
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

  // Calculate max mentions for scaling
  const maxMentions = Math.max(...topUsers.map(([, value]) => value));

  // Simple community detection based on strongest connections
  const groups = new Map<string, number>();
  let currentGroup = 0;

  // Sort relationships by mention count to process strongest connections first
  const sortedRelationships = [...relationships].sort(
    (a, b) => b.mention_count - a.mention_count,
  );

  for (const rel of sortedRelationships) {
    const source = rel.source_username;
    const target = rel.target_username;

    // Only process relationships between top users
    if (
      !topUsers.some(([id]) => id === source) ||
      !topUsers.some(([id]) => id === target)
    ) {
      continue;
    }

    // If neither user has a group, create a new one
    if (!groups.has(source) && !groups.has(target)) {
      groups.set(source, currentGroup);
      groups.set(target, currentGroup);
      currentGroup++;
    }
    // If one user has a group, add the other to it
    else if (!groups.has(source) && groups.has(target)) {
      const targetGroup = groups.get(target);
      if (targetGroup !== undefined) {
        groups.set(source, targetGroup);
      }
    } else if (groups.has(source) && !groups.has(target)) {
      const sourceGroup = groups.get(source);
      if (sourceGroup !== undefined) {
        groups.set(target, sourceGroup);
      }
    }
  }

  // Assign remaining users to their own groups
  for (const [id] of topUsers) {
    if (!groups.has(id)) {
      groups.set(id, currentGroup++);
    }
  }

  // Create nodes and links for the visualization
  const graphData: GraphData = {
    nodes: topUsers.map(([id, value]) => ({
      id,
      value,
      fontSize: 12 + Math.sqrt(value / maxMentions) * 24,
      group: groups.get(id) || 0,
    })),
    links: relationships
      .filter(
        (rel) =>
          topUsers.some(([id]) => id === rel.source_username) &&
          topUsers.some(([id]) => id === rel.target_username),
      )
      // Merge duplicate relationships between the same users
      .reduce((acc, rel) => {
        const existingLink = acc.find(
          (link) =>
            (link.source === rel.source_username &&
              link.target === rel.target_username) ||
            (link.source === rel.target_username &&
              link.target === rel.source_username),
        );

        if (existingLink) {
          // Add mention counts together
          existingLink.value += rel.mention_count;
        } else {
          // Create new link
          acc.push({
            source: rel.source_username,
            target: rel.target_username,
            value: rel.mention_count,
          });
        }
        return acc;
      }, [] as LinkObject[]),
  };

  if (loading) {
    return (
      <Panel maxHeight={maxHeight}>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel maxHeight={maxHeight}>
      <div ref={containerRef} className="h-[calc(100%-1rem)]">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          // @ts-ignore - nodeCanvasObject exists but type is not properly defined
          nodeCanvasObject={(node: UserNode, ctx: CanvasRenderingContext2D) => {
            const fontSize = node.fontSize || 12;
            ctx.font = `${fontSize}px Inter`;

            // Add a background to make text more readable
            const text = node.id.toLowerCase();
            const textWidth = ctx.measureText(text).width;
            const padding = 8;

            // Draw semi-transparent background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(
              (node.x || 0) - textWidth / 2 - padding,
              (node.y || 0) - fontSize / 2 - padding / 2,
              textWidth + padding * 2,
              fontSize + padding,
            );

            // Draw text with group color
            ctx.fillStyle = colorScale(node.group?.toString() || '0');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, node.x || 0, node.y || 0);
          }}
          linkColor={(link: GraphLink) => {
            // Handle both string and object source/target formats
            const sourceId =
              typeof link.source === 'string'
                ? link.source
                : (link.source as UserNode).id;
            const targetId =
              typeof link.target === 'string'
                ? link.target
                : (link.target as UserNode).id;

            const sourceNode = graphData.nodes.find((n) => n.id === sourceId);
            const targetNode = graphData.nodes.find((n) => n.id === targetId);

            // If either node is not found, return default color
            if (!sourceNode || !targetNode) {
              return '#10b98140';
            }

            // If both nodes are in the same group, use group color
            if (
              (sourceNode as UserNode).group === (targetNode as UserNode).group
            ) {
              return colorScale(
                ((sourceNode as UserNode).group || 0).toString(),
              );
            }

            return '#10b98140';
          }}
          linkWidth={(link: GraphLink) => {
            const linkObj = link as LinkObject;
            return Math.sqrt(linkObj.value || 1) * 0.5;
          }}
          width={dimensions.width}
          height={dimensions.height}
          cooldownTicks={100}
          warmupTicks={100}
        />
      </div>
    </Panel>
  );
}
