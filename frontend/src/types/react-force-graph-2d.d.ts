declare module 'react-force-graph-2d' {
  import { Component, type RefObject } from 'react';

  export interface GraphNode {
    id: string;
    value?: number;
    [key: string]: unknown;
  }

  export interface GraphLink {
    source: string;
    target: string;
    value?: number;
    [key: string]: unknown;
  }

  export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
  }

  export interface ForceGraphMethods {
    d3Force: (forceName: string) => {
      strength: (strength: number) => void;
      distance: (distance: number) => void;
    };
  }

  export interface ForceGraphProps {
    graphData: GraphData;
    nodeColor?: string | ((node: GraphNode) => string);
    linkColor?: string | ((link: GraphLink) => string);
    nodeLabel?: string | ((node: GraphNode) => string);
    width?: number;
    height?: number;
    ref?: RefObject<ForceGraph2D>;
  }

  declare class ForceGraph2D extends Component<ForceGraphProps> {
    d3Force(forceName: string): {
      strength: (strength: number) => void;
      distance: (distance: number) => void;
    };
  }

  export default ForceGraph2D;
}
