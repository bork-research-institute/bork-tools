'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { Panel } from './Panel';

interface TokenHolderPanelProps {
  maxHeight?: string;
}

interface TokenHolder extends d3.SimulationNodeDatum {
  address: string;
  tokens: number;
  connections: string[];
}

interface TokenLink extends d3.SimulationLinkDatum<TokenHolder> {
  source: string | TokenHolder;
  target: string | TokenHolder;
}

const mockNetworkData: TokenHolder[] = [
  {
    address: '0x1234...5678',
    tokens: 1000000,
    connections: ['0x2345...6789', '0x3456...7890'],
  },
  {
    address: '0x2345...6789',
    tokens: 750000,
    connections: ['0x1234...5678', '0x4567...8901'],
  },
  {
    address: '0x3456...7890',
    tokens: 500000,
    connections: ['0x1234...5678'],
  },
  {
    address: '0x4567...8901',
    tokens: 250000,
    connections: ['0x2345...6789', '0x7890...1234'],
  },
  { address: '0x5678...9012', tokens: 150000, connections: [] },
  { address: '0x6789...0123', tokens: 100000, connections: [] },
  {
    address: '0x7890...1234',
    tokens: 800000,
    connections: ['0x4567...8901', '0x8901...2345'],
  },
  {
    address: '0x8901...2345',
    tokens: 450000,
    connections: ['0x7890...1234'],
  },
  {
    address: '0x9012...3456',
    tokens: 600000,
    connections: ['0xabcd...ef01'],
  },
  {
    address: '0xabcd...ef01',
    tokens: 300000,
    connections: ['0x9012...3456'],
  },
  { address: '0xbcde...f012', tokens: 950000, connections: [] },
  { address: '0xcdef...0123', tokens: 550000, connections: [] },
  {
    address: '0xdef0...1234',
    tokens: 200000,
    connections: ['0xef01...2345'],
  },
  {
    address: '0xef01...2345',
    tokens: 700000,
    connections: ['0xdef0...1234', '0xf012...3456'],
  },
  {
    address: '0xf012...3456',
    tokens: 400000,
    connections: ['0xef01...2345'],
  },
];

export function TokenHolderPanel({ maxHeight }: TokenHolderPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) {
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight - 40;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    // Create container for all elements
    const container = svg.append('g');

    // Add background rect to catch zoom events
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .call(
        zoom as unknown as (
          selection: d3.Selection<SVGRectElement, unknown, null, undefined>,
        ) => void,
      );

    // Set initial zoom level
    svg.call(
      zoom.transform,
      d3.zoomIdentity.scale(0.3).translate(width / 2, height / 2),
    );

    // Create links data
    const links: TokenLink[] = mockNetworkData.flatMap((holder) =>
      holder.connections.map((target) => ({
        source: holder.address,
        target,
      })),
    );

    // Create a set of connected addresses
    const connectedAddresses = new Set<string>();
    for (const link of links) {
      connectedAddresses.add(link.source as string);
      connectedAddresses.add(link.target as string);
    }

    // Create force simulation
    const simulation = d3
      .forceSimulation<TokenHolder>(mockNetworkData)
      .force(
        'link',
        d3
          .forceLink<TokenHolder, TokenLink>(links)
          .id((d) => d.address)
          .distance(10),
      )
      .force('charge', d3.forceManyBody<TokenHolder>().strength(-30))
      .force('center', d3.forceCenter<TokenHolder>(width / 2, height / 2))
      .force(
        'collision',
        d3
          .forceCollide<TokenHolder>()
          .radius((d) => getBubbleSize(d.tokens) / 2 + 1),
      );

    // Draw links
    const link = container
      .append('g')
      .selectAll<SVGLineElement, TokenLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#ffffff20')
      .attr('stroke-width', 1);

    // Create node group
    const node = container
      .append('g')
      .selectAll<SVGGElement, TokenHolder>('g')
      .data(mockNetworkData)
      .join('g')
      .call(
        d3
          .drag<SVGGElement, TokenHolder>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
          .filter((event) => !event.ctrlKey && !event.button),
      );

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', (d) => getBubbleSize(d.tokens) / 2)
      .attr('fill', (d) =>
        connectedAddresses.has(d.address) ? '#8b5cf680' : 'transparent',
      )
      .attr('stroke', (d) =>
        connectedAddresses.has(d.address) ? '#8b5cf6' : '#4b556380',
      )
      .attr('stroke-width', (d) => (connectedAddresses.has(d.address) ? 2 : 1));

    // Add text to nodes
    node
      .append('text')
      .text((d) => d.address)
      .attr('text-anchor', 'middle')
      .attr('dy', '-1em')
      .attr('fill', (d) =>
        connectedAddresses.has(d.address) ? 'white' : '#9ca3af',
      )
      .style('font-size', '12px');

    node
      .append('text')
      .text((d) => formatTokens(d.tokens))
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('fill', '#94a3b8')
      .style('font-size', '12px');

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as TokenHolder).x || 0)
        .attr('y1', (d) => (d.source as TokenHolder).y || 0)
        .attr('x2', (d) => (d.target as TokenHolder).x || 0)
        .attr('y2', (d) => (d.target as TokenHolder).y || 0);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    function dragstarted(
      event: d3.D3DragEvent<SVGGElement, TokenHolder, TokenHolder>,
    ) {
      if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGGElement, TokenHolder, TokenHolder>,
    ) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<SVGGElement, TokenHolder, TokenHolder>,
    ) {
      if (!event.active) {
        simulation.alphaTarget(0);
      }
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, []);

  const getBubbleSize = (tokens: number) => {
    return Math.max(40, Math.min(100, 40 + Math.log10(tokens) * 10));
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <Panel maxHeight={maxHeight}>
      <div ref={containerRef} className="relative h-[calc(100%-2rem)] p-4">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </Panel>
  );
}
