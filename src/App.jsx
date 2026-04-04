import { useState, useCallback, useEffect } from 'react';
import { Calendar, Users, BarChart2, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import StaffManager from './components/StaffManager.jsx';
import ScheduleView from './components/ScheduleView.jsx';
import Stats from './components/Stats.jsx';
import { exportXLSX } from './exportXLSX.js';
import {
  generateSchedule,
  getWeekdays,
  formatDate,
  MONTH_NAMES,
  DAY_NAMES,
  DAY_TEMPLATES,
} from './scheduler.js';

// ─── Default staff (can be cleared) ──────────────────────────────────────────
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
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth() + 1);
  const [staff,    setStaff]    = useState(loadStaff);
  const [schedule, setSchedule] = useState({});
  const [workloads,setWorkloads]= useState({});
  const [tab,      setTab]      = useState('planning');
  const [spinning, setSpinning] = useState(false);

  // Persist staff to localStorage
  useEffect(() => {
    localStorage.setItem('vesta-staff', JSON.stringify(staff));
  }, [staff]);

  // Clear schedule when month/year changes
  useEffect(() => {
    setSchedule({});
    setWorkloads({});
  }, [year, month]);

  const handleGenerate = useCallback(() => {
    setSpinning(true);
    // Defer to let the spinner render
    setTimeout(() => {
      const result = generateSchedule(staff, year, month);
      setSchedule(result.schedule);
      setWorkloads(result.workloads);
      setSpinning(false);
    }, 60);
  }, [staff, year, month]);

  const hasSchedule  = Object.keys(schedule).length > 0;
  const staffTooFew  = staff.length < 4;

  // ── Year options (current ±3) ──
  const yearOptions = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Top bar ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-slate-900 tracking-tight">Vesta Planning</p>
              <p className="text-[11px] text-slate-400 font-medium">Service de Radiologie</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Month picker */}
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTH_NAMES.map((n, i) => (
                <option key={i} value={i + 1}>{n}</option>
              ))}
            </select>

            {/* Year picker */}
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={spinning || staff.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
              Générer le planning
            </button>

            {/* Export */}
            {hasSchedule && (
              <button
                onClick={() => exportXLSX(schedule, staff, year, month)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                           text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Exporter Excel
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 flex">
          {[
            { id: 'planning', label: 'Planning',      Icon: Calendar  },
            { id: 'staff',    label: 'Personnel',     Icon: Users     },
            { id: 'stats',    label: 'Statistiques',  Icon: BarChart2 },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors
                ${tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'staff' && (
                <span className="ml-1 bg-slate-100 text-slate-600 text-[11px] rounded-full px-1.5 py-0.5 font-semibold">
                  {staff.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Warning banner ── */}
      {staffTooFew && staff.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-screen-xl mx-auto flex items-center gap-2 text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Moins de 4 membres dans l'équipe — certains postes resteront non assignés.
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {tab === 'planning' && (
          <ScheduleView
            schedule={schedule}
            staff={staff}
            year={year}
            month={month}
            onScheduleChange={setSchedule}
          />
        )}
        {tab === 'staff' && (
          <StaffManager
            staff={staff}
            year={year}
            month={month}
            onChange={setStaff}
          />
        )}
        {tab === 'stats' && (
          <Stats workloads={workloads} staff={staff} year={year} month={month} />
        )}
      </main>
    </div>
  );
}
