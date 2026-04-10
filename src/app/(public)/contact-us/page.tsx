import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { getAppSettings } from '@/services/settings/settings.service';
import ContactForm from './ContactForm';

export const metadata = {
  title: 'Contact Us | Moure Premier Soccer League',
  description: 'Get in touch with Moure Premier Soccer League. Find our contact info, location, and send us a message.',
};

export default async function ContactUsPage() {
  const settings = await getAppSettings();

  const leagueName = settings?.league_name || 'Moure Premier League';
  const facebookUrl = settings?.facebook_url || '#';
  const instagramUrl = settings?.instagram_url || '#';
  const tiktokUrl = settings?.tiktok_url || '#';
  const youtubeUrl = settings?.youtube_url || '#';
  const contactPhone = settings?.contact_phone || '(336) 404-7816';
  const contactPhone2 = settings?.contact_phone2 || null;
  const contactEmail = settings?.contact_email || 'info@moureleague.com';
  const address = settings?.address || '1760 S Martin Luther King Jr Dr, Winston-Salem, NC 27107';

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

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
        <h1 className="text-3xl md:text-5xl font-filson-black text-white mb-4">Contact Us</h1>
        <p className="text-blue-200 font-filson-regular text-base max-w-xl mx-auto">
          Questions? Registrations? We'd love to hear from you.
        </p>
      </div>

      {/* Main content */}
      <section className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <h2
              className="text-xl font-filson-black mb-1"
              style={{ color: 'var(--color-blue, #023467)' }}
            >
              Send Us a Message
            </h2>
            <p className="text-gray-400 font-filson-regular text-sm mb-6">
              Fill out the form and we'll get back to you as soon as possible.
            </p>
            <ContactForm toEmail={contactEmail ?? 'info@moureleague.com'} />
          </div>

          {/* Contact Info */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
              <h2
                className="text-xl font-filson-black mb-6"
                style={{ color: 'var(--color-blue, #023467)' }}
              >
                Contact Information
              </h2>
              <ul className="space-y-5">
                <li className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-blue, #023467)' }}
                  >
                    <Phone size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-filson-bold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
                    <a
                      href={`tel:${contactPhone}`}
                      className="font-filson-regular text-gray-800 text-sm hover:underline"
                    >
                      {contactPhone}
                    </a>
                    {contactPhone2 && (
                      <a
                        href={`tel:${contactPhone2}`}
                        className="font-filson-regular text-gray-800 text-sm hover:underline block mt-0.5"
                      >
                        {contactPhone2}
                      </a>
                    )}
                  </div>
                </li>
                <li className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-blue, #023467)' }}
                  >
                    <Mail size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-filson-bold text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-filson-regular text-gray-800 text-sm hover:underline"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-blue, #023467)' }}
                  >
                    <MapPin size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-filson-bold text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-filson-regular text-gray-800 text-sm hover:underline"
                    >
                      {address}
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-blue, #023467)' }}
                  >
                    <Clock size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-filson-bold text-gray-400 uppercase tracking-wide mb-0.5">Office Hours</p>
                    <p className="font-filson-regular text-gray-800 text-sm">Mon – Fri, 9:00 AM – 6:00 PM</p>
                  </div>
                </li>
              </ul>

              {/* Social links */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs font-filson-bold text-gray-400 uppercase tracking-wide mb-3">Follow Us</p>
                <div className="flex gap-4">
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
            </div>

            {/* Map embed */}
            <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100 h-64">
              <iframe
                src={mapsEmbedUrl}
                className="w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="League location map"
              />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
