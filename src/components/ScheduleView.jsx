import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, AlertCircle } from 'lucide-react';
import {
  getWeekdays,
  groupByWeek,
  formatDate,
  DAY_NAMES,
  MONTH_NAMES,
  DAY_TEMPLATES,
  POST_STYLES,
  getFrenchHolidays,
} from '../scheduler.js';

// ─── Inline assignment selector ───────────────────────────────────────────────
function AssignSelect({ staffId, allStaff, onAssign, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <select
      ref={ref}
      defaultValue={staffId ?? ''}
      onChange={e => { onAssign(e.target.value || null); onClose(); }}
      onBlur={onClose}
      className="w-full text-xs border border-blue-400 rounded-md px-1.5 py-1 bg-white
                 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md"
    >
      <option value="">— Non assigné —</option>
      {allStaff.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}

// ─── Single post badge ────────────────────────────────────────────────────────
function PostBadge({ type, staffId, staffName, isAvis, allStaff, onAssign }) {
  const [editing, setEditing] = useState(false);
  const style = POST_STYLES[isAvis ? 'Avis' : type] ?? POST_STYLES.Scanner;
  const label = isAvis ? 'Avis' : type;
  const isEmpty = !staffId;

  return (
    <div className={`rounded-md border px-2 py-1 ${style.bg} ${style.border} cursor-pointer`}
         onClick={() => setEditing(true)}
         title="Cliquer pour modifier l'assignation"
    >
      {editing ? (
        <AssignSelect
          staffId={staffId}
          allStaff={allStaff}
          onAssign={onAssign}
          onClose={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
          <span className={`text-[11px] font-semibold shrink-0 ${style.text}`}>{label}</span>
          <span className={`text-[11px] truncate ${isEmpty ? 'text-red-400 italic' : 'text-slate-600'}`}>
            {isEmpty ? 'non assigné' : staffName}
          </span>
          <ChevronDown className={`w-3 h-3 shrink-0 ${style.text} opacity-50`} />
        </div>
      )}
    </div>
  );
}

// ─── One day column ───────────────────────────────────────────────────────────
function DayColumn({ day, dateStr, dayData, holidayName, staff, month, onUpdateAvis, onUpdatePost }) {
  const getStaffName = id => staff.find(s => s.id === id)?.name ?? null;
  const isToday   = formatDate(new Date()) === dateStr;
  const isHoliday = Boolean(holidayName);

  if (isHoliday) {
    return (
      <div className="p-3 flex flex-col gap-2 min-h-[220px] bg-slate-50/60">
        <div className="pb-2 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-400">{DAY_NAMES[day.getDay()]}</p>
          <p className="text-xs text-slate-400">{day.getDate()} {MONTH_NAMES[month - 1].slice(0, 3)}.</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-lg">🏥</span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Férié</span>
          <span className="text-[11px] text-slate-400 italic leading-tight">{holidayName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 flex flex-col gap-2 min-h-[220px] ${isToday ? 'bg-blue-50/40' : ''}`}>
      {/* Day header */}
      <div className={`pb-2 border-b ${isToday ? 'border-blue-200' : 'border-slate-100'}`}>
        <p className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
          {DAY_NAMES[day.getDay()]}
        </p>
        <p className="text-xs text-slate-400">
          {day.getDate()} {MONTH_NAMES[month - 1].slice(0, 3)}.
          {isToday && <span className="ml-1 text-blue-500 font-semibold">·Aujourd'hui</span>}
        </p>
      </div>

      {!dayData ? (
        <p className="text-xs text-slate-300 italic">Non planifié</p>
      ) : (
        <>
          {/* Avis */}
          <PostBadge
            type="Avis"
            isAvis
            staffId={dayData.avis}
            staffName={getStaffName(dayData.avis)}
            allStaff={staff}
            onAssign={id => onUpdateAvis(dateStr, id)}
          />

          {/* Morning */}
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Matin</p>
            <div className="space-y-1">
              {dayData.morning.map((post, i) => (
                <PostBadge
                  key={i}
                  type={post.type}
                  staffId={post.staffId}
                  staffName={getStaffName(post.staffId)}
                  allStaff={staff}
                  onAssign={id => onUpdatePost(dateStr, 'morning', i, id)}
                />
              ))}
            </div>
          </div>

          {/* Afternoon */}
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Après-midi</p>
            <div className="space-y-1">
              {dayData.afternoon.map((post, i) => (
                <PostBadge
                  key={i}
                  type={post.type}
                  staffId={post.staffId}
                  staffName={getStaffName(post.staffId)}
                  allStaff={staff}
                  onAssign={id => onUpdatePost(dateStr, 'afternoon', i, id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Legend strip ─────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(POST_STYLES).map(([type, s]) => (
        <span key={type}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1
                      rounded-full border ${s.bg} ${s.border} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {type}
        </span>
      ))}
      <span className="text-[11px] text-slate-400 self-center ml-1">
        Cliquer sur une assignation pour la modifier
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScheduleView({ schedule, staff, year, month, onScheduleChange }) {
  const weekdays = getWeekdays(year, month);
  const weeks    = groupByWeek(weekdays);
  const holidays = getFrenchHolidays(year);

  // ── Mutation helpers ──────────────────────────────────────────────────────
  const updateAvis = (dateStr, newId) => {
    onScheduleChange(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], avis: newId },
    }));
  };

  const updatePost = (dateStr, period, index, newId) => {
    onScheduleChange(prev => {
      const posts = [...prev[dateStr][period]];
      posts[index] = { ...posts[index], staffId: newId };
      return { ...prev, [dateStr]: { ...prev[dateStr], [period]: posts } };
    });
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!Object.keys(schedule).length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-blue-300" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-700">Aucun planning généré</h3>
          <p className="text-sm text-slate-400 mt-1">
            Ajoutez du personnel, configurez les absences, puis cliquez sur{' '}
            <strong className="text-blue-600">Générer le planning</strong>.
          </p>
        </div>

        {/* Recap of week templates */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3 text-left w-full max-w-4xl">
          {[1, 2, 3, 4, 5].map(dow => {
            const tmpl = DAY_TEMPLATES[dow];
            return (
              <div key={dow} className="bg-white rounded-xl border border-slate-200 p-3 text-xs">
                <p className="font-semibold text-slate-700 mb-1">{DAY_NAMES[dow]}</p>
                <p className="text-slate-400 mb-0.5 font-medium uppercase text-[10px]">Matin</p>
                {tmpl.morning.map((t, i) => (
                  <p key={i} className={`${POST_STYLES[t]?.text ?? 'text-slate-600'}`}>{t}</p>
                ))}
                <p className="text-slate-400 mt-1 mb-0.5 font-medium uppercase text-[10px]">PM</p>
                {tmpl.afternoon.map((t, i) => (
                  <p key={i} className={`${POST_STYLES[t]?.text ?? 'text-slate-600'}`}>{t}</p>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Count unassigned posts (warning) ─────────────────────────────────────
  let unassigned = 0;
  for (const d of Object.values(schedule)) {
    if (!d.avis) unassigned++;
    d.morning.forEach(p => { if (!p.staffId) unassigned++; });
    d.afternoon.forEach(p => { if (!p.staffId) unassigned++; });
  }

  return (
    <div className="space-y-5">

      {/* Header row */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-slate-800">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Legend />
      </div>

      {/* Unassigned warning */}
      {unassigned > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{unassigned}</strong> poste{unassigned > 1 ? 's' : ''} non assigné{unassigned > 1 ? 's' : ''} — ajoutez du personnel ou modifiez les assignations manuellement.
          </span>
        </div>
      )}

      {/* Week blocks */}
      {weeks.map((weekDays, wi) => {
        const first = weekDays[0];
        const last  = weekDays[weekDays.length - 1];
        return (
          <div key={wi} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Week header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Semaine {wi + 1}
              </span>
              <span className="text-xs text-slate-400">
                {first.getDate()} – {last.getDate()} {MONTH_NAMES[month - 1]}
              </span>
            </div>

            {/* Day columns */}
            <div
              className="grid divide-x divide-slate-100"
              style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
            >
              {weekDays.map(day => {
                const dateStr = formatDate(day);
                return (
                  <DayColumn
                    key={dateStr}
                    day={day}
                    dateStr={dateStr}
                    dayData={schedule[dateStr]}
                    holidayName={holidays.get(dateStr) ?? null}
                    staff={staff}
                    month={month}
                    onUpdateAvis={updateAvis}
                    onUpdatePost={updatePost}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
