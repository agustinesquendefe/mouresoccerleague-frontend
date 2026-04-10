import type { StandingRow } from '@/services/standings/getEventStandings';
import type { Event } from '@/models/event';
import Link from 'next/link';

type StandingsCardProps = {
  event: Event;
  standings: StandingRow[];
};

export default function StandingsCard({ event, standings }: StandingsCardProps) {
  return (
    <div className="flex flex-col border border-red-600 bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <p className="text-sm font-filson-bold text-gray-900 truncate">{event.name}</p>
        <p className="text-xs font-filson-regular text-gray-400 mt-0.5">Standings</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white font-filson-bold uppercase bg-red-600">
              <th className="px-4 py-2 text-left w-6">#</th>
              <th className="px-2 py-2 text-left">Team</th>
              <th className="px-2 py-2 text-center">MP</th>
              <th className="px-2 py-2 text-center">W</th>
              <th className="px-2 py-2 text-center">D</th>
              <th className="px-2 py-2 text-center">L</th>
              <th className="px-2 py-2 text-center">GD</th>
              <th className="px-3 py-2 text-center font-filson-black text-white">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400 font-filson-regular text-xs">
                  No standings data available yet.
                </td>
              </tr>
            ) : (
              standings.map((row, i) => (
                <tr
                  key={row.team_id}
                  className={`border-t border-gray-50 ${i < 4 ? 'bg-blue-50/40' : ''}`}
                >
                  <td className="px-4 py-2 text-xs text-gray-400 font-filson-regular">{i + 1}</td>
                  <td className="px-2 py-2 font-filson-bold text-gray-800 text-xs truncate max-w-30">
                    {row.team_name}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-600 font-filson-regular">{row.played}</td>
                  <td className="px-2 py-2 text-center text-xs text-gray-600 font-filson-regular">{row.won}</td>
                  <td className="px-2 py-2 text-center text-xs text-gray-600 font-filson-regular">{row.drawn}</td>
                  <td className="px-2 py-2 text-center text-xs text-gray-600 font-filson-regular">{row.lost}</td>
                  <td className="px-2 py-2 text-center text-xs text-gray-600 font-filson-regular">
                    {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-filson-black text-gray-900">{row.points}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer button */}
      <div className="px-5 py-4  mt-auto border-t border-t-red-100">
        <Link
          href={`/standings`}
          className="block w-full text-center text-sm font-filson-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          See full standings →
        </Link>
      </div>
    </div>
  );
}
