"use client";

// import FadeCarousel from "@/components/carousel/FadeCarousel";
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import FadeCarousel from './components/carousel/FadeCarousel';
// import QuickQuiz from '@/components/quick-quiz/QuickQuiz';
// import SubcontractorCTA from '@/components/SubcontractorCTA';

export default function Home() {

  const slides = [
    {
      src: "/images/carousel/MourePremier-Carousel-7.webp",
      alt: "Game Day at Moure Premier Soccer League",
      caption: "Game Day at Moure Premier Soccer League"
    },
    {
      src: "/images/carousel/MourePremier-Carousel-9.webp",
      alt: "Game Day in Action at Moure Premier Soccer League",
      caption: "Game Day in Action at Moure Premier Soccer League"
    },
    {
      src: "/images/carousel/MourePremier-Carousel-5.webp",
      alt: `Game Day ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at Moure Premier Soccer League`,
      caption: `Game Day ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at Moure Premier Soccer League`
    },
  ];

  return (
    <main className="bg-[--color-white] text-[--color-black]">
      
      <FadeCarousel
        slidesDesktop={[
          { src: "/images/carousel/desktop/MourePremier-Carousel-7.webp", alt: "Desktop 1" },
          { src: "/images/carousel/desktop/MourePremier-Carousel-9.webp", alt: "Desktop 2" },
          { src: "/images/carousel/desktop/MourePremier-Carousel-5.webp", alt: "Desktop 3" },
        ]}
        slidesMobile={[
          { src: "/images/carousel/mobile/MourePremier-Carousel-Mobile-7.webp", alt: "Mobile 1" },
          { src: "/images/carousel/mobile/MourePremier-Carousel-Mobile-9.webp", alt: "Mobile 2" },
          { src: "/images/carousel/mobile/MourePremier-Carousel-Mobile-5.webp", alt: "Mobile 3" },
        ]}
        interval={5000}
        duration={800}
      />

      {/* Sección 1: Build Your Dream Home */}
      <section className="w-full">
        <div className="w-full relative">
          <div className="">
            <Image 
              src="/home-grass-one.webp"
              alt="Build your dream home with Greenstone"
              width={1800}
              height={100}
              className='w-full min-h-dvh object-cover sm:h-full bg-linear-to-t from-green-600/50 to-transparent'
            />
          </div>
          <div className="absolute top-0 left-0 flex flex-col items-center mt-10 sm:mt-32 ps-0 sm:ps-40">

            <h1 className="uppercase text-2xl text-center sm:text-5xl font-black text-green-600 mb-4 z-10 font-filson-black">
              Build Your Dream Home
            </h1>
            
            <h2 className="text-sm sm:text-xl font-semibold mb-4 text-gray-900 font-filson-regular">
              Your lot or ours — the choice is yours.
            </h2>

            <p className="text-gray-600 text-xs sm:text-xl text-center font-filson-regular max-w-md">
              Build on your own land with our quality and expertise,
              or choose from our available lots in prime locations.
            </p>
            
            <p className='mb-8 text-gray-600 text-xs sm:text-xl text-center font-filson-regular'>
              Either way, we deliver exceptional craftsmanship.
            </p>
            
            <a 
              href="/contact-us"
              className="bg-green-600 font-filson-bold text-white px-8 py-3.5 font-bold shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-300 text-base cursor-pointer rounded-lg"
            >
              Contact Us Today
            </a>
          </div>
        </div>
      </section>

      {/* Sección 1.5: One Builder. All Options. */}
      <section className="w-full bg-white pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full mb-4 font-filson-bold">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 font-filson-black mb-4">
              One Builder. All Options.
            </h2>
            <p className="text-lg text-gray-600 font-filson-regular max-w-3xl mx-auto">
              At Greenstone Homes, we offer three distinct paths to homeownership. Whether you need a home quickly, want some customization, or dream of a fully custom design — we've got you covered.
            </p>
          </div>

          {/* 3 Options Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Move-In Ready */}
            <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <div className="h-48 bg-linear-to-br from-green-500 to-green-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/availables/nevada/Nevada-1.webp')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="absolute top-4 left-4 bg-white text-green-700 text-xs font-bold px-3 py-1 rounded-full font-filson-bold">
                  Fastest Option
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-slate-800 font-filson-black mb-3">
                  Move-In Ready
                </h3>
                <p className="text-gray-500 font-filson-regular mb-6 leading-relaxed">
                  Browse our inventory of completed homes ready for immediate occupancy. Move in within weeks, not months.
                </p>
                <ul className="text-sm text-gray-600 font-filson-regular mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Immediate availability
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Designer-selected finishes
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    No waiting for construction
                  </li>
                </ul>
                <a 
                  href="/building-a-new-home/move-in-ready"
                  className="inline-flex items-center justify-center w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors font-filson-bold"
                >
                  View Available Homes
                  <ChevronRight className="w-5 h-5 ml-2" />
                </a>
              </div>
            </div>

            {/* Semi-Custom */}
            <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <div className="h-48 bg-linear-to-br from-green-600 to-green-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/availables/nevada/Nevada-2.webp')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                </div>
                <span className="absolute top-4 left-4 bg-white text-green-700 text-xs font-bold px-3 py-1 rounded-full font-filson-bold">
                  Most Popular
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-slate-800 font-filson-black mb-3">
                  Semi-Custom
                </h3>
                <p className="text-gray-500 font-filson-regular mb-6 leading-relaxed">
                  Choose from our proven floor plans and personalize your finishes, fixtures, and colors to match your style.
                </p>
                <ul className="text-sm text-gray-600 font-filson-regular mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Pre-approved floor plans
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Personalize finishes & fixtures
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Faster permitting process
                  </li>
                </ul>
                <a 
                  href="/building-a-new-home/semi-custom-homes"
                  className="inline-flex items-center justify-center w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors font-filson-bold"
                >
                  Explore Semi-Custom
                  <ChevronRight className="w-5 h-5 ml-2" />
                </a>
              </div>
            </div>

            {/* Custom */}
            <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <div className="h-48 bg-linear-to-br from-green-700 to-green-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/availables/nevada/Nevada-3.webp')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                </div>
                <span className="absolute top-4 left-4 bg-white text-green-700 text-xs font-bold px-3 py-1 rounded-full font-filson-bold">
                  Full Control
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-slate-800 font-filson-black mb-3">
                  Custom
                </h3>
                <p className="text-gray-500 font-filson-regular mb-6 leading-relaxed">
                  Design your dream home from scratch. Work with our architects to create a completely unique floor plan.
                </p>
                <ul className="text-sm text-gray-600 font-filson-regular mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Fully custom floor plan
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Architectural design support
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Build on your lot or ours
                  </li>
                </ul>
                <a 
                  href="/building-a-new-home/custom-homes"
                  className="inline-flex items-center justify-center w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors font-filson-bold"
                >
                  Start Your Custom Home
                  <ChevronRight className="w-5 h-5 ml-2" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* <section className="max-w-6xl mx-auto py-20 px-4 grid md:grid-cols-2 gap-12 items-center relative">
        
        <div className="order-2 md:order-1 z-10 max-w-lg md:max-w-md">

          <h2 className="absolute uppercase top-24 left-50 text-4xl font-black text-green-600 mb-4 z-10">
            New! Build on Your lot
          </h2>
          
          <h3 className="text-lg font-semibold mb-4 text-gray-900 italic">
            Your dream home,
            wherever you want.
          </h3>

          <p className="mb-8 text-gray-500 text-base">
            We now offer the flexibility to build your
            custom Greenstone Homes on your own land.
            Enjoy our quality and service,
            wherever you choose to live.
          </p>

          <button className="bg-green-600 text-white px-8 py-3.5 font-bold shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-300 text-base cursor-pointer">
            Learn More
          </button>
        </div>
        <div className="order-1 md:order-2 flex justify-center relative">
          <div className="absolute -top-8 -left-8 w-40 h-40 bg-linear-to-br from-[--color-green] to-[--color-green-dark] rounded-full blur-2xl opacity-30"></div>
          <img src="https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80" alt="Build on your lot" className="rounded-3xl shadow-2xl w-full max-w-2xl object-cover border-4 border-white" />
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-linear-to-tr from-[--color-green] to-[--color-green-dark] rounded-full blur-2xl opacity-20 pointer-events-none"></div>
      </section> */}

      {/* Sección 2: Why choose Greenstone Homes? */}
      <section className="w-full bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image Side */}
            <div className="order-2 lg:order-1 relative">
              <div className="relative">
                <div className="absolute -inset-4 bg-green-600/20 rounded-3xl blur-2xl"></div>
                <div className="relative bg-linear-to-br from-green-600 to-green-700 rounded-3xl p-3 shadow-2xl">
                  <img 
                    src="/images/6940 Tia Ct/IMG_7690.webp" 
                    alt="Why choose Greenstone" 
                    className="rounded-2xl w-full object-cover aspect-4/3" 
                  />
                </div>
              </div>
              {/* Stats overlay */}
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-6 hidden md:block">
                <p className="text-4xl font-bold text-green-600 font-filson-black">20+</p>
                <p className="text-gray-600 font-filson-regular text-sm">Years of Experience</p>
              </div>
            </div>

            {/* Content Side */}
            <div className="order-1 lg:order-2">
              <span className="inline-block bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full mb-4 font-filson-bold">
                Why Choose Us
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 font-filson-black mb-6 leading-tight">
                Building Trust, Quality & Value
              </h2>
              <p className="text-lg text-gray-600 font-filson-regular mb-8 leading-relaxed">
                At Greenstone Homes, we don't just build houses—we create homes where families thrive. 
                With over two decades of experience, we've perfected the art of delivering exceptional 
                quality at every stage.
              </p>

              {/* Benefits Grid */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 font-filson-bold">Quality Craftsmanship</h4>
                    <p className="text-sm text-gray-500 font-filson-regular">Built to last with premium materials</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 font-filson-bold">Transparent Pricing</h4>
                    <p className="text-sm text-gray-500 font-filson-regular">No hidden fees or surprises</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 font-filson-bold">Dedicated Support</h4>
                    <p className="text-sm text-gray-500 font-filson-regular">Personal guidance every step</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 font-filson-bold">Warranty Protection</h4>
                    <p className="text-sm text-gray-500 font-filson-regular">Peace of mind guaranteed</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <a 
                  href="/building-a-new-home/the-greenstone-way"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3.5 rounded-lg font-bold shadow-lg hover:bg-green-700 hover:shadow-xl transition-all duration-300 font-filson-bold"
                >
                  Discover The Greenstone Way
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a 
                  href="/our-company/about-us"
                  className="inline-flex items-center gap-2 bg-white text-green-700 border-2 border-green-600 px-6 py-3.5 rounded-lg font-bold hover:bg-green-50 transition-all duration-300 font-filson-bold"
                >
                  About Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subcontractors Opportunities */}
      {/* <section className="my-10">
        <SubcontractorCTA />
      </section> */}

      {/* Sección 3: Homes for Every Stage of Life */}
      <section className="w-full bg-slate-50 py-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-300 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full mb-4 font-filson-bold">
              Your Journey Starts Here
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 font-filson-black mb-4">
              Homes for Every Stage of Life
            </h2>
            <p className="text-lg text-gray-600 font-filson-regular max-w-2xl mx-auto">
              Whether you're buying your first home or making a strategic move, we have the perfect solution for you.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* First Time Buyer */}
            <a href="/building-a-new-home/getting-started" className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-600 transition-colors duration-300">
                <svg className="w-7 h-7 text-green-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-filson-bold mb-2 group-hover:text-green-600 transition-colors">
                First Time Buyer
              </h3>
              <p className="text-gray-500 font-filson-regular text-sm mb-4 leading-relaxed">
                Start your homeownership journey with expert guidance, flexible financing, and homes designed for growing families.
              </p>
              <span className="inline-flex items-center text-green-600 font-bold text-sm font-filson-bold group-hover:gap-2 transition-all">
                Learn More
                <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>

            {/* Moving Up */}
            <a href="/building-a-new-home/custom-homes" className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-600 transition-colors duration-300">
                <svg className="w-7 h-7 text-green-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-filson-bold mb-2 group-hover:text-green-600 transition-colors">
                Moving Up
              </h3>
              <p className="text-gray-500 font-filson-regular text-sm mb-4 leading-relaxed">
                Ready for more space? Upgrade to a larger home with premium features, modern amenities, and room to grow.
              </p>
              <span className="inline-flex items-center text-green-600 font-bold text-sm font-filson-bold group-hover:gap-2 transition-all">
                Explore Options
                <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>

            {/* Downsizing */}
            <a href="/building-a-new-home/semi-custom-homes" className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-600 transition-colors duration-300">
                <svg className="w-7 h-7 text-green-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-filson-bold mb-2 group-hover:text-green-600 transition-colors">
                Downsizing
              </h3>
              <p className="text-gray-500 font-filson-regular text-sm mb-4 leading-relaxed">
                Simplify your life with a thoughtfully designed home that offers comfort, efficiency, and less maintenance.
              </p>
              <span className="inline-flex items-center text-green-600 font-bold text-sm font-filson-bold group-hover:gap-2 transition-all">
                View Homes
                <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>

            {/* Investment */}
            <a href="/building-a-new-home/build-on-your-lot" className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-600 transition-colors duration-300">
                <svg className="w-7 h-7 text-green-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-filson-bold mb-2 group-hover:text-green-600 transition-colors">
                Investment
              </h3>
              <p className="text-gray-500 font-filson-regular text-sm mb-4 leading-relaxed">
                Build wealth through real estate with new construction homes in growing communities with strong ROI potential.
              </p>
              <span className="inline-flex items-center text-green-600 font-bold text-sm font-filson-bold group-hover:gap-2 transition-all">
                Start Investing
                <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <a 
              href="/building-a-new-home/the-greenstone-way"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-lg font-bold shadow-lg hover:bg-green-700 hover:shadow-xl transition-all duration-300 font-filson-bold"
            >
              Discover Your Path to Homeownership
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Sección 4: Your life is our blueprint - Modern Design */}
      <section className="w-full flex flex-col items-center justify-center px-4 banner-green text-center relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-40 h-40 bg-linear-to-tr from-[--color-green] to-[--color-green-dark] rounded-full blur-2xl opacity-20 pointer-events-none"></div>
        <h2 className="text-5xl font-extrabold text-white mb-6 font-filson-black uppercase">
          Your life is our blueprint.
        </h2>
        <p className="text-xl text-white max-w-2xl mx-auto font-filson-regular">
          At Greenstone Homes, we design and build homes that fit your lifestyle, dreams, and future. 
          Your vision guides every step of our process.
        </p>
      </section>

      {/* <QuickQuiz /> */}

    </main>
  );
}
