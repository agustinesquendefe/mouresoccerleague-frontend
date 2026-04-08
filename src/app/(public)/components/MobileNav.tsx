"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { label: "Matches", href: "/matches" },
  { label: "Standings", href: "/standings" },
  { label: "About Us", href: "/about-us" },
  { label: "Contact Us", href: "/contact-us" },
];

export default function MobileNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <button
        className="xl:hidden p-2"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu size={28} style={{ color: 'var(--color-blue, #023467)' }} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-full bg-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--color-blue, #023467)' }}
        >
          <button
            type="button"
            aria-label="Go to homepage"
            onClick={() => { close(); router.push("/"); }}
            className="focus:outline-none cursor-pointer"
          >
            <Image
              src="/Imagotipo-Principal-Vertical-Sin-Fondo-Blanco-MPL.svg"
              alt="Moure Premier League Logo"
              width={90}
              height={55}
              priority
            />
          </button>
          <button onClick={close} aria-label="Close menu" className="text-white hover:text-yellow-400 transition">
            <X size={26} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col px-6 pt-6 gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="font-filson-bold text-base py-4 border-b border-gray-100 flex items-center justify-between hover:text-blue-700 transition"
              style={{ color: 'var(--color-blue, #023467)' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom CTA */}
        <div className="px-6 pb-8 pt-4">
          <Link
            href="/contact-us"
            onClick={close}
            className="w-full block text-center font-filson-black text-sm uppercase tracking-widest text-white py-3 rounded-lg shadow hover:opacity-90 transition"
            style={{ background: 'var(--color-blue, #023467)' }}
          >
            Register My Team
          </Link>
          <Link
            href="/authentication/login"
            onClick={close}
            className="w-full block text-center font-filson-bold text-sm uppercase tracking-widest text-white py-3 rounded-lg mt-2 hover:opacity-90 transition bg-yellow-500 hover:bg-yellow-600"
          >
            Login
          </Link>
        </div>
      </aside>
    </>
  );
}
