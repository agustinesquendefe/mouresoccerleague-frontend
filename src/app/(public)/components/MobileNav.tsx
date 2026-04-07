"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Menu, X } from "lucide-react";
// import SearchHomesDropdown from "./SearchHomesDropdown";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function MobileNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleTab = (tab: string) => {
    setActiveTab(tab);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setActiveTab(null);
  };

  return (
    <>
      <button
        className="xl:hidden p-2 text-brand-black"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu size={28} className="text-red-600" />
      </button>
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={close}
          style={{ opacity: open ? 1 : 0 }}
        />
      )}
      <aside 
        className={`fixed inset-y-0 right-0 z-50 w-full bg-white flex flex-col font-filson-bold transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
            {/* X always visible in top right, floating above all */}
            <button
              onClick={close}
              aria-label="Close menu"
              className="absolute top-4 right-4 z-50 p-2 transition text-red-600 hover:text-red-800"
            >
              <X size={25} />
            </button>
            <div className="flex justify-between items-center p-4">
              <span className="text-xl font-bold text-brand-black hidden">Menu</span>
              {/* Spacer for X */}
              <span className="w-8 h-8" />
            </div>
            <div className="relative flex-1 overflow-hidden">
              {/* Main menu */}
              <div className={`absolute inset-0 transition-transform duration-300 ${activeTab ? 'translate-x-[-100vw]' : 'translate-x-0'}`} style={{willChange:'transform'}}>
                <nav className="flex-1 flex flex-col gap-6 p-8 text-lg">
                  <button onClick={() => handleTab("ways-to-build")}
                    className="text-left flex items-center justify-between capitalize border-b pb-5 border-b-red-600 font-medium text-brand-black hover:text-brand-red">
                    <span>Ways to Build</span>
                    <ChevronRight size={30} className="text-red-600"/>
                  </button>
                  <button onClick={() => handleTab("properties")}
                    className="text-left flex items-center justify-between capitalize border-b pb-5 border-b-red-600 font-medium text-brand-black hover:text-brand-red">
                    <span>Properties</span>
                    <ChevronRight size={30} className="text-red-600"/>
                  </button>

                  <Link href="/building-a-new-home/build-on-your-lot" onClick={close}
                    className="text-left flex items-center justify-between capitalize border-b pb-5 border-b-red-600 font-medium text-brand-black hover:text-brand-red">
                    <span>Floorplans</span>
                    <ChevronRight size={30} className="text-red-600"/>
                  </Link>
                  
                  <button onClick={() => handleTab("gallery")}
                    className="text-left flex items-center justify-between capitalize border-b pb-5 border-b-red-600 font-medium text-brand-black hover:text-brand-red">
                    <span>Portfolio</span>
                    <ChevronRight size={30} className="text-red-600"/>
                  </button>

                  <Link href="/building-a-new-home/the-redstone-way" onClick={close}
                    className="text-left flex items-center justify-between capitalize border-b pb-5 border-b-red-600 font-medium text-brand-black hover:text-brand-red">
                    <span>Our Process</span>
                    <ChevronRight size={30} className="text-red-600"/>
                  </Link>

                  <Link href="/our-company/about-us" onClick={close}
                    className="text-left flex items-center justify-between capitalize border-b pb-5 border-b-red-600 font-medium text-brand-black hover:text-brand-red">
                    <span>About Us</span>
                    <ChevronRight size={30} className="text-red-600"/>
                  </Link>

                  <Link href="/contact-us" onClick={close}
                    className="text-left flex items-center justify-between capitalize border-b pb-5 border-b-red-600 font-medium text-brand-black hover:text-brand-red">
                    <span>Contact Us</span>
                    <ChevronRight size={30} className="text-red-600"/>
                  </Link>

                  <div className="text-center mt-20">
                    <button
                      type="button"
                      aria-label="Go to homepage"
                      onClick={() => router.push("/")}
                      className="focus:outline-none cursor-pointer"
                    >
                      <Image 
                        src="/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg"
                        alt="Moure Premier League Logo"
                        width={200}
                        height={100}
                        priority
                      />
                    </button>
                  </div>
                </nav>
              </div>
              {/* Tab content with slide-in from right */}
              <div className={`absolute inset-0 bg-white transition-transform duration-300 ${activeTab ? 'translate-x-0' : 'translate-x-[100vw]'}`} style={{willChange:'transform'}}>
                <div className="flex items-center gap-2 p-4 border-b border-b-red-600">
                  <button onClick={() => setActiveTab(null)} aria-label="Back to menu" className="text-brand-black">
                    <ChevronLeft size={28} className="text-red-600"/>
                  </button>
                  <span className="text-lg font-medium capitalize text-brand-black">
                    {activeTab === "search" && "Search Our Homes"}
                    {activeTab === "ways-to-build" && "Ways to Build"}
                    {activeTab === "properties" && "Properties"}
                    {activeTab === "gallery" && "Gallery"}
                    {activeTab === "building" && "Building a New Home"}
                    {activeTab === "company" && "Our Company"}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative w-full">
                  {/* {activeTab === "search" && <SearchHomesDropdown />} */}
                  {activeTab === "ways-to-build" && (
                    <div className="w-full max-w-md mx-auto p-0">
                      <div className="flex flex-col px-4 pb-4">
                        <Link href="/building-a-new-home/move-in-ready" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Move-In-Ready Homes</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/semi-custom-homes" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Semi-Custom Homes</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <button onClick={() => setActiveTab("custom-homes-submenu")} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition w-full text-left">
                          <span>Custom Homes</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === "properties" && (
                    <div className="w-full max-w-md mx-auto p-0">
                      <div className="flex flex-col px-4 pb-4">
                        <Link href="/available-homes" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Available Homes</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/available-lots" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Available Lots</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/communities" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Communities</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                      </div>
                    </div>
                  )}
                  {activeTab === "custom-homes-submenu" && (
                    <div className="w-full max-w-md mx-auto p-0">
                      <div className="flex flex-col px-4 pb-4">
                        <div className="flex items-center gap-2 mb-4">
                          <button onClick={() => setActiveTab("ways-to-build")} aria-label="Back to Ways to Build" className="text-brand-black">
                            <ChevronLeft size={24} className="text-red-600" />
                          </button>
                          <span className="text-lg font-medium capitalize text-brand-black">Custom Homes</span>
                        </div>
                        <Link href="/available-lots" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Build On Our Lot</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/build-on-your-lot" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Build On Your Lot</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                      </div>
                    </div>
                  )}
                  {activeTab === "gallery" && (
                    <div className="w-full max-w-md mx-auto p-0">
                      <div className="flex flex-col px-4 pb-4">
                        <Link href="/gallery/inspiration" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Inspiration Gallery</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        {/* <Link href="/gallery/virtual-tour" onClick={close} className="flex items-center justify-between border-b border-green-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-green transition">
                          <span>Virtual Tour Gallery</span>
                          <ChevronRight size={24} className="text-green-600" />
                        </Link> */}
                      </div>
                    </div>
                  )}
                  {activeTab === "building" && (
                    <div className="w-full max-w-md mx-auto p-0">
                      <div className="flex flex-col px-4 pb-4">
                        <Link href="/building-a-new-home/getting-started" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Getting Started</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/the-greenstone-way" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>The Greenstone Way</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/move-in-ready" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Move-In-Ready Homes</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/semi-custom-homes" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Semi-Custom Homes</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/custom-homes" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Custom Homes</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/financing" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Financing</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/build-on-your-lot" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Build on Your Lot</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/building-a-new-home/specials-promotions" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Specials & Promotions</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                      </div>
                    </div>
                  )}
                  {activeTab === "company" && (
                    <div className="w-full max-w-md mx-auto p-0">
                      <div className="flex flex-col px-4 pb-4">
                        <Link href="/our-company/about-us" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>About Us</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/our-company/our-history" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Our History</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/our-company/awards-honors" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Awards & Honors</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/our-company/greenstone-gives-back" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Greenstone Gives Back</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/our-company/videos" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Videos</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/our-company/events" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Events</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                        <Link href="/our-company/careers" onClick={close} className="flex items-center justify-between border-b border-red-600 px-2 py-4 font-semibold text-brand-black hover:text-brand-red transition">
                          <span>Careers</span>
                          <ChevronRight size={24} className="text-red-600" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Removed duplicate tab content block. Only one tab content block remains, with full links and design. */}
            </div>
          </aside>
     </>
  );
}
