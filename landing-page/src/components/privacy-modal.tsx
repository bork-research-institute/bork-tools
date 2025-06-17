import { X } from 'lucide-react';

export const PrivacyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
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
