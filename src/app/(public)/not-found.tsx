import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-20 text-center bg-white">

      {/* Logo */}
      <Image
        src="/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg"
        alt="Moure Premier League"
        width={100}
        height={100}
        className="mb-8 opacity-80"
      />

      {/* Big 404 */}
      <p
        className="text-8xl md:text-9xl font-filson-black leading-none mb-2"
        style={{ color: 'var(--color-blue, #023467)' }}
      >
        404
      </p>

      {/* Divider */}
      <div
        className="w-16 h-1 rounded-full my-5"
        style={{ background: 'var(--color-yellow, #ffb304)' }}
      />

      <h1 className="text-xl md:text-2xl font-filson-black text-gray-800 mb-3">
        Page not found
      </h1>
      <p className="font-filson-regular text-gray-500 text-sm max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Head back to the home page to continue.
      </p>

      <Link
        href="/"
        className="inline-block font-filson-black text-sm uppercase tracking-widest text-white px-8 py-3 rounded-lg shadow hover:opacity-90 transition"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        Back to Home
      </Link>
    </div>
  );
}
