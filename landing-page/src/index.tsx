import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Egg } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="border-emerald-400/20 border-b bg-[#020617]/80">
        <div className="mx-auto max-w-7xl px-4 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <a
                href="/"
                className="flex items-center justify-center space-x-1.5 text-2xl text-white hover:opacity-80 transition-opacity"
              >
                <Egg className="h-6 w-6" />
                <h1 className="font-bogota">eggsight</h1>
                <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-base">
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
                href="#about"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                About
              </a>
              <a
                href="#contact"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                Contact
              </a>
              <button
                type="button"
                className="bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 px-6 py-2 rounded-md text-lg transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-6xl font-bogota font-bold mb-8 tracking-wide">
            Transform Your Data with{' '}
            <span className="text-emerald-400">Eggsight</span>
          </h1>
          <p className="text-2xl text-white/60 mb-12 max-w-3xl mx-auto tracking-wide">
            Unlock the power of your data with our advanced analytics platform.
            Make informed decisions with real-time insights and predictive
            analytics.
          </p>
          <button
            type="button"
            className="bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 px-12 py-4 rounded-md text-xl tracking-wide transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#020617]/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bogota font-bold text-center mb-16 tracking-wide">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-md">
              <div className="text-emerald-400 text-4xl mb-6">📊</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Real-time Analytics
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                Monitor your data in real-time with our powerful analytics
                dashboard.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md">
              <div className="text-emerald-400 text-4xl mb-6">🤖</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                AI-Powered Insights
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                Leverage artificial intelligence to uncover hidden patterns and
                trends.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-md">
              <div className="text-emerald-400 text-4xl mb-6">📈</div>
              <h3 className="text-2xl font-bogota font-semibold mb-4 tracking-wide">
                Predictive Analytics
              </h3>
              <p className="text-xl text-white/60 tracking-wide">
                Forecast future trends and make data-driven decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bogota font-bold mb-8 tracking-wide">
            Ready to Get Started?
          </h2>
          <p className="text-2xl text-white/60 mb-12 max-w-3xl mx-auto tracking-wide">
            Join thousands of businesses already using Eggsight to transform
            their data analytics.
          </p>
          <button
            type="button"
            className="bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 px-12 py-4 rounded-md text-xl tracking-wide transition-colors"
          >
            Sign Up Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020617]/80 border-t border-white/10 py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 text-2xl font-bogota mb-6 md:mb-0">
              <Egg className="h-6 w-6" />
              <span>eggsight</span>
            </div>
            <div className="flex space-x-8">
              <a
                href="/privacy"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/contact"
                className="text-lg text-white/60 hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
