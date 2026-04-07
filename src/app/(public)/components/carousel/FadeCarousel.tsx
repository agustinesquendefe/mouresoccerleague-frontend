"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";


export interface Slide {
  src: string;
  alt?: string;
  caption?: string;
}


interface FadeCarouselProps {
  slides?: Slide[];
  slidesDesktop?: Slide[];
  slidesMobile?: Slide[];
  interval?: number; // ms
  duration?: number; // transition duration in ms
  pauseOnHover?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
}


export default function FadeCarousel({
  slides,
  slidesDesktop,
  slidesMobile,
  interval = 5000,
  duration = 700,
  pauseOnHover = true,
  showControls = true,
  showIndicators = true,
  className = "",
}: FadeCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Select slides based on device
  let activeSlides: Slide[] = slides || [];
  if (slidesDesktop || slidesMobile) {
    activeSlides = isMobile ? (slidesMobile || slides || []) : (slidesDesktop || slides || []);
  }

  const next = () => setIndex((i) => (i + 1) % activeSlides.length);
  const prev = () => setIndex((i) => (i - 1 + activeSlides.length) % activeSlides.length);
  const goTo = (i: number) => setIndex(() => (i + activeSlides.length) % activeSlides.length);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    if (!paused && activeSlides.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setIndex((i) => (i + 1) % activeSlides.length);
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [paused, interval, activeSlides.length]);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlides.length]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Slides - stacked */}
      <div className="relative w-full min-h-dvh">
        {activeSlides.map((s, i) => {
          const isActive = i === index;
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity ease-in-out`}
              style={{
                opacity: isActive ? 1 : 0,
                transitionDuration: `${duration}ms`,
                pointerEvents: isActive ? "auto" : "none",
              }}
              aria-hidden={!isActive}
            >
              <img
                src={s.src}
                alt={s.alt ?? `Slide ${i + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
                width={3200}
                height={100}
              />
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {showControls && activeSlides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && activeSlides.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
          {activeSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-3 h-3 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}

      {/* Live region for screen readers */}
      <div className="sr-only" aria-live="polite">
        Slide {index + 1} of {activeSlides.length}
      </div>
    </div>
  );
}