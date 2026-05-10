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
    <div className="min-h-screen bg-slate-100">

      {/* ── Barre supérieure ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Marque */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-slate-900 tracking-tight">Vesta Planning</p>
              <p className="text-[11px] text-slate-400 font-medium">Service de Radiologie</p>
            </div>
          </div>

          {/* Contrôles selon l'onglet actif */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {mainTab === 'internes' ? (
              <>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
                </select>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button
                  onClick={handleGenerateInterne}
                  disabled={spinning || interneStaff.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                             text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
                  Générer
                </button>
                {(lockCount > 0 || offCount > 0) && (
                  <button
                    onClick={handleClearLocks}
                    title="Réinitialiser tous les verrous et les demi-journées off"
                    className="flex items-center gap-1.5 bg-white border border-amber-300 hover:bg-amber-50
                               text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Effacer mes modifs
                    <span className="bg-amber-100 text-amber-700 text-[10px] rounded-full px-1.5 py-0.5 font-semibold">
                      {lockCount + offCount}
                    </span>
                  </button>
                )}
                {hasInterneSchedule && (
                  <button
                    onClick={() => exportXLSX(schedule, interneStaff, year, month)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                               text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
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
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-500 font-medium shrink-0">Fin :</span>
                <input
                  type="date"
                  value={externeEndStr}
                  min={externeStartStr}
                  onChange={e => handleEndDateChange(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500 shrink-0">
                  ({externeWeekCount} sem.)
                </span>
                <button
                  onClick={handleGenerateExterne}
                  disabled={externeSpinning || externeStaff.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                             text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
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
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 flex">
          {[
            { id: 'internes', label: 'Internes & Socles', count: interneStaff.length },
            { id: 'externes', label: 'Externes',           count: externeStaff.length },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors
                ${mainTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              {label}
              <span className="ml-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-full px-1.5 py-0.5 font-semibold">
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sous-onglets (Planning / Personnel / Statistiques) ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 flex">
          {[
            { id: 'planning', label: 'Planning',     Icon: Calendar  },
            { id: 'staff',    label: 'Personnel',    Icon: Users     },
            { id: 'stats',    label: 'Statistiques', Icon: BarChart2 },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors
                ${subTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'staff' && (
                <span className="ml-1 bg-slate-100 text-slate-600 text-[11px] rounded-full px-1.5 py-0.5 font-semibold">
                  {mainTab === 'internes' ? interneStaff.length : externeStaff.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bandeaux d'avertissement ── */}
      {mainTab === 'internes' && interneTooFew && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-screen-xl mx-auto flex items-center gap-2 text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
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
