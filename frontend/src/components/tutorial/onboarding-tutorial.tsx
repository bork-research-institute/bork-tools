'use client';

import { useTutorial } from '@/contexts/tutorial-context';
import { useEffect, useState } from 'react';
import Joyride, { type CallBackProps, STATUS, type Step } from 'react-joyride';

export function OnboardingTutorial() {
  const { isTutorialOpen, closeTutorial } = useTutorial();
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">
            Welcome to Eggsight! 🥚
          </h3>
          <p className="text-sm text-white/80">
            Your AI-powered crypto intelligence platform. Let's explore the key
            features that will help you stay ahead of market trends and social
            sentiment.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      // This is because the skip button is not working on the first step, known issue:
      // https://github.com/gilbarbara/react-joyride/issues/1121
      showSkipButton: false,
    },
    {
      target: '[data-tutorial="agent-status"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Agent Status 🤖</h3>
          <p className="text-sm text-white/80">
            This indicator shows if our AI agent is online and actively
            monitoring the crypto ecosystem. When green, you're getting
            real-time insights!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="market-section"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">
            Market Intelligence 📈
          </h3>
          <p className="text-sm text-white/80">
            This is your main dashboard for token analysis. Here you'll find
            trending tokens, market data, and social sentiment metrics all in
            one place.
          </p>
        </div>
      ),
      placement: 'right-start',
    },
    {
      target: '[data-tutorial="market-tabs"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Market Views 🔍</h3>
          <div className="text-sm text-white/80 space-y-2">
            <p>
              <strong>Trending:</strong> Hottest tokens by social activity
            </p>
            <p>
              <strong>Launched:</strong> Recently launched tokens
            </p>
            <p>
              <strong>Mindshare:</strong> Social sentiment analysis
            </p>
            <p>
              <strong>Yaps:</strong> Top crypto influencers
            </p>
            <p>
              <strong>Links:</strong> Network relationships
            </p>
          </div>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tutorial="token-list"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">
            Token Rankings 🏆
          </h3>
          <p className="text-sm text-white/80">
            Click on any token to dive deeper into its social metrics and tweet
            analysis. The scores help you identify tokens with strong community
            engagement.
          </p>
        </div>
      ),
      placement: 'right-start',
    },
    {
      target: '[data-tutorial="tweets-section"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">
            Social Intelligence 🐦
          </h3>
          <p className="text-sm text-white/80">
            Monitor trending tweets and news that could impact token prices. Our
            AI analyzes social sentiment to give you an edge in timing your
            trades.
          </p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '[data-tutorial="tweets-tabs"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">
            Content Streams 📰
          </h3>
          <div className="text-sm text-white/80 space-y-2">
            <p>
              <strong>Trending:</strong> Most engaging crypto tweets
            </p>
            <p>
              <strong>News:</strong> Latest crypto news and updates
            </p>
            <p>
              <strong>Token:</strong> Specific tweets about selected tokens
            </p>
          </div>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tutorial="maximize-button"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Maximize View 🔍</h3>
          <p className="text-sm text-white/80">
            Click these maximize buttons to get a full-screen view of any panel.
            Perfect for detailed analysis or when you need more screen real
            estate.
          </p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">You're Ready! 🚀</h3>
          <p className="text-sm text-white/80">
            That's it! You now know how to navigate Eggsight. Start exploring
            tokens, monitor social sentiment, and use our AI insights to make
            informed trading decisions.
          </p>
          <p className="text-xs text-white/60 mt-2">
            Tip: Keep an eye on the agent status - it ensures you're always
            getting the latest data!
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      const wasSkipped = status === STATUS.SKIPPED;
      setStepIndex(0);
      closeTutorial(wasSkipped);
    } else if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  // Reset step index when tutorial opens
  useEffect(() => {
    if (isTutorialOpen) {
      setStepIndex(0);
    }
  }, [isTutorialOpen]);

  return (
    <Joyride
      steps={steps}
      run={isTutorialOpen}
      stepIndex={stepIndex}
      continuous={true}
      showProgress={true}
      disableCloseOnEsc={true}
      hideCloseButton={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981', // emerald-500
          backgroundColor: '#020617', // slate-950
          textColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.8)',
          spotlightShadow: '0 0 15px rgba(16, 185, 129, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          backgroundColor: '#020617',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        },
        tooltipContent: {
          padding: '16px 20px',
        },
        buttonNext: {
          backgroundColor: '#10b981',
          color: '#ffffff',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer',
        },
        buttonBack: {
          color: '#ffffff',
          marginRight: 10,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: 'transparent',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '14px',
          cursor: 'pointer',
        },
        buttonSkip: {
          color: '#ffffff',
          backgroundColor: 'transparent',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
          opacity: 0.7,
        },
        buttonClose: {
          color: '#ffffff',
          backgroundColor: 'transparent',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          position: 'absolute',
          right: 8,
          top: 8,
        },
      }}
      locale={{
        back: 'Back',
        close: '×',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      //   floaterProps={{
      //     disableAnimation: false,
      //   }}
      disableOverlayClose={true}
      disableScrollParentFix={true}
      spotlightClicks={true}
      spotlightPadding={8}
    />
  );
}
