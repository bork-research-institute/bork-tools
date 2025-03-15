import { ExternalLink, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const Panel = ({
  title,
  children,
  className = '',
  icon,
}: PanelProps) => (
  <Card className={`bg-[#0f1729] border-0 ${className}`}>
    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 drag-handle cursor-move">
      <div className="flex items-center gap-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <CardTitle className="text-white text-lg font-medium">
          {title}
        </CardTitle>
      </div>
      <div className="flex gap-1">
        <button type="button" className="p-1 hover:bg-white/10 rounded">
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </button>
        <button type="button" className="p-1 hover:bg-white/10 rounded">
          <Link2 className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-2">{children}</CardContent>
  </Card>
);
