import { getAppSettings } from '@/services/settings/settings.service';

export const metadata = {
  title: 'Terms of Use | Moure Premier Soccer League',
};

export default async function TermsOfUsePage() {
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
        <h1 className="text-3xl md:text-4xl font-filson-black text-white">Terms of Use</h1>
        <p className="text-blue-200 font-filson-regular text-sm mt-2">Last updated: April 2026</p>
      </div>

      <section className="container mx-auto px-4 py-14 max-w-3xl">
        <div className="prose prose-sm max-w-none font-filson-regular text-gray-700 space-y-8">

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the {leagueName} website, you agree to be bound by these Terms
              of Use. If you do not agree to these terms, please do not use our website.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">2. Use of the Website</h2>
            <p>
              You may use this website for lawful purposes only. You agree not to use it to
              transmit any unlawful, threatening, abusive, defamatory, or otherwise objectionable
              material. You may not attempt to gain unauthorized access to any portion of the
              website or any systems connected to it.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">3. Intellectual Property</h2>
            <p>
              All content on this website — including text, images, logos, and graphics — is the
              property of {leagueName} and is protected by applicable copyright and trademark laws.
              You may not reproduce, distribute, or create derivative works without our prior
              written consent.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">4. Disclaimer of Warranties</h2>
            <p>
              This website is provided "as is" without warranties of any kind, either express or
              implied, including but not limited to implied warranties of merchantability and
              fitness for a particular purpose. We do not warrant that the website will be
              uninterrupted or error-free.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">5. Limitation of Liability</h2>
            <p>
              {leagueName} shall not be liable for any damages arising from the use or inability
              to use this website, including direct, indirect, incidental, punitive, or
              consequential damages.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Use at any time. Changes will be
              effective immediately upon posting to the website. Your continued use of the website
              constitutes acceptance of the updated terms.
            </p>
          </div>

          <div>
            <h2 className="font-filson-black text-gray-900 text-lg mb-2">7. Contact</h2>
            <p>
              If you have any questions about these Terms of Use, please contact us at{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-blue-700 hover:underline"
              >
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
