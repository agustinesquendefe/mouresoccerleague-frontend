import Link from 'next/link';
import { CalendarCheck, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { getAppSettings } from '@/services/settings/settings.service';
import ReserveAvailabilityForm from './ReserveAvailabilityForm';

export const metadata = {
  title: 'Reserve a Field | Moure Premier Soccer League',
  description: 'Request field availability for private soccer reservations.',
};

export default async function ReservePage() {
  const settings = await getAppSettings();

  const leagueName = settings?.league_name || 'Moure Premier League';
  const contactPhone = settings?.contact_phone || '(336) 404-7816';
  const contactPhone2 = settings?.contact_phone2 || null;
  const contactEmail = settings?.contact_email || 'info@moureleague.com';
  const address = settings?.address || '1760 S Martin Luther King Jr Dr, Winston-Salem, NC 27107';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <main className="min-h-screen bg-white text-brand-black">
      <section
        className="w-full px-4 py-16 md:py-20"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        <div className="container mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-widest text-blue-200 font-filson-regular mb-3">
            {leagueName}
          </p>
          <h1 className="text-3xl md:text-5xl font-filson-black text-white max-w-3xl">
            Reserve a Field
          </h1>
          <p className="text-blue-100 font-filson-regular text-base md:text-lg max-w-2xl mt-4">
            Field reservations are available for people outside active teams and events when the field schedule is open and does not conflict with league matches.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <a
              href={`tel:${contactPhone}`}
              className="inline-flex items-center justify-center gap-2 rounded bg-red-500 px-6 py-3 text-sm font-filson-black uppercase tracking-widest text-white hover:bg-red-600 transition"
            >
              <Phone size={18} />
              Call to Reserve
            </a>
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent('Field reservation request')}`}
              className="inline-flex items-center justify-center gap-2 rounded border border-white/40 px-6 py-3 text-sm font-filson-black uppercase tracking-widest text-white hover:bg-white/10 transition"
            >
              <Mail size={18} />
              Email Request
            </a>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ReserveAvailabilityForm
              contactEmail={contactEmail}
              contactPhone={contactPhone}
            />

            <div className="border border-gray-100 rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-filson-black mb-3" style={{ color: 'var(--color-blue, #023467)' }}>
                How field reservations work
              </h2>
              <p className="text-gray-600 font-filson-regular">
                Reservations are confirmed directly with the company. Before approving a reservation, the team checks field availability and makes sure the requested time does not overlap with any scheduled event match.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: CalendarCheck,
                  title: 'Request a time',
                  text: 'Share your preferred date, time, field format, and reservation length.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Availability check',
                  text: 'The company confirms the field is free and does not conflict with event matches.',
                },
                {
                  icon: Phone,
                  title: 'Confirm directly',
                  text: 'Final details, price, and reservation rules are handled by phone or email.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="border border-gray-100 rounded-lg p-5 shadow-sm">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: 'var(--color-blue, #023467)' }}
                    >
                      <Icon size={18} className="text-white" />
                    </div>
                    <h3 className="font-filson-black text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 font-filson-regular">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="border border-gray-100 rounded-lg p-6 shadow-sm h-fit">
            <h2 className="text-xl font-filson-black mb-4" style={{ color: 'var(--color-blue, #023467)' }}>
              Contact
            </h2>
            <div className="space-y-4 text-sm">
              <a href={`tel:${contactPhone}`} className="flex items-center gap-3 text-gray-800 hover:underline">
                <Phone size={18} />
                <span>{contactPhone}</span>
              </a>
              {contactPhone2 ? (
                <a href={`tel:${contactPhone2}`} className="flex items-center gap-3 text-gray-800 hover:underline">
                  <Phone size={18} />
                  <span>{contactPhone2}</span>
                </a>
              ) : null}
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-gray-800 hover:underline">
                <Mail size={18} />
                <span>{contactEmail}</span>
              </a>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-gray-800 hover:underline">
                <MapPin size={18} className="mt-0.5 shrink-0" />
                <span>{address}</span>
              </a>
            </div>
            <Link
              href="/contact-us"
              className="mt-6 block text-center rounded px-5 py-3 text-sm font-filson-black uppercase tracking-widest text-white hover:opacity-90 transition"
              style={{ background: 'var(--color-blue, #023467)' }}
            >
              Contact Page
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
