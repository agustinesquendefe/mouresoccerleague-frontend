import { getAppSettings } from '@/services/settings/settings.service';

export const metadata = {
  title: 'Privacy Policy | Moure Premier Soccer League',
};

export default async function PrivacyPolicyPage() {
  const settings = await getAppSettings();
  const leagueName = settings?.league_name || 'Moure Premier League';
  const contactEmail = settings?.contact_email || 'info@moureleague.com';

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div
        className="w-full py-14 px-4 text-center"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        <p className="text-xs uppercase tracking-widest text-blue-300 font-filson-regular mb-2">
          {leagueName}
        </p>
        <h1 className="text-3xl md:text-4xl font-filson-black text-white">Privacy Policy</h1>
        <p className="text-blue-200 font-filson-regular text-sm mt-2">Last updated: April 2026</p>
      </div>

      <section className="container mx-auto px-4 py-14 max-w-3xl">
        <div className="prose prose-sm max-w-none font-filson-regular text-gray-700 space-y-8">

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">1. Introduction</h2>
            <p>
              {leagueName} ("we", "our", "us") is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, and safeguard your personal information
              when you visit our website.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong>Personal identification information</strong> — name, email address, phone
                number, provided voluntarily through contact forms or registration.
              </li>
              <li>
                <strong>Usage data</strong> — pages visited, time spent on the site, and browser
                type, collected automatically through analytics tools.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Respond to inquiries and provide customer support.</li>
              <li>Process team registrations and manage league operations.</li>
              <li>Send administrative communications related to the league.</li>
              <li>Improve our website and services.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">4. Sharing of Information</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may
              share your information with trusted service providers who assist us in operating the
              website, provided they agree to keep your information confidential.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">5. Cookies</h2>
            <p>
              Our website may use cookies to enhance your experience. Cookies are small data files
              stored on your device. You can instruct your browser to refuse all cookies or to
              indicate when a cookie is being sent. Some features of the website may not function
              properly without cookies.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">6. Data Security</h2>
            <p>
              We implement reasonable security measures to protect your personal information from
              unauthorized access, alteration, or disclosure. However, no method of transmission
              over the internet is completely secure.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">7. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites. We are not responsible for
              the privacy practices of those websites and encourage you to review their privacy
              policies.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">8. Your Rights</h2>
            <p>
              You have the right to request access to, correction of, or deletion of your personal
              information that we hold. To exercise these rights, please contact us at{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-700 hover:underline">
                {contactEmail}
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">9. Changes to This Policy</h2>
            <p>
              We reserve the right to update this Privacy Policy at any time. Changes will be
              posted on this page with an updated revision date. We encourage you to review this
              policy periodically.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-700 hover:underline">
                {contactEmail}
              </a>
              .
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
