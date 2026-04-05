import { BarChart2 } from 'lucide-react';
import {
  SPECIALTIES, SPECIALTY_KEYS, SPECIALTY_STYLES,
  POST_LABELS, POST_SPECIALTY,
  getExterneWeeks, MONTH_NAMES,
} from '../schedulerExterne.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computePostCounts(schedule, staff) {
  const counts = Object.fromEntries(
    staff.map(s => [s.id, Object.fromEntries(Object.keys(POST_LABELS).map(pt => [pt, 0]))])
  );
  for (const day of Object.values(schedule)) {
    for (const period of ['morning', 'afternoon']) {
      for (const { type, staffId } of (day[period] ?? [])) {
        if (staffId && counts[staffId]) {
          counts[staffId][type] = (counts[staffId][type] ?? 0) + 1;
        }
      }
    }
  }
  return counts;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function StatsExterne({ schedule, rotation, staff, startDate }) {
  const hasData = Object.keys(schedule).length > 0;
  const weeks   = getExterneWeeks(startDate);

  if (!staff.length) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
        <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
        <p className="text-slate-500">Aucun externe ajouté.</p>
      </div>
    );
  }

  const postCounts = hasData ? computePostCounts(schedule, staff) : null;

  return (
    <div className="space-y-5">

      {/* ── Tableau de rotation ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Rotation des spécialités</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Chaque personne passe dans les 5 spécialités sur 5 semaines (la 6e répète la 1re).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-slate-600 font-semibold text-xs whitespace-nowrap">
                  Semaine
                </th>
                {staff.map(s => (
                  <th key={s.id} className="px-3 py-2.5 text-center text-xs text-slate-500 font-medium whitespace-nowrap">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((weekDays, wi) => {
                const first        = weekDays[0];
                const last         = weekDays[weekDays.length - 1];
                const weekRotation = rotation[wi] ?? {};
                const fmt          = d => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}.`;
                return (
                  <tr key={wi} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      S{wi + 1} — {fmt(first)} – {fmt(last)}
                    </td>
                    {staff.map(s => {
                      const key = weekRotation[s.id];
                      if (!key) return (
                        <td key={s.id} className="px-3 py-2.5 text-center text-slate-200 text-xs">—</td>
                      );
                      const style = SPECIALTY_STYLES[key];
                      return (
                        <td key={s.id} className="px-3 py-2.5 text-center">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                            {SPECIALTIES[key].label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Postes effectués ── */}
      {hasData && postCounts ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Postes effectués sur 6 semaines</h3>
          </div>

          {/* Groupé par spécialité */}
          {SPECIALTY_KEYS.map(spKey => {
            const sp    = SPECIALTIES[spKey];
            const style = SPECIALTY_STYLES[spKey];
            return (
              <div key={spKey} className="border-b border-slate-100 last:border-0">
                <div className={`px-4 py-1.5 ${style.bg} border-b ${style.border}`}>
                  <span className={`text-xs font-semibold ${style.text}`}>{sp.label}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <th className="text-left px-4 py-1.5 text-xs text-slate-500 font-medium w-40">Poste</th>
                        {staff.map(s => (
                          <th key={s.id} className="px-3 py-1.5 text-center text-xs text-slate-500 font-medium whitespace-nowrap">
                            {s.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sp.posts.map(pt => (
                        <tr key={pt} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-1.5 text-xs text-slate-600">{POST_LABELS[pt]}</td>
                          {staff.map(s => {
                            const count = postCounts[s.id]?.[pt] ?? 0;
                            return (
                              <td key={s.id} className="px-3 py-1.5 text-center">
                                {count > 0 ? (
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${style.bg} ${style.text}`}>
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-slate-200 text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-slate-400 text-sm italic">
            Générez le planning pour voir les postes effectués.
          </p>
        </div>
      )}
    </div>
  );
}
