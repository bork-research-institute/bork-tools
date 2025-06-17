import './index.css';
import { PrivacyModal } from '@/components/privacy-modal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { track } from '@vercel/analytics';
import { Zap } from 'lucide-react';
import { useState } from 'react';
import { FaBook, FaDiscord, FaShieldAlt } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export const LandingPage: React.FC = () => {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#181F2A] text-white">
      {/* Header */}
      <header className="border-[#2EC4F1]/20 border-b bg-[#181F2A]/80 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <a
                href="/"
                className="flex items-center justify-center space-x-1.5 text-2xl text-white hover:opacity-80 transition-opacity"
              >
                <img
                  src="/assets/eggsight.png"
                  alt="Eggsight Logo"
                  className="h-8 w-8"
                />
                <h1 className="font-bogota">eggsight</h1>
                <span className="rounded-md bg-[#2EC4F1]/10 px-2 py-1 text-base">
                  ALPHA
                </span>
              </a>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="#features"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                Pricing
              </a>
              <a
                href="https://app.eggsight.xyz"
                className="bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-6 py-2 rounded-md text-lg transition-colors flex items-center gap-2"
                onClick={() => track('launch_app', { source: 'header_cta' })}
              >
                <Zap className="h-5 w-5" />
                Launch App
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 min-h-screen flex flex-col justify-center items-center relative">
        <div className="text-center relative z-10 w-full">
          <h1 className="text-7xl lg:text-8xl font-bogota font-bold mb-10 tracking-wide text-white">
            Summon the Alpha
          </h1>
          <p className="text-3xl text-white/60 mb-8 max-w-3xl mx-auto tracking-wide">
            Live Twitter intel feeds → instant on-chain moves.
          </p>
          <div className="flex flex-col items-center gap-6">
            <a
              href="https://app.eggsight.xyz"
              className="bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-16 py-5 rounded-md text-2xl tracking-wide transition-colors flex items-center gap-3"
              onClick={() => track('launch_app', { source: 'hero_cta' })}
            >
              <Zap className="h-6 w-6" />
              Launch Eggsight
            </a>
            <div className="flex items-center gap-4 text-white/40 text-xl">
              <span>Now Free for Public</span>
              <span>|</span>
              <a
                href="https://discord.gg/MCpkAeUgej"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors text-xl"
              >
                Join Discord (150+ degens)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Eggsight */}
      <section className="py-24 bg-[#020617]/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bogota font-bold text-center mb-16 tracking-wide flex items-center justify-center gap-2 text-white">
            <Zap className="h-8 w-8 text-[#2EC4F1]" />
            Why Eggsight
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-8">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide text-white">
                Pain
              </h3>
              <ul className="space-y-6 text-xl text-white/60">
                <li>Scrolling socials, tracking wallets, still late</li>
                <li>Sentiment tools recap the past</li>
                <li>Raw data, no next step</li>
              </ul>
            </div>
            <div className="space-y-8">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide text-[#2EC4F1]">
                Our Fix
              </h3>
              <ul className="space-y-6 text-xl text-white/60">
                <li>Unified Signal Feed — socials + chain, one screen</li>
                <li>Predictive AI — spots narratives as they form</li>
                <li>Action Cards — tap to swap, stake, or save</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24" id="features">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bogota font-bold text-center mb-16 tracking-wide flex items-center justify-center gap-2">
            <span className="text-[#2EC4F1]">🔮</span>
            Core Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Signal Scanner
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                — uses tweets, token feeds from dexscreener
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Agentic AI
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                — analyzes data, filters noise
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                One-Tap Actions
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                — trade straight from the dashboard
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Content Bot
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                — automatic threads (done), articles (Q4), webinars (Q4)
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Cult of Bork
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                — users can be the eyes and ears of eggsight, earning points in
                exchange for tagging @eggsight_ in interesting tweets
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="py-24 bg-[#020617]/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bogota font-bold text-center mb-16 tracking-wide flex items-center justify-center gap-2">
            <span className="text-[#2EC4F1]">🛠</span>
            Flow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-6">1</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Research
              </h3>
              <p className="text-xl text-white/60">
                — ingest tweets and transactions
              </p>
              <p className="text-xl text-white/60">
                — adjust research strategy based on feedback
              </p>
              <p className="text-xl text-white/60">— runs 24/7</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-6">2</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Analyze
              </h3>
              <p className="text-xl text-white/60">
                — ai-powered sentiment analysis
              </p>
              <p className="text-xl text-white/60">
                — score in the context of trending topics and accounts
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-6">3</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Act
              </h3>
              <p className="text-xl text-white/60">
                — execute trades in the dashboard
              </p>
              <p className="text-xl text-white/60">
                — generate informative threads
              </p>
              <p className="text-xl text-white/60">
                — launch tokens on gofundmemes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Early Proof */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bogota font-bold text-center mb-16 tracking-wide flex items-center justify-center gap-2">
            <span className="text-[#2EC4F1]">🌱</span>
            Early Proof
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-8">
              <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
                <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide text-white">
                  Current Users
                </h3>
                <ul className="space-y-4 text-xl text-white/60">
                  <li>20+ members w/ 100M+ $BORK to access premium features</li>
                  <li>150-member Discord, daily feedback</li>
                  <li>Users report more winning plays vs. manual DD</li>
                </ul>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
                <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                  User Testimonial
                </h3>
                <blockquote className="text-xl text-white/60 italic">
                  "Eggsight turned my research grind into a speed-run."
                </blockquote>
                <p className="text-lg text-white/40 mt-4">— early tester</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-[#020617]/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bogota font-bold text-center mb-16 tracking-wide flex items-center justify-center gap-2">
            <span className="text-[#2EC4F1]">💸</span>
            Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Egg Scout
              </h3>
              <p className="text-3xl font-bold mb-6">Free</p>
              <ul className="space-y-4 text-xl text-white/60">
                <li>Dashboard Access</li>
                <li>Basic Info Display</li>
                <li>Community Access</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Egg Master
              </h3>
              <p className="text-3xl font-bold mb-6">100M $BORK</p>
              <ul className="space-y-4 text-xl text-white/60">
                <li>AI Chatbot Access</li>
                <li>Live Research Feed</li>
                <li>Thread Generation</li>
                <li>Priority Support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#181F2A]/80 border-t border-white/10 py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center space-y-8">
            <div className="flex items-center space-x-2 text-2xl font-bogota">
              <img
                src="/assets/eggsight.png"
                alt="Eggsight Logo"
                className="h-8 w-8"
              />
              <span>eggsight</span>
            </div>
            <TooltipProvider>
              <div className="flex space-x-8">
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <button
                      type="button"
                      className="text-lg text-white/40 hover:text-white/60 transition-colors flex items-center gap-2"
                    >
                      <FaBook className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Documentation coming soon!</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <a
                      href="https://discord.gg/MCpkAeUgej"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <FaDiscord className="h-5 w-5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Join our Discord community!</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <a
                      href="https://twitter.com/eggsight_"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <FaXTwitter className="h-5 w-5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Follow us on X!</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <button
                      type="button"
                      onClick={() => setIsPrivacyModalOpen(true)}
                      className="text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <FaShieldAlt className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>View our privacy policy</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <div className="text-center space-y-4">
              <p className="text-white/40">
                Copyright © 2025{' '}
                <a
                  href="https://bork.institute"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  Bork Research Institute
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Floating CTA Button */}
      <a
        href="https://app.eggsight.xyz"
        className="fixed bottom-8 right-8 bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-6 py-3 rounded-full text-lg transition-colors flex items-center gap-2 shadow-lg backdrop-blur-sm"
        onClick={() => track('launch_app', { source: 'floating_cta' })}
      >
        <Zap className="h-5 w-5" />
        Launch
      </a>
    </div>
  );
};
