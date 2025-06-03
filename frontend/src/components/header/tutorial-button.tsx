'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTutorial } from '@/contexts/tutorial-context';
import { HelpCircle } from 'lucide-react';

export function TutorialButton() {
  const { startTutorial } = useTutorial();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-white/60 hover:text-white/90 transition-colors"
            onClick={startTutorial}
            aria-label="Start tutorial"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="center"
          className="bg-black text-white border border-white/10"
        >
          <div className="text-xs">
            <div className="font-medium">Tutorial</div>
            <div className="text-white/80">Learn how to use Eggsight</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
