import { BarChart2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { MONTH_NAMES, getWeekdays, DAY_TEMPLATES, formatDate } from '../scheduler.js';
import { ROLE_LABEL, ROLE_STYLE } from './StaffManager.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORIES = ['scanner', 'irm', 'echo', 'rcp', 'avis', 'total'];
const LABELS     = { scanner: 'Scanner', irm: 'IRM', echo: 'Écho', rcp: 'RCP', avis: 'Avis', total: 'Total' };
const CAT_STYLES = {
  scanner: 'text-blue-600',
  irm:     'text-violet-600',
  echo:    'text-emerald-600',
  rcp:     'text-orange-600',
  avis:    'text-amber-600',
  total:   'text-slate-700',
};

function colStats(staff, workloads, cat) {
  const vals = staff.map(s => workloads[s.id]?.[cat] ?? 0);
  const sum  = vals.reduce((a, b) => a + b, 0);
  return {
    avg: staff.length ? sum / staff.length : 0,
    min: Math.min(...vals),
    max: Math.max(...vals),
  };
}

function cellBg(value, { avg, min, max }) {
  if (max === min) return 'bg-slate-50 text-slate-700';
  const z = (value - avg) / ((max - min) / 2 || 1);
  if (z >  0.6) return 'bg-red-50  text-red-700  font-semibold';
  if (z < -0.6) return 'bg-green-50 text-green-700';
  return 'bg-slate-50 text-slate-600';
}

function TrendIcon({ value, avg }) {
  if (Math.abs(value - avg) < 0.5) return <Minus className="w-3 h-3 text-slate-300" />;
  return value > avg
    ? <TrendingUp   className="w-3 h-3 text-red-400"   />
    : <TrendingDown className="w-3 h-3 text-green-400" />;
}

// ─── Expected totals for the month ───────────────────────────────────────────
function computeMonthExpected(year, month) {
  const weekdays = getWeekdays(year, month);
  const totals   = { scanner: 0, irm: 0, echo: 0, rcp: 0, avis: weekdays.length };
  for (const day of weekdays) {
    const tmpl = DAY_TEMPLATES[day.getDay()];
    [...tmpl.morning, ...tmpl.afternoon].forEach(t => {
      totals[t.toLowerCase()] = (totals[t.toLowerCase()] ?? 0) + 1;
    });
  }
  totals.total = totals.scanner + totals.irm + totals.echo + totals.rcp;
  return totals;
}

// ─── Mini bar (relative fill) ─────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const BAR_COLORS = {
  scanner: 'bg-blue-400',
  irm:     'bg-violet-400',
  echo:    'bg-emerald-400',
  rcp:     'bg-orange-400',
  avis:    'bg-amber-400',
  total:   'bg-slate-400',
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function Stats({ workloads, staff, year, month }) {
  const hasData    = Object.keys(workloads).length > 0;
  const expected   = computeMonthExpected(year, month);
  const statsCache = Object.fromEntries(
    CATEGORIES.map(cat => [cat, colStats(staff, workloads, cat)])
  );

  if (!staff.length) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
        <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
        <p className="text-slate-500">Aucun personnel ajouté.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Expected totals card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Postes prévus — {MONTH_NAMES[month - 1]} {year}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => (
            <div key={cat} className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
              <p className={`text-2xl font-bold ${CAT_STYLES[cat]}`}>{expected[cat]}</p>
              <p className="text-xs text-slate-500 mt-0.5">{LABELS[cat]}</p>
              {staff.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  ~{(expected[cat] / staff.length).toFixed(1)} / pers.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-person table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Répartition par membre</h3>
          {!hasData && (
            <span className="text-xs text-slate-400 italic">
              Générez le planning pour voir les données
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-slate-600 font-semibold text-xs whitespace-nowrap">
                  Membre
                </th>
                <th className="px-3 py-2.5 text-slate-500 font-medium text-xs">Rôle</th>
                {CATEGORIES.map(cat => (
                  <th key={cat}
                      className={`px-3 py-2.5 text-center text-xs font-semibold whitespace-nowrap ${CAT_STYLES[cat]}`}>
                    {LABELS[cat]}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {staff.map((person, idx) => (
                <tr key={person.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors
                                ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  {/* Name */}
                  <td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700
                                      flex items-center justify-center text-[11px] font-bold shrink-0">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      {person.name}
                    </div>
                  </td>

                  {/* Role badge */}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_STYLE[person.role]?.badge ?? 'bg-slate-100 text-slate-600'}`}>
                      {ROLE_LABEL[person.role] ?? person.role}
                    </span>
                  </td>

                  {/* Stats cells */}
                  {CATEGORIES.map(cat => {
                    const val  = workloads[person.id]?.[cat] ?? 0;
                    const stat = statsCache[cat];
                    return (
                      <td key={cat} className="px-3 py-2 text-center">
                        {hasData ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm rounded px-1.5 py-0.5 ${cellBg(val, stat)}`}>
                              {val}
                            </span>
                            <TrendIcon value={val} avg={stat.avg} />
                            <MiniBar value={val} max={stat.max} color={BAR_COLORS[cat]} />
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Averages footer */}
            {hasData && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={2}
                      className="px-4 py-2 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                    Moyenne
                  </td>
                  {CATEGORIES.map(cat => (
                    <td key={cat} className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
                      {statsCache[cat].avg.toFixed(1)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={2}
                      className="px-4 py-1.5 text-xs text-slate-400 font-medium">
                    Écart (min – max)
                  </td>
                  {CATEGORIES.map(cat => {
                    const { min, max } = statsCache[cat];
                    return (
                      <td key={cat} className="px-3 py-1.5 text-center text-xs text-slate-400">
                        {min} – {max}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">Légende des couleurs</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-green-50 border border-green-200 shrink-0" />
            En dessous de la moyenne
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-slate-50 border border-slate-200 shrink-0" />
            Dans la moyenne
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-50 border border-red-200 shrink-0" />
            Au-dessus de la moyenne
          </span>
        </div>
      </div>
    </div>
  );
}
