import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, AlertCircle, Lock, Coffee } from 'lucide-react';
import {
  getWeekdays,
  groupByWeek,
  formatDate,
  DAY_NAMES,
  MONTH_NAMES,
  DAY_TEMPLATES,
  POST_STYLES,
  POST_LABELS,
  POST_FAMILY,
  FAMILY_STYLES,
  FAMILY_LABELS,
  getFrenchHolidays,
} from '../scheduler.js';

// ─── Inline assignment selector ───────────────────────────────────────────────
function AssignSelect({ staffId, allStaff, isLocked, onAssign, onUnlock, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <select
      ref={ref}
      defaultValue={staffId ?? ''}
      onChange={e => {
        const v = e.target.value;
        if (v === '__unlock__') onUnlock?.();
        else onAssign(v || null);
        onClose();
      }}
      onBlur={onClose}
      className="w-full text-xs border border-blue-400 rounded-md px-1.5 py-1 bg-white
                 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md"
    >
      <option value="">— Non assigné —</option>
      {allStaff.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
      {isLocked && (
        <option value="__unlock__">↩︎ Déverrouiller (auto)</option>
      )}
    </select>
  );
}

// ─── Single post badge ────────────────────────────────────────────────────────
function PostBadge({ type, staffId, staffName, isAvis, isLocked, allStaff, onAssign, onUnlock }) {
  const [editing, setEditing] = useState(false);
  const style = POST_STYLES[isAvis ? 'Avis' : type] ?? FAMILY_STYLES.Scanner;
  const label = isAvis ? 'Avis' : (POST_LABELS[type] ?? type);
  const isEmpty = !staffId;

  return (
    <div className={`rounded-md border px-2 py-1 cursor-pointer ${style.bg}
                     ${isLocked ? 'border-amber-400 ring-1 ring-amber-200' : style.border}`}
         onClick={() => setEditing(true)}
         title={isLocked ? 'Verrouillé manuellement — cliquer pour modifier' : 'Cliquer pour modifier l\'assignation'}
    >
      {editing ? (
        <AssignSelect
          staffId={staffId}
          allStaff={allStaff}
          isLocked={isLocked}
          onAssign={onAssign}
          onUnlock={onUnlock}
          onClose={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
          <span className={`text-[11px] font-semibold shrink-0 ${style.text}`}>{label}</span>
          <span className={`text-[11px] truncate ${isEmpty ? 'text-red-400 italic' : 'text-slate-600'}`}>
            {isEmpty ? 'non assigné' : staffName}
          </span>
          {isLocked && <Lock className="w-2.5 h-2.5 shrink-0 text-amber-500" />}
          <ChevronDown className={`w-3 h-3 shrink-0 ${style.text} opacity-50`} />
        </div>
      )}
    </div>
  );
}

// ─── Off toggle (per-person, per-half-day) ────────────────────────────────────
function OffToggle({ staff, dateStr, period, offs, onToggleOff }) {
  const [open, setOpen] = useState(false);

  // Liste des personnes off cette demi-journée
  const offHere = staff.filter(s => offs[`${s.id}::${dateStr}-${period}`]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-1 text-[10px] px-1.5 py-0.5
                    rounded border transition-colors
                    ${offHere.length > 0
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
        title="Marquer une personne « off » sur cette demi-journée"
      >
        <span className="flex items-center gap-1 truncate">
          <Coffee className="w-2.5 h-2.5 shrink-0" />
          {offHere.length === 0
            ? <span className="italic">Off…</span>
            : <span className="truncate">{offHere.map(s => s.name.split(' ').pop()).join(', ')}</span>}
        </span>
        <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-50" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-1 max-h-48 overflow-y-auto">
            {staff.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic p-1">Aucun personnel</p>
            ) : staff.map(s => {
              const key = `${s.id}::${dateStr}-${period}`;
              const isOff = !!offs[key];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggleOff(s.id, dateStr, period)}
                  className={`w-full flex items-center gap-1.5 text-[11px] px-1.5 py-1 rounded
                              hover:bg-slate-50 ${isOff ? 'bg-slate-100 font-semibold' : ''}`}
                >
                  <span className={`w-2 h-2 rounded shrink-0 ${isOff ? 'bg-slate-500' : 'border border-slate-300'}`} />
                  <span className="truncate text-left flex-1">{s.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── One day column ───────────────────────────────────────────────────────────
function DayColumn({
  day, dateStr, dayData, holidayName, staff, month,
  dayLocks, offs,
  onSetLock, onUnsetLock, onToggleOff,
}) {
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

  const avisLocked = dayLocks?.avis !== undefined;
  const morningLocks   = dayLocks?.morning   ?? {};
  const afternoonLocks = dayLocks?.afternoon ?? {};

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
            isLocked={avisLocked}
            allStaff={staff}
            onAssign={id => onSetLock(dateStr, 'avis', null, null, id)}
            onUnlock={() => onUnsetLock(dateStr, 'avis', null, null)}
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
                  isLocked={i in morningLocks}
                  allStaff={staff}
                  onAssign={id => onSetLock(dateStr, 'post', 'morning', i, id)}
                  onUnlock={() => onUnsetLock(dateStr, 'post', 'morning', i)}
                />
              ))}
              <OffToggle
                staff={staff}
                dateStr={dateStr}
                period="morning"
                offs={offs}
                onToggleOff={onToggleOff}
              />
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
                  isLocked={i in afternoonLocks}
                  allStaff={staff}
                  onAssign={id => onSetLock(dateStr, 'post', 'afternoon', i, id)}
                  onUnlock={() => onUnsetLock(dateStr, 'post', 'afternoon', i)}
                />
              ))}
              <OffToggle
                staff={staff}
                dateStr={dateStr}
                period="afternoon"
                offs={offs}
                onToggleOff={onToggleOff}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Legend strip ─────────────────────────────────────────────────────────────
function Legend() {
  const families = ['Scanner', 'IRM', 'Echo', 'RCP', 'Avis'];
  return (
    <div className="flex flex-wrap gap-2">
      {families.map(fam => {
        const s = FAMILY_STYLES[fam];
        return (
          <span key={fam}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1
                        rounded-full border ${s.bg} ${s.border} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {FAMILY_LABELS[fam]}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1
                       rounded-full border bg-amber-50 border-amber-200 text-amber-700">
        <Lock className="w-3 h-3" />
        Verrouillé
      </span>
      <span className="text-[11px] text-slate-400 self-center ml-1">
        Cliquer une assignation pour la modifier ; le reste se régénère
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScheduleView({
  schedule, staff, year, month,
  locks = {}, offs = {},
  onSetLock, onUnsetLock, onToggleOff,
}) {
  const weekdays = getWeekdays(year, month);
  const weeks    = groupByWeek(weekdays);
  const holidays = getFrenchHolidays(year);

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
                  <p key={i} className={`${POST_STYLES[t]?.text ?? 'text-slate-600'}`}>
                    {POST_LABELS[t] ?? t}
                  </p>
                ))}
                <p className="text-slate-400 mt-1 mb-0.5 font-medium uppercase text-[10px]">PM</p>
                {tmpl.afternoon.map((t, i) => (
                  <p key={i} className={`${POST_STYLES[t]?.text ?? 'text-slate-600'}`}>
                    {POST_LABELS[t] ?? t}
                  </p>
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
                    dayLocks={locks[dateStr]}
                    offs={offs}
                    onSetLock={onSetLock}
                    onUnsetLock={onUnsetLock}
                    onToggleOff={onToggleOff}
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
