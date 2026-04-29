import { BarChart2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  MONTH_NAMES,
  getWeekdays,
  DAY_TEMPLATES,
  POST_TYPES,
  POST_LABELS,
  POST_FAMILY,
  FAMILY_STYLES,
} from '../scheduler.js';
import { ROLE_LABEL, ROLE_STYLE } from './StaffManager.jsx';

// ─── Catégories affichées ────────────────────────────────────────────────────
// Toutes les colonnes du tableau : 9 sous-types + Avis + Total
const CATEGORIES = [...POST_TYPES, 'avis', 'total'];

const LABELS = {
  ...POST_LABELS,
  avis:  'Avis',
  total: 'Total',
};

const CAT_STYLES = (() => {
  const map = {};
  for (const t of POST_TYPES) map[t] = FAMILY_STYLES[POST_FAMILY[t]].text;
  map.avis  = FAMILY_STYLES.Avis.text;
  map.total = 'text-slate-700';
  return map;
})();

const BAR_COLORS = (() => {
  const map = {};
  for (const t of POST_TYPES) map[t] = FAMILY_STYLES[POST_FAMILY[t]].dot;
  map.avis  = FAMILY_STYLES.Avis.dot;
  map.total = 'bg-slate-400';
  return map;
})();

// ─── Cartes récapitulatives — une par famille + avis + total ──────────────────
const RECAP_GROUPS = [
  { key: 'Scanner', label: 'Scanner',   types: POST_TYPES.filter(t => POST_FAMILY[t] === 'Scanner') },
  { key: 'IRM',     label: 'IRM',       types: POST_TYPES.filter(t => POST_FAMILY[t] === 'IRM')     },
  { key: 'Echo',    label: 'Écho',      types: POST_TYPES.filter(t => POST_FAMILY[t] === 'Echo')    },
  { key: 'RCP',     label: 'RCP',       types: POST_TYPES.filter(t => POST_FAMILY[t] === 'RCP')     },
  { key: 'avis',    label: 'Avis',      types: ['avis']  },
  { key: 'total',   label: 'Total',     types: ['total'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Totaux prévus pour le mois ──────────────────────────────────────────────

function computeMonthExpected(year, month) {
  const weekdays = getWeekdays(year, month);
  const totals = { avis: weekdays.length };
  for (const t of POST_TYPES) totals[t] = 0;
  for (const day of weekdays) {
    const tmpl = DAY_TEMPLATES[day.getDay()];
    [...tmpl.morning, ...tmpl.afternoon].forEach(t => {
      totals[t] = (totals[t] ?? 0) + 1;
    });
  }
  totals.total = POST_TYPES.reduce((sum, t) => sum + totals[t], 0);
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

// ─── Composant principal ─────────────────────────────────────────────────────

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

      {/* ── Récap des postes prévus, regroupés par famille ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Postes prévus — {MONTH_NAMES[month - 1]} {year}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RECAP_GROUPS.map(({ key, label, types }) => {
            const sum = types.reduce((s, t) => s + (expected[t] ?? 0), 0);
            const styleKey = key === 'avis' || key === 'total' ? key : types[0];
            return (
              <div key={key} className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                <p className={`text-2xl font-bold ${CAT_STYLES[styleKey]}`}>{sum}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                {/* Détail par sous-type */}
                {types.length > 1 && (
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    {types.map(t => `${LABELS[t]}: ${expected[t]}`).join(' · ')}
                  </p>
                )}
                {staff.length > 0 && types.length === 1 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    ~{(sum / staff.length).toFixed(1)} / pers.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tableau par membre ── */}
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
                  <td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700
                                      flex items-center justify-center text-[11px] font-bold shrink-0">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      {person.name}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_STYLE[person.role]?.badge ?? 'bg-slate-100 text-slate-600'}`}>
                      {ROLE_LABEL[person.role] ?? person.role}
                    </span>
                  </td>

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

      {/* Légende */}
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
