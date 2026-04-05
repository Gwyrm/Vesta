import { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, Users, BarChart2, Download, RefreshCw, AlertTriangle } from 'lucide-react';
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
  const [year,      setYear]      = useState(today.getFullYear());
  const [month,     setMonth]     = useState(today.getMonth() + 1);
  const [schedule,  setSchedule]  = useState({});
  const [workloads, setWorkloads] = useState({});
  const [spinning,  setSpinning]  = useState(false);

  // ── État planning externes ────────────────────────────────────────────────
  const [externeStartDate,  setExterneStartDate]  = useState(() => getMondayOf(today));
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
  }, [year, month]);

  useEffect(() => {
    setExterneSchedule({});
    setExterneRotation([]);
  }, [externeStartDate]);

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const interneStaff     = useMemo(() => staff.filter(s => s.role === 'intern' || s.role === 'socle'), [staff]);
  const externeStaff     = useMemo(() => staff.filter(s => s.role === 'extern'), [staff]);
  const externeWeekdays  = useMemo(() => getExterneWeekdays(externeStartDate), [externeStartDate]);
  const externeStartStr  = formatDate(externeStartDate);

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
      const result = generateSchedule(interneStaff, year, month);
      setSchedule(result.schedule);
      setWorkloads(result.workloads);
      setSpinning(false);
    }, 60);
  }, [interneStaff, year, month]);

  // ── Génération planning externes ──────────────────────────────────────────
  const handleGenerateExterne = useCallback(() => {
    setExterneSpinning(true);
    setTimeout(() => {
      const result = generateExterneSchedule(externeStaff, externeStartDate);
      setExterneSchedule(result.schedule);
      setExterneRotation(result.rotation);
      setExterneSpinning(false);
    }, 60);
  }, [externeStaff, externeStartDate]);

  // ── Changement de date de début externes ──────────────────────────────────
  const handleStartDateChange = (value) => {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    setExterneStartDate(getMondayOf(new Date(y, m - 1, d)));
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const hasInterneSchedule = Object.keys(schedule).length > 0;
  const interneTooFew      = interneStaff.length > 0 && interneStaff.length < 4;
  const yearOptions        = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);
  const subTab             = mainTab === 'internes' ? interneTab : externeTab;
  const setSubTab          = mainTab === 'internes' ? setInterneTab : setExterneTab;

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
                onScheduleChange={setSchedule}
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
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
