"use client";


import Link from "next/link";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import Image from "next/image";
import MobileNav from "./MobileNav";
import { useRouter } from "next/navigation";
import { NotebookPen, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { getAppSettings } from '@/services/settings/settings.service';
import type { AppSettings } from '@/models/appSettings';

export default function Header() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  // Fallbacks
  const leagueName = settings?.league_name || "Moure Premier League";
  const logoUrl = settings?.logo_url || "/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg";
  const facebookUrl = settings?.facebook_url || "#";
  const instagramUrl = settings?.instagram_url || "#";
  const tiktokUrl = settings?.tiktok_url || "#";
  const youtubeUrl = settings?.youtube_url || "#";
  const contactPhone = settings?.contact_phone || "(336) 404-7816";
  const contactEmail = settings?.contact_email || "info@moureleague.com";

  if (loading) {
    return (
      <header className="w-full shadow relative z-999 flex items-center justify-center min-h-20" style={{ background: 'var(--color-blue, #023467)' }}>
        <span className="text-white text-sm">Loading...</span>
      </header>
    );
  }

  return (
    <header className="w-full shadow relative z-999" style={{ background: 'var(--color-blue, #023467)' }}>

      {/* Logo Desktop: centrado arriba, clickable */}
      <div className="hidden xl:flex left-0 top-0 absolute" style={{ background: 'var(--color-white)' , boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' , padding: '1rem 1.5rem 1.25rem 1.5rem', zIndex: 999 }}>
        <button
          type="button"
          aria-label="Go to homepage"
          onClick={() => router.push("/")}
          className="focus:outline-none cursor-pointer"
        >
          <Image 
            src={logoUrl}
            alt={leagueName + " Logo"}
            width={160}
            height={100}
            priority
          />
        </button>
      </div>

      {/* Logo Mobile/Tablet: fijo arriba izquierda, menú a la derecha, clickable */}
      <div className="xl:hidden absolute top-0 left-0 w-full flex items-center justify-between bg-transparent">
        <div className="px-5 py-2" style={{ background: 'var(--color-white)', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)', zIndex: 999 }}>
          <button
            type="button"
            aria-label="Go to homepage"
            onClick={() => router.push("/")}
            className="focus:outline-none w-26 cursor-pointer"
          >
            <Image 
              src={logoUrl}
              alt={leagueName + " Logo"}
              width={120}
              height={100}
              priority
            />
          </button>
        </div>
        <div className="mt-7 w-full flex justify-end py-4 pe-2" style={{ background: 'var(--color-white)', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)', zIndex: 999 }}>
          <MobileNav />
        </div>
      </div>

      {/* Top bar */}
      <div className="text-white text-sm w-full relative z-998 top-0 left-0 right-0 font-filson-regular" style={{ background: 'var(--color-blue, #023467)' }}>
        
        {/* Mobile: phone only */}
        <div className="flex sm:hidden items-center justify-end gap-2">
            <Link 
                href={"/authentication/login"} 
                className="font-semibold transition text-white px-4 py-2 bg-yellow-500 hover:bg-yellow-600"
            >
                Login
            </Link>
        </div>

        {/* Desktop: full topbar */}
        <div className="w-full hidden sm:flex justify-end items-center px-4 gap-4">
          <div className="flex gap-4 items-center">
            <a href={facebookUrl} target="_blank" aria-label="Facebook" className="hover:scale-105 hover:text-yellow-400"><FaFacebook size={18} /></a>
            <a href={instagramUrl} target="_blank" aria-label="Instagram" className="hover:scale-105 hover:text-yellow-400"><FaInstagram size={18} /></a>
            <a href={tiktokUrl} target="_blank" aria-label="TikTok" className="hover:scale-105 hover:text-yellow-400"><FaTiktok size={16} /></a>
            <a href={youtubeUrl} target="_blank" aria-label="YouTube" className="hover:scale-105 hover:text-yellow-400"><FaYoutube size={18} /></a>
          </div>
          <div className="flex items-center">
            <Link href={"/authentication/login"} className="font-semibold px-4 py-3 transition text-white bg-yellow-500 hover:bg-yellow-600">Login</Link>
          </div>
        </div>

      </div>

      {/* Main nav */}
      <div className="z-998 relative" style={{ background: 'var(--color-white)', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}>
        <div className="w-full font-filson-regular text-sm mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between px-4 py-4 gap-4">
          
          {/* Spacer invisible - mismo ancho que el botón Schedule para centrar los tabs */}
          <div className="hidden xl:flex invisible">
            <span className="whitespace-nowrap px-6 py-3 text-sm flex items-center gap-2">
              <NotebookPen size={24}/>
              Register My Team
            </span>
          </div>

          {/* Desktop nav - Tabs centrados */}
          <nav className="hidden xl:flex flex-col xl:flex-row xl:items-center xl:justify-center gap-2 xl:gap-10 relative">

            <div className="relative group">
              <Link href="/building-a-new-home/build-on-your-lot" className="whitespace-nowrap uppercase -tracking-tight font-medium text-brand-black hover:text-brand-green px-2 py-1 hover:text-red-600">
                Leagues
              </Link>
            </div>
            
            <div className="relative group">
              <Link href="/building-a-new-home/build-on-your-lot" className="whitespace-nowrap uppercase -tracking-tight font-medium text-brand-black hover:text-brand-green px-2 py-1 hover:text-red-600">
                Classes
              </Link>
            </div>

            <div className="relative group">
              <Link href="/building-a-new-home/build-on-your-lot" className="whitespace-nowrap uppercase -tracking-tight font-medium text-brand-black hover:text-brand-green px-2 py-1 hover:text-red-600">
                Schedule
              </Link>
            </div>

            <div className="relative group">
              <Link href="/our-company/about-us" className="whitespace-nowrap uppercase -tracking-tight font-medium text-brand-black hover:text-brand-green px-2 py-1 hover:text-red-600">
                About Us
              </Link>
            </div>

            <div className="relative group">
              <Link href="/our-company/about-us" className="whitespace-nowrap uppercase -tracking-tight font-medium text-brand-black hover:text-brand-green px-2 py-1 hover:text-red-600">
                Contact Us
              </Link>
            </div>
          </nav>

          {/* Schedule button - positioned to the right */}
          <div className="hidden xl:flex">
            <Link
              href="/contact-us"
              className="whitespace-nowrap cursor-pointer bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 text-sm rounded shadow uppercase tracking-widest flex items-center gap-2"
            >
              <NotebookPen size={24}/>
              Register My Team
            </Link>
          </div>
          
        </div>
      </div>

    </header>
  );
}
