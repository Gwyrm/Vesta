import * as XLSX from 'xlsx';
import {
  getWeekdays,
  groupByWeek,
  formatDate,
  DAY_NAMES,
  MONTH_NAMES,
  getFrenchHolidays,
} from './scheduler.js';

// ─── Structure des lignes ─────────────────────────────────────────────────────
//
// Reprend le format de référence :
//   • Ligne 1  : noms des jours (chaque jour fusionne AM+PM)
//   • Ligne 2  : "Semaine DD MMMM" | AM PM AM PM …
//   • Ligne 3  : Avis (fusionne AM+PM par jour — rôle journalier)
//   • Lignes + : postes techniques avec AM et PM séparés
//
// Une feuille Excel par semaine, nommée "sem DD - MM".
//
// ─────────────────────────────────────────────────────────────────────────────

// Lignes de postes techniques (label, type interne, numéro de slot dans la période)
const POST_ROWS = [
  { label: 'Scanner 1', type: 'Scanner', slot: 0 },
  { label: 'Scanner 2', type: 'Scanner', slot: 1 },
  { label: 'IRM 1',     type: 'IRM',     slot: 0 },
  { label: 'IRM 2',     type: 'IRM',     slot: 1 },
  { label: 'IRM 3',     type: 'IRM',     slot: 2 },
  { label: 'Écho',      type: 'Echo',    slot: 0 },
  { label: 'RCP',       type: 'RCP',     slot: 0 },
];

export function exportXLSX(schedule, staff, year, month) {
  const weekdays = getWeekdays(year, month);
  const holidays = getFrenchHolidays(year);
  const weeks    = groupByWeek(weekdays);
  const getName  = id => (id ? staff.find(s => s.id === id)?.name ?? '' : '');

  const wb = XLSX.utils.book_new();

  weeks.forEach((weekDays, wi) => {
    const firstDay  = weekDays[0];
    const weekLabel = `Semaine ${firstDay.getDate()} ${MONTH_NAMES[month - 1]}`;

    // ── Ligne 1 : noms des jours ───────────────────────────────────────────
    const row1 = [''];
    weekDays.forEach(day => {
      const dateStr   = formatDate(day);
      const isHoliday = holidays.has(dateStr);
      const label     = isHoliday
        ? `${DAY_NAMES[day.getDay()]} ${day.getDate()} — ${holidays.get(dateStr)}`
        : `${DAY_NAMES[day.getDay()]} ${day.getDate()}`;
      row1.push(label, ''); // AM col + PM col (fusionnés)
    });

    // ── Ligne 2 : sous-en-têtes AM / PM ───────────────────────────────────
    const row2 = [weekLabel];
    weekDays.forEach(() => row2.push('AM', 'PM'));

    // ── Ligne 3 : Avis (rôle journalier, nom fusionné AM+PM) ──────────────
    const avisRow = ['Avis'];
    weekDays.forEach(day => {
      const dateStr   = formatDate(day);
      const d         = schedule[dateStr];
      const isHoliday = holidays.has(dateStr);
      if (!d || isHoliday) {
        avisRow.push(isHoliday ? 'Férié' : '', '');
      } else {
        // Nom dans la cellule AM, fusionnée avec PM
        avisRow.push(getName(d.avis), '');
      }
    });

    // ── Lignes de postes (Scanner, IRM, Écho, RCP) ────────────────────────
    const postRowsData = POST_ROWS.map(({ label, type, slot }) => {
      const row = [label];
      weekDays.forEach(day => {
        const dateStr   = formatDate(day);
        const d         = schedule[dateStr];
        const isHoliday = holidays.has(dateStr);
        if (!d || isHoliday) {
          row.push('', '');
          return;
        }
        // nth poste de ce type dans chaque période
        const get = period => {
          const matches = d[period].filter(p => p.type === type);
          return getName(matches[slot]?.staffId ?? null);
        };
        row.push(get('morning'), get('afternoon'));
      });
      return row;
    });

    // ── Assemblage ────────────────────────────────────────────────────────
    const wsData = [row1, row2, avisRow, ...postRowsData];
    const ws     = XLSX.utils.aoa_to_sheet(wsData);

    // ── Fusions ───────────────────────────────────────────────────────────
    ws['!merges'] = [];
    weekDays.forEach((_, i) => {
      const amCol = 1 + i * 2;
      const pmCol = amCol + 1;
      // Ligne 1 : fusion du nom du jour sur AM+PM (row index 0)
      ws['!merges'].push({ s: { r: 0, c: amCol }, e: { r: 0, c: pmCol } });
      // Ligne 3 : fusion Avis sur AM+PM (row index 2)
      ws['!merges'].push({ s: { r: 2, c: amCol }, e: { r: 2, c: pmCol } });
    });

    // ── Largeurs des colonnes ─────────────────────────────────────────────
    ws['!cols'] = [
      { wch: 12 },                                 // Colonne A : label
      ...weekDays.flatMap(() => [{ wch: 20 }, { wch: 20 }]), // AM + PM par jour
    ];

    // ── Nom de la feuille : "sem DD - MM" ─────────────────────────────────
    const sheetName = `sem ${String(firstDay.getDate()).padStart(2, '0')} - ${String(month).padStart(2, '0')}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `planning-radio-${year}-${String(month).padStart(2, '0')}.xlsx`);
}
