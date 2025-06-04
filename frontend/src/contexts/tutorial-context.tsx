'use client';

import { track } from '@vercel/analytics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const TUTORIAL_STORAGE_KEY = 'eggsight-tutorial-completed';

interface TutorialContextType {
  isTutorialOpen: boolean;
  hasCompletedTutorial: boolean;
  startTutorial: () => void;
  closeTutorial: (wasSkipped?: boolean) => void;
  resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined,
);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true); // Default to true to prevent flash

  // Check if tutorial has been completed on mount
  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    setHasCompletedTutorial(completed === 'true');

    // Auto-start tutorial for new users after a short delay
    if (completed !== 'true') {
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = useCallback(() => {
    setIsTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback((wasSkipped = false) => {
    setIsTutorialOpen(false);
    // Mark as completed whether it was finished or skipped
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setHasCompletedTutorial(true);

    if (wasSkipped) {
      track('tutorial_skipped');
    } else {
      track('tutorial_completed');
    }
  }, []);

  const resetTutorial = useCallback(() => {
    // This function can be called to reset the tutorial state
    // Useful for testing or if users want to see the tutorial again
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setHasCompletedTutorial(false);
    setIsTutorialOpen(true);
  }, []);

  const value = {
    isTutorialOpen,
    hasCompletedTutorial,
    startTutorial,
    closeTutorial,
    resetTutorial,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
