import './index.css';
import { PrivacyModal } from '@/components/privacy-modal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { track } from '@vercel/analytics';
import { Menu, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { FaBook, FaDiscord, FaShieldAlt } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export const LandingPage: React.FC = () => {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#181F2A] text-white">
      {/* Header */}
      <header className="border-[#2EC4F1]/20 border-b bg-[#181F2A]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <a
                href="/"
                className="flex items-center justify-center space-x-1.5 text-lg sm:text-xl lg:text-2xl text-white hover:opacity-80 transition-opacity"
              >
                <img
                  src="/assets/eggsight-removebg-preview.png"
                  alt="Eggsight Logo"
                  className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
                />
                <h1 className="font-bogota">eggsight</h1>
                <span className="rounded-md bg-[#2EC4F1]/10 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm lg:text-base">
                  ALPHA
                </span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
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

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/10 mt-2">
              <div className="flex flex-col space-y-3">
                <button
                  type="button"
                  className="text-left text-lg text-white/60 hover:text-white transition-colors py-2 px-2 rounded-md hover:bg-white/5"
                  onClick={() => scrollToSection('features')}
                >
                  Features
                </button>
                <button
                  type="button"
                  className="text-left text-lg text-white/60 hover:text-white transition-colors py-2 px-2 rounded-md hover:bg-white/5"
                  onClick={() => scrollToSection('pricing')}
                >
                  Pricing
                </button>
                <a
                  href="https://app.eggsight.xyz"
                  className="bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-4 py-3 rounded-md text-lg transition-colors flex items-center gap-2 justify-center mt-2"
                  onClick={() => {
                    track('launch_app', { source: 'header_cta' });
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Zap className="h-5 w-5" />
                  Launch App
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 min-h-screen flex flex-col justify-center items-center relative py-8 sm:py-8 lg:py-0">
        <div className="relative z-10 w-full mx-auto flex flex-col sm:flex-row items-center sm:justify-center text-center sm:text-left gap-0 sm:gap-10">
          <img
            src="/assets/eggsight-removebg-preview.png"
            alt="Eggsight Hero Logo"
            className="mx-auto sm:mx-0 w-48 h-48 sm:w-128 sm:h-128 drop-shadow-2xl flex-shrink-0"
            style={{
              filter:
                'drop-shadow(0 0 24px #2EC4F1) drop-shadow(0 0 16px #2EC4F1)',
            }}
          />
          <div className="flex-1">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bogota font-bold mb-6 sm:mb-8 lg:mb-10 tracking-wide text-white leading-tight">
              Summon the Alpha
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-white/60 mb-8 sm:mb-10 max-w-3xl mx-auto sm:mx-0 tracking-wide px-4 sm:px-0 leading-relaxed">
              Live Twitter intel feeds → instant on-chain moves.
            </p>
            <div className="flex flex-col items-center sm:items-start gap-6 sm:gap-8">
              <a
                href="https://app.eggsight.xyz"
                className="bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-8 sm:px-12 lg:px-16 py-4 sm:py-5 rounded-lg text-lg sm:text-xl lg:text-2xl tracking-wide transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105"
                onClick={() => track('launch_app', { source: 'hero_cta' })}
              >
                <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                Launch Eggsight
              </a>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-white/40 text-sm sm:text-base lg:text-xl">
                <span className="font-medium">Now Free for Public</span>
                <span className="hidden sm:inline text-white/20">|</span>
                <a
                  href="https://discord.gg/MCpkAeUgej"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors text-sm sm:text-base lg:text-xl font-medium"
                >
                  Join Discord (150+ degens)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Eggsight */}
      <section className="py-16 sm:py-20 lg:py-24 bg-[#020617]/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bogota font-bold text-center mb-12 sm:mb-16 tracking-wide flex items-center justify-center gap-3 text-white">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-[#2EC4F1]" />
            Why Eggsight
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
            <div className="space-y-6 sm:space-y-8">
              <h3 className="text-2xl sm:text-3xl font-bogota font-semibold mb-6 tracking-wide text-white">
                Pain
              </h3>
              <ul className="space-y-4 sm:space-y-6 text-lg sm:text-xl text-white/60">
                <li className="flex items-start gap-3">
                  <span className="text-[#2EC4F1] mt-1">•</span>
                  <span>Scrolling socials, tracking wallets, still late</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2EC4F1] mt-1">•</span>
                  <span>Sentiment tools recap the past</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2EC4F1] mt-1">•</span>
                  <span>Raw data, no next step</span>
                </li>
              </ul>
            </div>
            <div className="space-y-6 sm:space-y-8">
              <h3 className="text-2xl sm:text-3xl font-bogota font-semibold mb-6 tracking-wide text-[#2EC4F1]">
                Our Fix
              </h3>
              <ul className="space-y-4 sm:space-y-6 text-lg sm:text-xl text-white/60">
                <li className="flex items-start gap-3">
                  <span className="text-[#2EC4F1] mt-1">•</span>
                  <span>Unified Signal Feed — socials + chain, one screen</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2EC4F1] mt-1">•</span>
                  <span>Predictive AI — spots narratives as they form</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2EC4F1] mt-1">•</span>
                  <span>Action Cards — tap to swap, stake, or save</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 sm:py-20 lg:py-24" id="features">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bogota font-bold text-center mb-12 sm:mb-16 tracking-wide flex items-center justify-center gap-3">
            <span className="text-[#2EC4F1] text-4xl sm:text-5xl">🔮</span>
            Core Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
            <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:border-[#2EC4F1]/30">
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-4 tracking-wide text-[#2EC4F1]">
                Signal Scanner
              </h3>
              <p className="text-lg sm:text-xl text-white/60 tracking-wide leading-relaxed">
                — uses tweets, token feeds from dexscreener
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:border-[#2EC4F1]/30">
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-4 tracking-wide text-[#2EC4F1]">
                Agentic AI
              </h3>
              <p className="text-lg sm:text-xl text-white/60 tracking-wide leading-relaxed">
                — analyzes data, filters noise
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:border-[#2EC4F1]/30">
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-4 tracking-wide text-[#2EC4F1]">
                One-Tap Actions
              </h3>
              <p className="text-lg sm:text-xl text-white/60 tracking-wide leading-relaxed">
                — trade straight from the dashboard
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:border-[#2EC4F1]/30">
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-4 tracking-wide text-[#2EC4F1]">
                Content Bot
              </h3>
              <p className="text-lg sm:text-xl text-white/60 tracking-wide leading-relaxed">
                — automatic threads (done), articles (Q4), webinars (Q4)
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:border-[#2EC4F1]/30 md:col-span-2 lg:col-span-1">
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-4 tracking-wide text-[#2EC4F1]">
                Cult of Bork
              </h3>
              <p className="text-lg sm:text-xl text-white/60 tracking-wide leading-relaxed">
                — users can be the eyes and ears of eggsight, earning points in
                exchange for tagging @eggsight_ in interesting tweets
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="py-16 sm:py-20 lg:py-24 bg-[#020617]/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bogota font-bold text-center mb-12 sm:mb-16 tracking-wide flex items-center justify-center gap-3">
            <span className="text-[#2EC4F1] text-4xl sm:text-5xl">🛠</span>
            Flow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 max-w-6xl mx-auto">
            <div className="text-center bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm">
              <div className="text-4xl sm:text-5xl mb-6 text-[#2EC4F1] font-bold">
                1
              </div>
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-6 tracking-wide text-white">
                Research
              </h3>
              <div className="space-y-3 text-lg sm:text-xl text-white/60">
                <p>— ingest tweets and transactions</p>
                <p>— adjust research strategy based on feedback</p>
                <p>— runs 24/7</p>
              </div>
            </div>
            <div className="text-center bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm">
              <div className="text-4xl sm:text-5xl mb-6 text-[#2EC4F1] font-bold">
                2
              </div>
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-6 tracking-wide text-white">
                Analyze
              </h3>
              <div className="space-y-3 text-lg sm:text-xl text-white/60">
                <p>— ai-powered sentiment analysis</p>
                <p>— score in the context of trending topics and accounts</p>
              </div>
            </div>
            <div className="text-center bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm">
              <div className="text-4xl sm:text-5xl mb-6 text-[#2EC4F1] font-bold">
                3
              </div>
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-6 tracking-wide text-white">
                Act
              </h3>
              <div className="space-y-3 text-lg sm:text-xl text-white/60">
                <p>— execute trades in the dashboard</p>
                <p>— generate informative threads</p>
                <p>— launch tokens on gofundmemes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Early Proof */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bogota font-bold text-center mb-12 sm:mb-16 tracking-wide flex items-center justify-center gap-3">
            <span className="text-[#2EC4F1] text-4xl sm:text-5xl">🌱</span>
            Early Proof
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
            <div className="space-y-6 sm:space-y-8">
              <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-6 tracking-wide text-white">
                  Current Users
                </h3>
                <ul className="space-y-4 sm:space-y-5 text-lg sm:text-xl text-white/60">
                  <li className="flex items-start gap-3">
                    <span className="text-[#2EC4F1] mt-1">•</span>
                    <span>
                      20+ members w/ 100M+ $BORK to access premium features
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#2EC4F1] mt-1">•</span>
                    <span>150-member Discord, daily feedback</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#2EC4F1] mt-1">•</span>
                    <span>Users report more winning plays vs. manual DD</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="space-y-6 sm:space-y-8">
              <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-6 tracking-wide text-[#2EC4F1]">
                  User Testimonial
                </h3>
                <blockquote className="text-lg sm:text-xl text-white/60 italic leading-relaxed">
                  "Eggsight turned my research grind into a speed-run."
                </blockquote>
                <p className="text-base sm:text-lg text-white/40 mt-4 font-medium">
                  — early tester
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-20 lg:py-24 bg-[#020617]/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bogota font-bold text-center mb-12 sm:mb-16 tracking-wide flex items-center justify-center gap-3">
            <span className="text-[#2EC4F1] text-4xl sm:text-5xl">💸</span>
            Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-200">
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-4 tracking-wide text-white">
                Egg Scout
              </h3>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 text-[#2EC4F1]">
                Free
              </p>
              <ul className="space-y-3 sm:space-y-4 text-lg sm:text-xl text-white/60">
                <li className="flex items-center gap-3">
                  <span className="text-[#2EC4F1]">✓</span>
                  <span>Dashboard Access</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2EC4F1]">✓</span>
                  <span>Basic Info Display</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2EC4F1]">✓</span>
                  <span>Community Access</span>
                </li>
              </ul>
            </div>
            <div className="bg-white/5 border border-[#2EC4F1]/30 p-6 sm:p-8 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-200 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#2EC4F1] text-[#181F2A] px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              <h3 className="text-xl sm:text-2xl font-bogota font-semibold mb-4 tracking-wide text-[#2EC4F1]">
                Egg Master
              </h3>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 text-[#2EC4F1]">
                100M $BORK
              </p>
              <ul className="space-y-3 sm:space-y-4 text-lg sm:text-xl text-white/60">
                <li className="flex items-center gap-3">
                  <span className="text-[#2EC4F1]">✓</span>
                  <span>AI Chatbot Access</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2EC4F1]">✓</span>
                  <span>Live Research Feed</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2EC4F1]">✓</span>
                  <span>Thread Generation</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2EC4F1]">✓</span>
                  <span>Priority Support</span>
                </li>
              </ul>
              <a
                href="https://jup.ag/swap/So11111111111111111111111111111111111111112-yzRagkRLnzG3ksiCRpknHNVc1nep6MMS7rKJv8YHGFM"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block w-full text-center bg-[#2EC4F1] text-[#181F2A] font-bold py-3 rounded-lg shadow-lg hover:bg-[#22b6e3] transition-colors text-lg sm:text-xl"
              >
                Buy $BORK
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#181F2A]/80 border-t border-white/10 py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center space-y-6 sm:space-y-8">
            <div className="flex items-center space-x-2 text-xl sm:text-2xl font-bogota">
              <img
                src="/assets/eggsight-removebg-preview.png"
                alt="Eggsight Logo"
                className="h-6 w-6 sm:h-8 sm:w-8"
              />
              <span>eggsight</span>
            </div>
            <TooltipProvider>
              <div className="flex space-x-6 sm:space-x-8">
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <button
                      type="button"
                      className="text-base sm:text-lg text-white/40 hover:text-white/60 transition-colors flex items-center gap-2 p-2 hover:bg-white/10 rounded-md"
                    >
                      <FaBook className="h-4 w-4 sm:h-5 sm:w-5" />
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
                      className="text-base sm:text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2 p-2 hover:bg-white/10 rounded-md"
                    >
                      <FaDiscord className="h-4 w-4 sm:h-5 sm:w-5" />
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
                      className="text-base sm:text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2 p-2 hover:bg-white/10 rounded-md"
                    >
                      <FaXTwitter className="h-4 w-4 sm:h-5 sm:w-5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Follow us on X!</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <button
                      type="button"
                      onClick={() => setIsPrivacyModalOpen(true)}
                      className="text-base sm:text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2 p-2 hover:bg-white/10 rounded-md"
                    >
                      <FaShieldAlt className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>View our privacy policy</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <div className="text-center space-y-4">
              <p className="text-sm sm:text-base text-white/40">
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
        className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-4 sm:px-6 py-3 rounded-full text-base sm:text-lg transition-all duration-200 flex items-center gap-2 shadow-lg backdrop-blur-sm hover:shadow-xl hover:scale-105 z-40"
        onClick={() => track('launch_app', { source: 'floating_cta' })}
      >
        <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline">Launch</span>
      </a>
    </div>
  );
};
