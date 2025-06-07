import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="text-2xl font-bold">Eggsight</div>
          <div className="space-x-6">
            <a href="#features" className="hover:text-blue-400 transition">
              Features
            </a>
            <a href="#about" className="hover:text-blue-400 transition">
              About
            </a>
            <a href="#contact" className="hover:text-blue-400 transition">
              Contact
            </a>
            <button
              type="button"
              className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg transition"
            >
              Get Started
            </button>
          </div>
        </nav>

        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">
            Transform Your Data with{' '}
            <span className="text-blue-400">Eggsight</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Unlock the power of your data with our advanced analytics platform.
            Make informed decisions with real-time insights and predictive
            analytics.
          </p>
          <button
            type="button"
            className="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition"
          >
            Start Free Trial
          </button>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-800">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="text-blue-400 text-2xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">
                Real-time Analytics
              </h3>
              <p className="text-gray-300">
                Monitor your data in real-time with our powerful analytics
                dashboard.
              </p>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="text-blue-400 text-2xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">
                AI-Powered Insights
              </h3>
              <p className="text-gray-300">
                Leverage artificial intelligence to uncover hidden patterns and
                trends.
              </p>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="text-blue-400 text-2xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-2">
                Predictive Analytics
              </h3>
              <p className="text-gray-300">
                Forecast future trends and make data-driven decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using Eggsight to transform
            their data analytics.
          </p>
          <button
            type="button"
            className="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition"
          >
            Sign Up Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-xl font-bold mb-4 md:mb-0">Eggsight</div>
            <div className="flex space-x-6">
              <a
                href="/privacy"
                className="text-gray-400 hover:text-white transition"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-gray-400 hover:text-white transition"
              >
                Terms of Service
              </a>
              <a
                href="/contact"
                className="text-gray-400 hover:text-white transition"
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
