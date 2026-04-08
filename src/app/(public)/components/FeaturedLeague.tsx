// "use client";

// import Image from 'next/image';
// import { ChevronRight } from 'lucide-react';
// import UpcomingMatches from './dashboard/UpcomingMatches';
// import type { Event } from '@/models/event';

// interface FeaturedLeagueProps {
//   events: Event;
// }

// export default function FeaturedLeague({ events }: FeaturedLeagueProps) {
//   return (
//     <section className="container mx-auto px-2 md:px-0 py-8">
//       <div className="flex flex-col lg:flex-row gap-6">
//         {/* Imagen de la liga/evento */}
//         <div className="flex-1 rounded-3xl overflow-hidden shadow-lg">
//           <Image
//             src={"/images/carousel/desktop/MourePremier-Carousel-7.webp"}
//             alt={events.length > 0 ? events[0].name : "Liga"}
//             width={900}
//             height={500}
//             className="w-full h-full object-cover"
//             priority
//           />
//           <div className="bg-[#2d1a4a] p-6 rounded-b-3xl">
//             <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 font-filson-black">{events.length > 0 ? events[0].name : 'Liga'}</h1>
//             <p className="text-white/80 text-base md:text-lg font-filson-regular">Inicio: {events.length > 0 ? events[0].start_date : 'N/A'}</p>
//           </div>
//         </div>
//         {/* Próximos partidos de la liga/evento */}
//         <div className="w-full lg:w-105w shrink-0 bg-white rounded-3xl shadow-lg p-6 flex flex-col">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="text-xl font-bold font-filson-bold text-slate-800">Próximos Partidos</h2>
//             <a href={`/leagues/${events.length > 0 ? events[0].id : ''}/schedule`} className="inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:underline px-3 py-1 rounded-full bg-primary-50 hover:bg-primary-100 transition">
//               Ver todos
//               <ChevronRight size={18} />
//             </a>
//           </div>
//           <UpcomingMatches events={events} compact />
//         </div>
//       </div>
//     </section>
//   );
// }
