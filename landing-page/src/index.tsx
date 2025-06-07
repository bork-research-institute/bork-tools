import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Book, MessageCircle, Shield, Twitter, X, Zap } from 'lucide-react';

const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#020617] border border-white/10 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#020617] border-b border-white/10 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bogota">Privacy Policy</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-6 text-white/60">
          <section>
            <h3 className="text-xl font-bogota text-white mb-4">
              1. Information We Collect
            </h3>
            <p className="mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (email, username)</li>
              <li>Usage data and analytics</li>
              <li>Wallet addresses (when connected)</li>
              <li>Communication preferences</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bogota text-white mb-4">
              2. How We Use Your Information
            </h3>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Improve and personalize your experience</li>
              <li>Communicate with you about updates and features</li>
              <li>Analyze usage patterns and optimize performance</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bogota text-white mb-4">
              3. Data Security
            </h3>
            <p>
              We implement appropriate security measures to protect your
              personal information. However, no method of transmission over the
              internet is 100% secure.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bogota text-white mb-4">
              4. Your Rights
            </h3>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of communications</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bogota text-white mb-4">
              5. Contact Us
            </h3>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at privacy@eggsight.ai
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
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
                href="https://discord.gg/MCpkAeUgej"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                Discord
              </a>
              <a
                href="https://app.eggsight.xyz"
                className="bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-6 py-2 rounded-md text-lg transition-colors flex items-center gap-2"
              >
                <Zap className="h-5 w-5" />
                Launch App
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5B335]/5 to-transparent opacity-50" />
        <div className="text-center relative z-10">
          <h1 className="text-6xl font-bogota font-bold mb-8 tracking-wide text-white">
            Summon the Alpha
          </h1>
          <p className="text-2xl text-white/60 mb-6 max-w-3xl mx-auto tracking-wide">
            Live crypto intel feeds → instant on-chain moves.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://app.eggsight.xyz"
              className="bg-[#2EC4F1]/10 hover:bg-[#2EC4F1]/20 text-[#2EC4F1] px-12 py-4 rounded-md text-xl tracking-wide transition-colors flex items-center gap-2"
            >
              <Zap className="h-5 w-5" />
              Launch Eggsight
            </a>
            <div className="flex items-center gap-4 text-white/40">
              <span>No login • Free tier</span>
              <span>|</span>
              <a
                href="https://discord.gg/MCpkAeUgej"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                Discord (150+ degens)
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
      <section className="py-24">
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
                – whales, dev pushes, KOLs every 60 s
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Agentic AI
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                – crafts theses, filters noise
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                One-Tap Actions
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                – trade straight from the card
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                XP Loop
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                – your clicks sharpen the model
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Content Bot
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                – auto threads, guides, webinars
              </p>
              <span className="inline-block mt-4 text-[#2EC4F1]">Q4</span>
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
                Listen
              </h3>
              <p className="text-xl text-white/60">— ingest every tweet & tx</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-6">2</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Learn
              </h3>
              <p className="text-xl text-white/60">— rank + verify signals</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-6">3</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Act
              </h3>
              <p className="text-xl text-white/60">
                — execute inside the dashboard
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
                Scout
              </h3>
              <p className="text-3xl font-bold mb-6">Free</p>
              <ul className="space-y-4 text-xl text-white/60">
                <li>Live feed</li>
                <li>3 AI insights/day</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md backdrop-blur-sm">
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Raider
              </h3>
              <p className="text-3xl font-bold mb-6">$15 / mo</p>
              <ul className="space-y-4 text-xl text-white/60">
                <li>Unlimited insights</li>
                <li>Custom pings</li>
                <li>API access</li>
              </ul>
              <span className="inline-block mt-4 text-[#2EC4F1]">
                Coming soon
              </span>
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
            <div className="flex space-x-8">
              <span className="text-lg text-white/40 flex items-center gap-2">
                <Book className="h-5 w-5" /> Docs (Coming Soon)
              </span>
              <a
                href="https://discord.gg/MCpkAeUgej"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" /> Discord
              </a>
              <a
                href="https://twitter.com/eggsight_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2"
              >
                <Twitter className="h-5 w-5" /> X (@eggsight_)
              </a>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="text-lg text-white/60 hover:text-white transition-colors flex items-center gap-2"
              >
                <Shield className="h-5 w-5" /> Privacy
              </button>
            </div>
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
      >
        <Zap className="h-5 w-5" />
        Launch
      </a>
    </div>
  );
};

const root = createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
