import { mockUserRelationships } from '@/mocks/metricsData';
import * as d3 from 'd3';
import { Network } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Panel } from './Panel';

interface RelationshipsPanelProps {
  onClose: () => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  value: number;
  x?: number;
  y?: number;
}

interface Link {
  source: Node;
  target: Node;
  value: number;
}

export function RelationshipsPanel({ onClose }: RelationshipsPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

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
    const nodes: Node[] = topUsers.map(([id, value]) => ({ id, value }));
    const nodesMap = new Map(nodes.map((node) => [node.id, node]));

    const links: Link[] = mockUserRelationships
      .filter(
        (rel) =>
          nodesMap.has(rel.source_username) &&
          nodesMap.has(rel.target_username),
      )
      .map((rel) => {
        const source = nodesMap.get(rel.source_username);
        const target = nodesMap.get(rel.target_username);
        if (!source || !target) {
          throw new Error('Node not found in map');
        }
        return {
          source,
          target,
          value: rel.mention_count,
        };
      });

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up the SVG
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);

    // Create a container group for all elements that will be transformed
    const container = svg.append('g');

    // Add a background rect to capture zoom events
    container
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all');

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink<Node, Link>(links).distance(5))
      .force('charge', d3.forceManyBody().strength(-10))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<Node>().radius((d) => Math.sqrt(d.value) + 10),
      );

    // Create the links
    const link = container
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', (d) => Math.sqrt(d.value) / 2);

    // Create the nodes
    const node = container
      .append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .join('g')
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended),
      );

    // Add labels to nodes
    node
      .append('text')
      .text((d) => d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', '10px');

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Center the initial view
    const initialScale = 0.8;
    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(initialScale)
        .translate(-width / 2, -height / 2),
    );

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x || 0)
        .attr('y1', (d) => d.source.y || 0)
        .attr('x2', (d) => d.target.x || 0)
        .attr('y2', (d) => d.target.y || 0);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) {
        simulation.alphaTarget(0);
      }
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <Panel
      title="User Relationships"
      icon={<Network className="h-3.5 w-3.5" />}
      className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
      onClose={onClose}
    >
      <div className="h-[calc(100%-2rem)]">
        <svg ref={svgRef} width="100%" height="100%" className="cursor-move" />
      </div>
    </Panel>
  );
}
