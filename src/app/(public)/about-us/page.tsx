import Image from 'next/image';
import Link from 'next/link';
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6';
import { getAppSettings } from '@/services/settings/settings.service';
import { MapPin, Phone, Mail, Trophy, Users, Shield, Star } from 'lucide-react';

export const metadata = {
  title: 'About Us | Moure Premier Soccer League',
  description: 'Learn about Moure Premier Soccer League — our mission, values, and commitment to the community.',
};

export default async function AboutUsPage() {
  const settings = await getAppSettings();

  const leagueName = settings?.league_name || 'Moure Premier League';
  const logoUrl = settings?.logo_url || '/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg';
  const facebookUrl = settings?.facebook_url || '#';
  const instagramUrl = settings?.instagram_url || '#';
  const tiktokUrl = settings?.tiktok_url || '#';
  const youtubeUrl = settings?.youtube_url || '#';
  const contactPhone = settings?.contact_phone || '(336) 404-7816';
  const contactEmail = settings?.contact_email || 'info@moureleague.com';
  const address = settings?.address || '1760 S Martin Luther King Jr Dr, Winston-Salem, NC 27107';

  const pillars = [
    {
      icon: <Trophy size={28} className="text-yellow-400" />,
      title: 'Competitive Excellence',
      description:
        'We provide a high-quality competitive environment for amateur soccer players of all levels, from recreational leagues to advanced divisions.',
    },
    {
      icon: <Users size={28} className="text-yellow-400" />,
      title: 'Community First',
      description:
        "Football is more than a sport — it's a community. We build lasting bonds between players, families, and coaches from across the region.",
    },
    {
      icon: <Shield size={28} className="text-yellow-400" />,
      title: 'Fair Play',
      description:
        'Respect for referees, opponents, and the game is non-negotiable. We foster a culture of integrity both on and off the pitch.',
    },
    {
      icon: <Star size={28} className="text-yellow-400" />,
      title: 'Player Development',
      description:
        'From youth categories to adult divisions, we support the growth of every player through structured competition and coaching.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Banner */}
      <div
        className="w-full py-16 px-4 text-center"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        <p className="text-xs uppercase tracking-widest text-blue-300 font-filson-regular mb-2">
          {leagueName}
        </p>
        <h1 className="text-3xl md:text-5xl font-filson-black text-white mb-4">About Us</h1>
        <p className="text-blue-200 font-filson-regular text-base max-w-xl mx-auto">
          Passion for the beautiful game. Commitment to our community.
        </p>
      </div>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16 flex flex-col md:flex-row items-center gap-12">
        <div className="shrink-0 flex justify-center">
          <Image
            src={logoUrl}
            alt={leagueName + ' Logo'}
            width={220}
            height={220}
            className="drop-shadow-xl"
          />
        </div>
        <div className="flex-1">
          <h2
            className="text-2xl md:text-3xl font-filson-black mb-4"
            style={{ color: 'var(--color-blue, #023467)' }}
          >
            Who We Are
          </h2>
          <p className="text-gray-600 font-filson-regular text-base leading-relaxed mb-4">
            {leagueName} is an amateur soccer league based in Winston-Salem, NC, dedicated to
            bringing the best of competitive football to our community. Founded with a passion for
            the sport and a commitment to inclusivity, our league offers a structured competition
            for adult teams across multiple divisions.
          </p>
          <p className="text-gray-600 font-filson-regular text-base leading-relaxed mb-6">
            Whether you're a seasoned player or picking up the sport for the first time, Moure
            Premier League is your home. We organize regular season leagues, knockout playoffs, and
            special events that celebrate the sport we all love.
          </p>
          <Link
            href="/contact-us"
            className="inline-block font-filson-bold text-sm uppercase tracking-widest text-white px-6 py-3 rounded shadow hover:opacity-90 transition"
            style={{ background: 'var(--color-blue, #023467)' }}
          >
            Join the League
          </Link>
        </div>
      </section>

      {/* Pillars */}
      <section
        className="w-full py-16 px-4"
      >
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-filson-black text-blue-950 text-center mb-10">
            Our Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="bg-gray-100 rounded-2xl px-6 py-8 flex flex-col items-center text-center border border-white/10 hover:bg-white/15 transition"
              >
                <div className="mb-4">{p.icon}</div>
                <h3 className="font-filson-black text-blue-950 text-base mb-2">{p.title}</h3>
                <p className="font-filson-regular text-black text-sm leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Summary */}
      <section className="container mx-auto px-4 py-16 flex flex-col md:flex-row gap-10 items-start justify-center">
        <div>
          <h2
            className="text-xl font-filson-black mb-6"
            style={{ color: 'var(--color-blue, #023467)' }}
          >
            Get In Touch
          </h2>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-gray-700 font-filson-regular text-sm">
              <Phone size={18} className="shrink-0 text-blue-600" />
              <a href={`tel:${contactPhone}`} className="hover:underline">
                {contactPhone}
              </a>
            </li>
            <li className="flex items-center gap-3 text-gray-700 font-filson-regular text-sm">
              <Mail size={18} className="shrink-0 text-blue-600" />
              <a href={`mailto:${contactEmail}`} className="hover:underline">
                {contactEmail}
              </a>
            </li>
            <li className="flex items-start gap-3 text-gray-700 font-filson-regular text-sm">
              <MapPin size={18} className="shrink-0 mt-0.5 text-blue-600" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {address}
              </a>
            </li>
          </ul>

          {/* Social links */}
          <div className="flex gap-4 mt-6">
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="text-blue-700 hover:text-blue-900 transition">
              <FaFacebook size={22} />
            </a>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="text-pink-600 hover:text-pink-800 transition">
              <FaInstagram size={22} />
            </a>
            <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
              className="text-gray-800 hover:text-black transition">
              <FaTiktok size={20} />
            </a>
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
              className="text-red-600 hover:text-red-800 transition">
              <FaYoutube size={22} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
