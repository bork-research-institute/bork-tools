import { GripVertical, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  headerContent?: React.ReactNode;
  onClose?: () => void;
}

export const Panel = ({
  title,
  children,
  className = '',
  icon,
  headerContent,
  onClose,
}: PanelProps) => (
  <Card className={`bg-[#0f1729] border-0 flex flex-col h-full ${className}`}>
    <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 flex-shrink-0">
      <div className="flex items-center gap-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <CardTitle className="text-white text-base font-medium">
          {title}
        </CardTitle>
      </div>
      <div className="flex gap-1 items-center">
        {headerContent}
        <div className="drag-handle cursor-move p-1 hover:bg-white/10 rounded">
          <GripVertical className="h-3.5 w-3.5 text-gray-400" />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        )}
      </div>
    </CardHeader>
    <CardContent className="p-3 pt-2 flex-grow overflow-auto min-h-0">
      {children}
    </CardContent>
  </Card>
);
