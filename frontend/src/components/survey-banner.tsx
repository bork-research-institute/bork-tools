'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function SurveyBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative w-full bg-emerald-500/10 border-b border-emerald-500/20 py-2">
      <div className="container flex items-center justify-center px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-white">
          <span className="font-medium">
            We're running a survey to improve Eggsight!
          </span>
          <Link
            href="/survey"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Share your feedback →
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss survey announcement"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
