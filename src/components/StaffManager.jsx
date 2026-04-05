import { useState, useMemo } from 'react';
import { UserPlus, Trash2, Sun, Sunset, Users } from 'lucide-react';
import { getWeekdays, formatDate, DAY_NAMES, MONTH_NAMES, getFrenchHolidays } from '../scheduler.js';

export const ROLE_LABEL = { intern: 'Interne', extern: 'Externe', socle: 'Socle' };
export const ROLE_STYLE = {
  intern: { badge: 'bg-violet-100 text-violet-700' },
  extern: { badge: 'bg-emerald-100 text-emerald-700' },
  socle:  { badge: 'bg-rose-100   text-rose-700'    },
};

// ─── Cellule d'absence ────────────────────────────────────────────────────────
function AbsenceCell({ absent, onClick, title }) {
  return (
    <td className="py-0.5 px-0.5 text-center">
      <button
        onClick={onClick}
        title={title}
        className={`w-7 h-6 rounded text-[11px] font-medium transition-colors border
          ${absent
            ? 'bg-red-100 border-red-300 text-red-600 hover:bg-red-200'
            : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-slate-100'
          }`}
      >
        {absent ? '✕' : '·'}
      </button>
    </td>
  );
}

// ─── Cellule jour férié ───────────────────────────────────────────────────────
function HolidayCell({ title }) {
  return (
    <td className="py-0.5 px-0.5 text-center" title={title}>
      <div className="w-7 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 select-none">
        🏥
      </div>
    </td>
  );
}

// ─── Fiche d'un membre ────────────────────────────────────────────────────────
function StaffCard({ person, periodLabel, weekdays, holidays, availableRoles, onRemove, onToggleAbsence, onChangeRole, onToggleDayAbsence }) {
  const [editingRole, setEditingRole] = useState(false);
  const absenceCount  = person.absences.length;
  const canEditRole   = availableRoles.length > 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm select-none">
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{person.name}</span>
            {canEditRole ? (
              editingRole ? (
                <select
                  autoFocus
                  value={person.role}
                  onChange={e => { onChangeRole(person.id, e.target.value); setEditingRole(false); }}
                  onBlur={() => setEditingRole(false)}
                  className="text-[11px] border border-slate-300 rounded-full px-2 py-0.5 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setEditingRole(true)}
                  title="Cliquer pour changer le statut"
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70
                              ${ROLE_STYLE[person.role]?.badge ?? 'bg-slate-100 text-slate-600'}`}
                >
                  {ROLE_LABEL[person.role] ?? person.role} ✎
                </button>
              )
            ) : (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium
                               ${ROLE_STYLE[person.role]?.badge ?? 'bg-slate-100 text-slate-600'}`}>
                {ROLE_LABEL[person.role] ?? person.role}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {absenceCount > 0 && (
            <span className="text-xs text-red-500 font-medium">
              {absenceCount} absence{absenceCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={onRemove}
            className="text-slate-300 hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grille des absences */}
      <div className="px-4 py-3 overflow-x-auto">
        <p className="text-[11px] text-slate-400 mb-2 uppercase tracking-wide font-medium">
          Absences — {periodLabel}
          <span className="ml-1 normal-case">
            (cliquer une case : demi-journée · cliquer la date : journée entière · 🏥 = férié)
          </span>
        </p>
        <table className="text-xs border-separate border-spacing-x-0.5">
          <thead>
            <tr>
              <th className="w-16 text-left pb-1 text-slate-400 font-normal" />
              {weekdays.map(day => {
                const dateStr   = formatDate(day);
                const isHoliday = holidays.has(dateStr);
                const bothAbsent = !isHoliday &&
                  person.absences.includes(`${dateStr}-morning`) &&
                  person.absences.includes(`${dateStr}-afternoon`);
                return (
                  <th
                    key={dateStr}
                    onClick={!isHoliday ? () => onToggleDayAbsence(person.id, dateStr) : undefined}
                    className={`text-center pb-1 font-medium min-w-[28px] rounded select-none
                      ${isHoliday
                        ? 'text-slate-300'
                        : bothAbsent
                          ? 'text-red-500 cursor-pointer hover:opacity-70'
                          : 'text-slate-500 cursor-pointer hover:text-red-400'
                      }`}
                    title={isHoliday ? holidays.get(dateStr) : 'Cliquer pour basculer matin + après-midi'}
                  >
                    <div>{DAY_NAMES[day.getDay()].slice(0, 3)}</div>
                    <div className="font-normal">{day.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[
              { period: 'morning',   Icon: Sun,    label: 'Matin' },
              { period: 'afternoon', Icon: Sunset, label: 'PM'    },
            ].map(({ period, Icon, label }) => (
              <tr key={period}>
                <td className="pr-2 text-slate-500">
                  <div className="flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </div>
                </td>
                {weekdays.map(day => {
                  const dateStr   = formatDate(day);
                  const isHoliday = holidays.has(dateStr);
                  if (isHoliday) {
                    return <HolidayCell key={dateStr} title={holidays.get(dateStr)} />;
                  }
                  const absent = person.absences.includes(`${dateStr}-${period}`);
                  return (
                    <AbsenceCell
                      key={dateStr}
                      absent={absent}
                      onClick={() => onToggleAbsence(person.id, dateStr, period)}
                      title={absent ? 'Absent — cliquer pour rétablir' : 'Présent — cliquer pour marquer absent'}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function StaffManager({
  staff,
  year,
  month,
  weekdays: weekdaysProp,
  availableRoles,
  onChange,
}) {
  const roles = availableRoles ?? ['intern', 'extern', 'socle'];
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState(() => roles[0]);

  const weekdays = useMemo(
    () => weekdaysProp ?? (year && month ? getWeekdays(year, month) : []),
    [weekdaysProp, year, month]
  );

  const holidays = useMemo(() => {
    if (weekdaysProp && weekdaysProp.length > 0) {
      const years = new Set(weekdaysProp.map(d => d.getFullYear()));
      const map   = new Map();
      for (const y of years) {
        for (const [k, v] of getFrenchHolidays(y)) map.set(k, v);
      }
      return map;
    }
    return year ? getFrenchHolidays(year) : new Map();
  }, [weekdaysProp, year]);

  const periodLabel = useMemo(() => {
    if (weekdaysProp && weekdaysProp.length > 0) {
      const first = weekdaysProp[0];
      const last  = weekdaysProp[weekdaysProp.length - 1];
      const fmt   = d => `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
      return first.getFullYear() === last.getFullYear()
        ? `${fmt(first)} – ${fmt(last)} ${last.getFullYear()}`
        : `${fmt(first)} ${first.getFullYear()} – ${fmt(last)} ${last.getFullYear()}`;
    }
    return `${MONTH_NAMES[month - 1]} ${year}`;
  }, [weekdaysProp, month, year]);

  const addStaff = () => {
    const name = newName.trim();
    if (!name) return;
    onChange([...staff, { id: `s-${Date.now()}`, name, role: newRole, absences: [] }]);
    setNewName('');
  };

  const removeStaff   = id => onChange(staff.filter(s => s.id !== id));
  const changeRole    = (personId, newRole) =>
    onChange(staff.map(s => s.id === personId ? { ...s, role: newRole } : s));

  const toggleAbsence = (personId, dateStr, period) => {
    onChange(staff.map(s => {
      if (s.id !== personId) return s;
      const key = `${dateStr}-${period}`;
      return {
        ...s,
        absences: s.absences.includes(key)
          ? s.absences.filter(a => a !== key)
          : [...s.absences, key],
      };
    }));
  };

  const toggleDayAbsence = (personId, dateStr) => {
    onChange(staff.map(s => {
      if (s.id !== personId) return s;
      const mKey = `${dateStr}-morning`;
      const aKey = `${dateStr}-afternoon`;
      const bothAbsent = s.absences.includes(mKey) && s.absences.includes(aKey);
      const kept = s.absences.filter(a => a !== mKey && a !== aKey);
      return { ...s, absences: bothAbsent ? kept : [...kept, mKey, aKey] };
    }));
  };

  return (
    <div className="space-y-5">

      {/* Formulaire d'ajout */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-500" />
          Ajouter un membre
        </h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStaff()}
            placeholder="Nom (ex. Dr. Lefèvre)…"
            className="flex-1 min-w-[180px] border border-slate-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {roles.length > 1 && (
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          )}
          <button
            onClick={addStaff}
            disabled={!newName.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                       text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* État vide */}
      {staff.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 font-medium">Aucun membre dans l'équipe</p>
          <p className="text-sm text-slate-400 mt-1">Ajoutez au moins 4 personnes pour générer un planning.</p>
        </div>
      )}

      {/* Fiches membres */}
      {staff.map(person => (
        <StaffCard
          key={person.id}
          person={person}
          periodLabel={periodLabel}
          weekdays={weekdays}
          holidays={holidays}
          availableRoles={roles}
          onRemove={() => removeStaff(person.id)}
          onChangeRole={changeRole}
          onToggleAbsence={toggleAbsence}
          onToggleDayAbsence={toggleDayAbsence}
        />
      ))}
    </div>
  );
}
