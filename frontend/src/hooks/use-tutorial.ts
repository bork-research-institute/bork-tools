'use client';

import { useCallback, useEffect, useState } from 'react';

const TUTORIAL_STORAGE_KEY = 'eggsight-tutorial-completed';

export function useTutorial() {
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

    // Optional: Log analytics about tutorial completion
    if (wasSkipped) {
      console.log('Tutorial was skipped by user');
    } else {
      console.log('Tutorial was completed by user');
    }
  }, []);

  const resetTutorial = useCallback(() => {
    // This function can be called to reset the tutorial state
    // Useful for testing or if users want to see the tutorial again
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setHasCompletedTutorial(false);
    setIsTutorialOpen(true);
  }, []);

  return {
    isTutorialOpen,
    hasCompletedTutorial,
    startTutorial,
    closeTutorial,
    resetTutorial,
  };
}
