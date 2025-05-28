'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBackendStatus } from '@/hooks/use-backend-status';
import { cn } from '@/lib/utils';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';

export function BackendStatus() {
  const { data, isLoading, isError, error } = useBackendStatus();

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        status: 'loading',
        color: 'bg-yellow-500',
        icon: Activity,
        text: 'Checking...',
        detail: 'Checking backend status...',
      };
    }

    if (isError || !data) {
      return {
        status: 'offline',
        color: 'bg-red-500',
        icon: AlertCircle,
        text: 'Agent Offline',
        detail: error?.message || 'Backend is not responding',
      };
    }

    return {
      status: 'online',
      color: 'bg-green-500',
      icon: CheckCircle,
      text: 'Agent Online',
      detail: `Uptime: ${Math.floor(data.uptime / 60)}m ${Math.floor(data.uptime % 60)}s | v${data.version}`,
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <div className="flex items-center space-x-2 px-2 py-1">
            {/* Blinking dot indicator */}
            <div className="relative">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  statusInfo.color,
                  statusInfo.status === 'online' && 'animate-pulse',
                  statusInfo.status === 'loading' && 'animate-bounce',
                )}
              />
              {statusInfo.status === 'online' && (
                <div
                  className={cn(
                    'absolute inset-0 w-2 h-2 rounded-full animate-ping',
                    statusInfo.color,
                    'opacity-75',
                  )}
                />
              )}
            </div>

            {/* Status icon and text */}
            <div className="flex items-center space-x-1">
              <StatusIcon className="h-3 w-3 text-white/80" />
              <span className="text-xs text-white/80 font-medium">
                {statusInfo.text}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="center"
          className="bg-black text-white border border-white/10"
        >
          <div className="text-xs">
            <div className="font-medium mb-1">Backend Status</div>
            <div className="text-white/80">{statusInfo.detail}</div>
            {data && (
              <div className="text-white/60 mt-1">
                Last updated: {new Date(data.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
