
"use client";

import Link from "next/link";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { getAppSettings } from '@/services/settings/settings.service';
import type { AppSettings } from '@/models/appSettings';

export default function Footer() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getAppSettings().then((data) => {
      setSettings(data);
    });
  }, []);

  // Fallbacks
  const leagueName = settings?.league_name || "Moure Premier League";
  const logoUrl = settings?.logo_url || "/Imagotipo-Principal-Vertical-Sin-Fondo-Blanco-MPL.svg";
  const facebookUrl = settings?.facebook_url || "#";
  const instagramUrl = settings?.instagram_url || "#";
  const tiktokUrl = settings?.tiktok_url || "#";
  const youtubeUrl = settings?.youtube_url || "#";
  const contactPhone = settings?.contact_phone || "(336) 404-7816";
  const contactEmail = settings?.contact_email || "info@moureleague.com";
  const address = settings?.address || "1760 S Martin Luther King Jr Dr, Winston-Salem, NC 27107";

  return (
    <footer className="font-filson-regular text-white pt-12 pb-6 px-4" style={{ background: 'var(--color-blue, #023467)' }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-10" style={{ borderBottom: '1px solid var(--color-yellow, #ffb304)', paddingBottom: '2.5rem' }}>
        {/* Logo and league name */}
        <div className="flex-1 flex flex-col items-center md:items-start mb-8 md:mb-0">
          <img 
            src={"/Imagotipo-Principal-Vertical-Sin-Fondo-Blanco-MPL.svg"}
            alt={leagueName + " Logo"}
            className="w-48 mb-6"
          />
          <h3 className='text-base font-filson-black' style={{ color: 'var(--color-yellow, #ffb304)' }}>{leagueName}</h3>
        </div>
        {/* Who We Are */}
        <div className="flex-1 flex flex-col items-center md:items-start mb-8 md:mb-0">
          <h3 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-yellow, #ffb304)' }}>Who We Are</h3>
          <ul className="space-y-2 text-lg">
            <li>
              <Link href="/about-us" className="hover:underline">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact-us" className="hover:underline transition">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/contact-us" className="hover:underline">
                FAQs
              </Link>
            </li>
            <li>
              <Link href="/contact-us" className="hover:underline transition">
                Hiring
              </Link>
            </li>
          </ul>
        </div>
        {/* Contact Info */}
        <div className="flex-1 flex flex-col items-center md:items-start">
          <h3 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-yellow, #ffb304)' }}>
            Contact Information
          </h3>
          <div className="mb-2 flex items-center gap-2">
            <a href={`tel:${contactPhone}`} className="hover:underline">
              {contactPhone}
            </a>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <a href={`mailto:${contactEmail}`} className="hover:underline">
              {contactEmail}
            </a>
          </div>
          <div className="mb-2 flex text-sm md:text-base items-center gap-2">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" className="hover:underline">
              {address}
            </a>
          </div>
          <div className="flex gap-3 mt-4">
            <a href={facebookUrl} target="_blank" aria-label="Facebook" className="hover:scale-105 hover:text-yellow-400"><FaFacebook size={23} /></a>
            <a href={instagramUrl} target="_blank" aria-label="Instagram" className="hover:scale-105 hover:text-yellow-400"><FaInstagram size={23} /></a>
            <a href={tiktokUrl} target="_blank" aria-label="TikTok" className="hover:scale-105 hover:text-yellow-400"><FaTiktok size={23} /></a>
            <a href={youtubeUrl} target="_blank" aria-label="YouTube" className="hover:scale-105 hover:text-yellow-400"><FaYoutube size={23} /></a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 pt-6 text-sm" style={{ color: 'var(--color-white)' }}>
        <div className="flex flex-wrap gap-6 mb-2 md:mb-0">
          <Link href="/site-map" className="hover:underline">
            Site Map
          </Link>
          <Link href="/terms-of-use" className="hover:underline">
            Terms of Use
          </Link>
          <Link href="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>
        </div>
        <div className="text-center">© {new Date().getFullYear()} {leagueName}. All Rights Reserved.</div>
      </div>
    </footer>
  );
}
