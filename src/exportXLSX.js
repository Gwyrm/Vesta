import * as XLSX from 'xlsx';
import {
  getWeekdays,
  groupByWeek,
  formatDate,
  DAY_NAMES,
  MONTH_NAMES,
  DAY_TEMPLATES,
  POST_TYPES,
  POST_LABELS,
  getFrenchHolidays,
} from './scheduler.js';

// ─── Lignes de postes ────────────────────────────────────────────────────────
//
// On génère dynamiquement les lignes en fonction du nombre maximal
// d'occurrences de chaque type dans une demi-journée (à travers tous les jours).
// Ex. IRMDigestive apparaît 2 fois jeudi après-midi → 2 lignes.
//
// Une feuille Excel par semaine, nommée "sem DD - MM".
// ─────────────────────────────────────────────────────────────────────────────

function computePostRows() {
  const maxOccurrences = Object.fromEntries(POST_TYPES.map(t => [t, 0]));
  for (const dow of [1, 2, 3, 4, 5]) {
    const tmpl = DAY_TEMPLATES[dow];
    for (const period of ['morning', 'afternoon']) {
      const counts = {};
      for (const t of tmpl[period]) counts[t] = (counts[t] ?? 0) + 1;
      for (const [t, c] of Object.entries(counts)) {
        if (c > maxOccurrences[t]) maxOccurrences[t] = c;
      }
    }
  }

  const rows = [];
  for (const t of POST_TYPES) {
    const count = maxOccurrences[t];
    if (count === 0) continue;
    if (count === 1) {
      rows.push({ label: POST_LABELS[t], type: t, slot: 0 });
    } else {
      for (let i = 0; i < count; i++) {
        rows.push({ label: `${POST_LABELS[t]} ${i + 1}`, type: t, slot: i });
      }
    }
  }
  return rows;
}

const POST_ROWS = computePostRows();

export function exportXLSX(schedule, staff, year, month) {
  const weekdays = getWeekdays(year, month);
  const holidays = getFrenchHolidays(year);
  const weeks    = groupByWeek(weekdays);
  const getName  = id => (id ? staff.find(s => s.id === id)?.name ?? '' : '');

  const wb = XLSX.utils.book_new();

  weeks.forEach((weekDays) => {
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
      row1.push(label, '');
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
        avisRow.push(getName(d.avis), '');
      }
    });

    // ── Lignes de postes ──────────────────────────────────────────────────
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
      ws['!merges'].push({ s: { r: 0, c: amCol }, e: { r: 0, c: pmCol } });
      ws['!merges'].push({ s: { r: 2, c: amCol }, e: { r: 2, c: pmCol } });
    });

    // ── Largeurs des colonnes ─────────────────────────────────────────────
    ws['!cols'] = [
      { wch: 16 },
      ...weekDays.flatMap(() => [{ wch: 20 }, { wch: 20 }]),
    ];

    const sheetName = `sem ${String(firstDay.getDate()).padStart(2, '0')} - ${String(month).padStart(2, '0')}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `planning-radio-${year}-${String(month).padStart(2, '0')}.xlsx`);
}
