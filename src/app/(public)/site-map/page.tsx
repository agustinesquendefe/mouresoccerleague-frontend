import Link from 'next/link';
import { getAppSettings } from '@/services/settings/settings.service';

export const metadata = {
  title: 'Site Map | Moure Premier Soccer League',
};

const sections = [
  {
    title: 'League',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Matches', href: '/matches' },
      { label: 'Standings', href: '/standings' },
    ],
  },
  {
    title: 'Organization',
    links: [
      { label: 'About Us', href: '/about-us' },
      { label: 'Contact Us', href: '/contact-us' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Use', href: '/terms-of-use' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
    ],
  },
];

export default async function SiteMapPage() {
  const settings = await getAppSettings();
  const leagueName = settings?.league_name || 'Moure Premier League';

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div
        className="w-full py-14 px-4 text-center"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        <p className="text-xs uppercase tracking-widest text-blue-300 font-filson-regular mb-2">
          {leagueName}
        </p>
        <h1 className="text-3xl md:text-4xl font-filson-black text-white">Site Map</h1>
      </div>

      <section className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-3xl">
          {sections.map((section) => (
            <div key={section.title}>
              <h2
                className="text-xs font-filson-black uppercase tracking-widest mb-4"
                style={{ color: 'var(--color-blue, #023467)' }}
              >
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-filson-regular text-sm text-gray-700 hover:underline hover:text-blue-700 transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
