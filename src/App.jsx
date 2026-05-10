import { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, Users, BarChart2, Download, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import StaffManager from './components/StaffManager.jsx';
import ScheduleView from './components/ScheduleView.jsx';
import ScheduleViewExterne from './components/ScheduleViewExterne.jsx';
import Stats from './components/Stats.jsx';
import StatsExterne from './components/StatsExterne.jsx';
import { exportXLSX } from './exportXLSX.js';
import {
  generateSchedule,
  formatDate,
  MONTH_NAMES,
} from './scheduler.js';
import {
  generateExterneSchedule,
  getMondayOf,
  getExterneWeekdays,
  computeWeekCount,
} from './schedulerExterne.js';

// ─── Personnel par défaut ─────────────────────────────────────────────────────
const DEFAULT_STAFF = [
  { id: 's1', name: 'Dr. Martin',  role: 'intern',  absences: [] },
  { id: 's2', name: 'Dr. Dupont',  role: 'extern',  absences: [] },
  { id: 's3', name: 'Dr. Bernard', role: 'intern',  absences: [] },
  { id: 's4', name: 'Dr. Leclerc', role: 'extern',  absences: [] },
  { id: 's5', name: 'Dr. Moreau',  role: 'intern',  absences: [] },
];

function loadStaff() {
  try {
    const raw = localStorage.getItem('vesta-staff');
    return raw ? JSON.parse(raw) : DEFAULT_STAFF;
  } catch {
    return DEFAULT_STAFF;
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const today = new Date();

  // ── État partagé ──────────────────────────────────────────────────────────
  const [staff,       setStaff]       = useState(loadStaff);
  const [mainTab,     setMainTab]     = useState('internes'); // 'internes' | 'externes'
  const [interneTab,  setInterneTab]  = useState('planning');
  const [externeTab,  setExterneTab]  = useState('planning');

  // ── État planning internes ────────────────────────────────────────────────
  const [year,         setYear]         = useState(today.getFullYear());
  const [month,        setMonth]        = useState(today.getMonth() + 1);
  const [schedule,     setSchedule]     = useState({});
  const [workloads,    setWorkloads]    = useState({});
  const [spinning,     setSpinning]     = useState(false);
  const [locks,        setLocks]        = useState({}); // verrous manuels
  const [offs,         setOffs]         = useState({}); // demi-journées « off »
  const [hasGenerated, setHasGenerated] = useState(false);

  // ── État planning externes ────────────────────────────────────────────────
  const [externeStartDate,  setExterneStartDate]  = useState(() => getMondayOf(today));
  // Default = vendredi de la 6e semaine (= startMon + 5 sem + 4 j).
  const [externeEndDate,    setExterneEndDate]    = useState(() => {
    const d = getMondayOf(today);
    d.setDate(d.getDate() + 5 * 7 + 4);
    return d;
  });
  const [externeSchedule,   setExterneSchedule]   = useState({});
  const [externeRotation,   setExterneRotation]   = useState([]);
  const [externeSpinning,   setExterneSpinning]   = useState(false);

  // ── Persistance ───────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('vesta-staff', JSON.stringify(staff));
  }, [staff]);

  // ── Réinitialisation des plannings au changement de période ───────────────
  useEffect(() => {
    setSchedule({});
    setWorkloads({});
    setLocks({});
    setOffs({});
    setHasGenerated(false);
  }, [year, month]);

  // ── Régénération automatique quand les verrous ou les « off » changent ────
  useEffect(() => {
    if (!hasGenerated) return;
    const result = generateSchedule(interneStaff, year, month, locks, offs);
    setSchedule(result.schedule);
    setWorkloads(result.workloads);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locks, offs]);

  useEffect(() => {
    setExterneSchedule({});
    setExterneRotation([]);
  }, [externeStartDate, externeEndDate]);

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const interneStaff     = useMemo(() => staff.filter(s => s.role === 'intern' || s.role === 'socle'), [staff]);
  const externeStaff     = useMemo(() => staff.filter(s => s.role === 'extern'), [staff]);
  const externeWeekCount = useMemo(
    () => computeWeekCount(externeStartDate, externeEndDate),
    [externeStartDate, externeEndDate],
  );
  const externeWeekdays  = useMemo(
    () => getExterneWeekdays(externeStartDate, externeWeekCount),
    [externeStartDate, externeWeekCount],
  );
  const externeStartStr  = formatDate(externeStartDate);
  const externeEndStr    = formatDate(externeEndDate);

  // ── Handlers de mise à jour du personnel (fusion dans le tableau partagé) ─
  const handleInterneStaffChange = useCallback(newInterneStaff => {
    setStaff(prev => [...newInterneStaff, ...prev.filter(s => s.role === 'extern')]);
  }, []);

  const handleExterneStaffChange = useCallback(newExterneStaff => {
    setStaff(prev => [...prev.filter(s => s.role !== 'extern'), ...newExterneStaff]);
  }, []);

  // ── Génération planning internes ──────────────────────────────────────────
  const handleGenerateInterne = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      const result = generateSchedule(interneStaff, year, month, locks, offs);
      setSchedule(result.schedule);
      setWorkloads(result.workloads);
      setHasGenerated(true);
      setSpinning(false);
    }, 60);
  }, [interneStaff, year, month, locks, offs]);

  // ── Mise à jour d'un verrou (slot manuel) ─────────────────────────────────
  const setSlotLock = useCallback((dateStr, kind, period, idx, staffId) => {
    setLocks(prev => {
      const next = { ...prev };
      const day  = { ...(next[dateStr] ?? {}) };
      if (kind === 'avis') {
        day.avis = staffId;
      } else {
        const periodLocks = { ...(day[period] ?? {}) };
        periodLocks[idx] = staffId;
        day[period] = periodLocks;
      }
      next[dateStr] = day;
      return next;
    });
  }, []);

  // ── Suppression d'un verrou ───────────────────────────────────────────────
  const unsetSlotLock = useCallback((dateStr, kind, period, idx) => {
    setLocks(prev => {
      if (!prev[dateStr]) return prev;
      const next = { ...prev };
      const day  = { ...next[dateStr] };
      if (kind === 'avis') {
        delete day.avis;
      } else if (day[period]) {
        const periodLocks = { ...day[period] };
        delete periodLocks[idx];
        if (Object.keys(periodLocks).length === 0) {
          delete day[period];
        } else {
          day[period] = periodLocks;
        }
      }
      if (Object.keys(day).length === 0) {
        delete next[dateStr];
      } else {
        next[dateStr] = day;
      }
      return next;
    });
  }, []);

  // ── Toggle d'une demi-journée « off » pour une personne ───────────────────
  const toggleOff = useCallback((staffId, dateStr, period) => {
    const key = `${staffId}::${dateStr}-${period}`;
    setOffs(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }, []);

  // ── Effacement de toutes les modifications manuelles ──────────────────────
  const handleClearLocks = useCallback(() => {
    setLocks({});
    setOffs({});
  }, []);

  // ── Génération planning externes ──────────────────────────────────────────
  const handleGenerateExterne = useCallback(() => {
    setExterneSpinning(true);
    setTimeout(() => {
      const result = generateExterneSchedule(
        externeStaff,
        externeStartDate,
        externeWeekCount,
      );
      setExterneSchedule(result.schedule);
      setExterneRotation(result.rotation);
      setExterneSpinning(false);
    }, 60);
  }, [externeStaff, externeStartDate, externeWeekCount]);

  // ── Changement de date de début externes ──────────────────────────────────
  const handleStartDateChange = (value) => {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    setExterneStartDate(getMondayOf(new Date(y, m - 1, d)));
  };

  const handleEndDateChange = (value) => {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    setExterneEndDate(new Date(y, m - 1, d));
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const hasInterneSchedule = Object.keys(schedule).length > 0;
  const interneTooFew      = interneStaff.length > 0 && interneStaff.length < 4;
  const yearOptions        = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);
  const subTab             = mainTab === 'internes' ? interneTab : externeTab;
  const setSubTab          = mainTab === 'internes' ? setInterneTab : setExterneTab;
  const lockCount          = Object.values(locks).reduce((sum, day) => {
    let n = 0;
    if (day.avis !== undefined) n++;
    n += Object.keys(day.morning   ?? {}).length;
    n += Object.keys(day.afternoon ?? {}).length;
    return sum + n;
  }, 0);
  const offCount = Object.keys(offs).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">

      {/* ── Barre supérieure ── */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Marque */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Calendar className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-slate-900 tracking-tight">Vesta</p>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Service de Radiologie</p>
            </div>
          </div>

          {/* Contrôles selon l'onglet actif */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {mainTab === 'internes' ? (
              <>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white/90 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                >
                  {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
                </select>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white/90 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button
                  onClick={handleGenerateInterne}
                  disabled={spinning || interneStaff.length === 0}
                  className="flex items-center gap-2 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                             text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
                >
                  <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
                  Générer
                </button>
                {(lockCount > 0 || offCount > 0) && (
                  <button
                    onClick={handleClearLocks}
                    title="Réinitialiser tous les verrous et les demi-journées off"
                    className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200 hover:bg-amber-100/80
                               text-amber-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Effacer mes modifs
                    <span className="bg-amber-200/70 text-amber-900 text-[10px] rounded-full px-1.5 py-0.5 font-bold tabular-nums">
                      {lockCount + offCount}
                    </span>
                  </button>
                )}
                {hasInterneSchedule && (
                  <button
                    onClick={() => exportXLSX(schedule, interneStaff, year, month)}
                    className="flex items-center gap-2 bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700
                               text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="text-sm text-slate-500 font-medium shrink-0">Début :</span>
                <input
                  type="date"
                  value={externeStartStr}
                  onChange={e => handleStartDateChange(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white/90 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                />
                <span className="text-sm text-slate-500 font-medium shrink-0">Fin :</span>
                <input
                  type="date"
                  value={externeEndStr}
                  min={externeStartStr}
                  onChange={e => handleEndDateChange(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white/90 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                />
                <span className="text-xs text-slate-500 shrink-0">
                  ({externeWeekCount} sem.)
                </span>
                <button
                  onClick={handleGenerateExterne}
                  disabled={externeSpinning || externeStaff.length === 0}
                  className="flex items-center gap-2 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                             text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
                >
                  <RefreshCw className={`w-4 h-4 ${externeSpinning ? 'animate-spin' : ''}`} />
                  Générer
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Onglets principaux (Internes / Externes) ── */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/70">
        <div className="max-w-screen-xl mx-auto px-4 flex gap-1 py-2">
          {[
            { id: 'internes', label: 'Internes & Socles', count: interneStaff.length },
            { id: 'externes', label: 'Externes',           count: externeStaff.length },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all
                ${mainTab === id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              {label}
              <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-bold tabular-nums
                ${mainTab === id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sous-onglets (Planning / Personnel / Statistiques) ── */}
      <div className="border-b border-slate-200/70">
        <div className="max-w-screen-xl mx-auto px-4 flex">
          {[
            { id: 'planning', label: 'Planning',     Icon: Calendar  },
            { id: 'staff',    label: 'Personnel',    Icon: Users     },
            { id: 'stats',    label: 'Statistiques', Icon: BarChart2 },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium relative transition-colors
                ${subTab === id
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <Icon className="w-4 h-4" strokeWidth={subTab === id ? 2.5 : 2} />
              {label}
              {id === 'staff' && (
                <span className="ml-1 bg-slate-100 text-slate-700 text-[11px] rounded-full px-1.5 py-0.5 font-bold tabular-nums">
                  {mainTab === 'internes' ? interneStaff.length : externeStaff.length}
                </span>
              )}
              {subTab === id && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bandeaux d'avertissement ── */}
      {mainTab === 'internes' && interneTooFew && (
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-2">
          <div className="max-w-screen-xl mx-auto flex items-center gap-2 text-amber-800 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            Moins de 4 membres dans l'équipe — certains postes resteront non assignés.
          </div>
        </div>
      )}

      {/* ── Contenu principal ── */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {mainTab === 'internes' ? (
          <>
            {subTab === 'planning' && (
              <ScheduleView
                schedule={schedule}
                staff={interneStaff}
                year={year}
                month={month}
                locks={locks}
                offs={offs}
                onSetLock={setSlotLock}
                onUnsetLock={unsetSlotLock}
                onToggleOff={toggleOff}
              />
            )}
            {subTab === 'staff' && (
              <StaffManager
                staff={interneStaff}
                year={year}
                month={month}
                availableRoles={['intern', 'socle']}
                onChange={handleInterneStaffChange}
              />
            )}
            {subTab === 'stats' && (
              <Stats workloads={workloads} staff={interneStaff} year={year} month={month} />
            )}
          </>
        ) : (
          <>
            {subTab === 'planning' && (
              <ScheduleViewExterne
                schedule={externeSchedule}
                rotation={externeRotation}
                staff={externeStaff}
                startDate={externeStartDate}
                weekCount={externeWeekCount}
                onScheduleChange={setExterneSchedule}
              />
            )}
            {subTab === 'staff' && (
              <StaffManager
                staff={externeStaff}
                weekdays={externeWeekdays}
                availableRoles={['extern']}
                onChange={handleExterneStaffChange}
              />
            )}
            {subTab === 'stats' && (
              <StatsExterne
                schedule={externeSchedule}
                rotation={externeRotation}
                staff={externeStaff}
                startDate={externeStartDate}
                weekCount={externeWeekCount}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
