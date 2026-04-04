// ─── Constants ───────────────────────────────────────────────────────────────

export const DAY_NAMES = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
];

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Posts per day-of-week (1=Mon … 5=Fri).
 * Arrays can contain duplicate types (e.g. Tuesday morning has two Scanners).
 */
export const DAY_TEMPLATES = {
  1: { morning: ['Scanner', 'IRM'],           afternoon: ['Scanner', 'RCP'] },
  2: { morning: ['Scanner', 'Scanner', 'IRM'], afternoon: ['Echo', 'Scanner'] },
  3: { morning: ['Scanner'],                   afternoon: ['Scanner', 'RCP'] },
  4: { morning: ['Scanner', 'RCP'],            afternoon: ['IRM', 'IRM', 'IRM'] },
  5: { morning: ['Echo', 'Scanner'],           afternoon: ['Echo', 'Scanner', 'IRM'] },
};

export const POST_STYLES = {
  Scanner: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  IRM:     { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  Echo:    { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500'},
  RCP:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  Avis:    { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(date) {
  return (
    date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0')
  );
}

/** All Mon–Fri dates in the given month. */
export function getWeekdays(year, month) {
  const days = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/**
 * Group weekdays into Mon–Fri chunks.
 * A new group starts whenever we hit a Monday (or the very first day).
 */
export function groupByWeek(weekdays) {
  const weeks = [];
  let cur = [];
  for (const day of weekdays) {
    if (cur.length > 0 && day.getDay() === 1) {
      weeks.push(cur);
      cur = [];
    }
    cur.push(day);
  }
  if (cur.length) weeks.push(cur);
  return weeks;
}

// ─── Jours fériés français ────────────────────────────────────────────────────

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexé
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function shiftDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Retourne une Map<dateStr, nomFérié> pour l'année donnée.
 * Inclut tous les jours fériés légaux en France métropolitaine.
 */
export function getFrenchHolidays(year) {
  const map   = new Map();
  const add   = (d, name) => map.set(formatDate(d), name);
  const fixed = (mo, da, name) => add(new Date(year, mo - 1, da), name);
  const rel   = (base, n, name) => add(shiftDays(base, n), name);

  const easter = easterSunday(year);

  fixed(1,  1,  "Jour de l'an");
  rel(easter, 1,  'Lundi de Pâques');
  fixed(5,  1,  'Fête du Travail');
  fixed(5,  8,  'Victoire 1945');
  rel(easter, 39, 'Ascension');
  rel(easter, 50, 'Lundi de Pentecôte');
  fixed(7,  14, 'Fête Nationale');
  fixed(8,  15, 'Assomption');
  fixed(11, 1,  'Toussaint');
  fixed(11, 11, 'Armistice');
  fixed(12, 25, 'Noël');

  return map;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

/**
 * Build an ISO-week key that is stable across year boundaries.
 * Uses the Monday of the week as the canonical anchor.
 */
function isoWeekKey(date) {
  const d = new Date(date);
  // shift to the Monday of this week
  const dow = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - dow + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Main scheduling function.
 *
 * Returns { schedule, workloads } where:
 *
 *   schedule[dateStr] = {
 *     avis: staffId | null,
 *     avisPeriod: 'morning' | 'afternoon' | null,
 *     morning: [{ type, staffId }],
 *     afternoon: [{ type, staffId }],
 *   }
 *
 *   workloads[staffId] = { scanner, irm, echo, rcp, avis, total }
 */
export function generateSchedule(staff, year, month) {
  if (!staff.length) return { schedule: {}, workloads: {} };

  const weekdays = getWeekdays(year, month);
  const holidays = getFrenchHolidays(year);

  // ── Workload counters ──────────────────────────────────────────────────────
  const workloads = Object.fromEntries(
    staff.map(s => [s.id, { scanner: 0, irm: 0, echo: 0, rcp: 0, avis: 0, total: 0 }])
  );

  // ── Weekly half-day budget: max 8 used per person per week (≥ 2 free) ──────
  // Key: `${staffId}::${isoWeekKey}`  →  count of half-days consumed
  const weekBudget = {};
  const budgetKey  = (id, date) => `${id}::${isoWeekKey(date)}`;
  const getUsed    = (id, date) => weekBudget[budgetKey(id, date)] || 0;
  const addUsed    = (id, date, n = 1) => {
    const k = budgetKey(id, date);
    weekBudget[k] = (weekBudget[k] || 0) + n;
  };

  // ── Absence helper ────────────────────────────────────────────────────────
  const isAbsent = (person, dateStr, period) =>
    person.absences.includes(`${dateStr}-${period}`);

  // ── Result ────────────────────────────────────────────────────────────────
  const schedule = {};

  // ─────────────────────────────────────────────────────────────────────────
  for (const day of weekdays) {
    const dateStr = formatDate(day);
    if (holidays.has(dateStr)) continue; // jour férié : personne ne travaille
    const tmpl    = DAY_TEMPLATES[day.getDay()];

    // Compute per-person availability snapshot for this day
    // avail[id] = { morning: bool, afternoon: bool, absMorning: bool, absAfternoon: bool }
    const avail = {};
    for (const s of staff) {
      const abM  = isAbsent(s, dateStr, 'morning');
      const abA  = isAbsent(s, dateStr, 'afternoon');
      const used = getUsed(s.id, day);
      avail[s.id] = {
        morning:     !abM && used < 8,
        afternoon:   !abA && used < 8,
        absMorning:  abM,
        absAfternoon: abA,
      };
    }

    // ── 1. Select AVIS ──────────────────────────────────────────────────────
    // Eligible: has at least one free half-day AND enough weekly budget left
    const avisEligible = staff.filter(s => {
      const a = avail[s.id];
      if (!a.morning && !a.afternoon) return false;
      // Avis consumes both present half-days from the weekly budget
      const consume = (!a.absMorning ? 1 : 0) + (!a.absAfternoon ? 1 : 0);
      return getUsed(s.id, day) + consume <= 8;
    });

    let avisId     = null;
    let avisPeriod = null;

    if (avisEligible.length > 0) {
      // Pick person with fewest avis, then fewest total posts (tie-break by name)
      avisEligible.sort((a, b) => {
        const da = workloads[a.id].avis - workloads[b.id].avis;
        if (da !== 0) return da;
        const dt = workloads[a.id].total - workloads[b.id].total;
        if (dt !== 0) return dt;
        return a.name.localeCompare(b.name);
      });

      const avisPerson = avisEligible[0];
      avisId = avisPerson.id;
      workloads[avisId].avis++;

      // Decide which period the avis person is POSTED on:
      //   1. Prefer afternoon if it has RCP
      //   2. Prefer morning if it has RCP
      //   3. Otherwise pick the period where they lag most in workload
      const a         = avail[avisId];
      const afHasRCP  = tmpl.afternoon.includes('RCP');
      const mHasRCP   = tmpl.morning.includes('RCP');

      if      (afHasRCP && a.afternoon) avisPeriod = 'afternoon';
      else if (mHasRCP  && a.morning)   avisPeriod = 'morning';
      else if (a.morning && a.afternoon) {
        // pick the period where current workload for those post-types is lower
        const mScore = tmpl.morning.reduce(
          (sum, t) => sum + workloads[avisId][t.toLowerCase()], 0
        );
        const aScore = tmpl.afternoon.reduce(
          (sum, t) => sum + workloads[avisId][t.toLowerCase()], 0
        );
        avisPeriod = mScore <= aScore ? 'morning' : 'afternoon';
      } else {
        avisPeriod = a.morning ? 'morning' : 'afternoon';
      }

      // Consume weekly budget for BOTH present half-days (neither is truly free)
      if (!a.absMorning)    addUsed(avisId, day);
      if (!a.absAfternoon)  addUsed(avisId, day);

      // Restrict avis person: they can only appear in their assigned period
      avail[avisId] = {
        ...a,
        morning:   avisPeriod === 'morning'   && !a.absMorning,
        afternoon: avisPeriod === 'afternoon' && !a.absAfternoon,
      };
    }

    // ── 2. Assign posts (morning then afternoon) ─────────────────────────────
    const scannerToday = new Set();

    // ── Pre-assign the avis person's guaranteed slot ──────────────────────────
    // Rule 1 : avis person CANNOT be posted on Echo.
    //   Slot priority: RCP → first non-Echo slot → nothing (all-Echo, edge case).
    // Rule 2 : if the chosen slot is RCP, the avis person MAY ALSO be posted on
    //   Scanner or IRM in the OTHER half-day of the same day.
    let avisSlotPeriod = null;
    let avisSlotIdx    = -1;
    let avisSlotType   = null;
    let avisCanDoOther = false; // unlocked by Rule 2

    if (avisId && avisPeriod && avail[avisId][avisPeriod]) {
      const periodPosts = tmpl[avisPeriod];
      // Prefer RCP, then first non-Echo slot (Rule 1: skip Echo)
      let idx = periodPosts.findIndex(t => t === 'RCP');
      if (idx === -1) idx = periodPosts.findIndex(t => t !== 'Echo');

      if (idx >= 0) {
        avisSlotPeriod = avisPeriod;
        avisSlotIdx    = idx;
        avisSlotType   = periodPosts[idx];
        workloads[avisId][avisSlotType.toLowerCase()]++;
        workloads[avisId].total++;
        if (avisSlotType === 'Scanner') scannerToday.add(avisId);
        // Rule 2: RCP post unlocks the other half-day for Scanner/IRM
        if (avisSlotType === 'RCP') avisCanDoOther = true;
        // Note: weekly budget for BOTH half-days was already consumed above.
      }
    }

    // Rule 3 — processing priority when staff is short:
    //   Echo (0) > Scanner (1) > RCP (2) > IRM (3)
    //   Slots are processed in this order so that if candidates run out,
    //   IRM slots are the ones left unassigned, not Echo/Scanner.
    const POST_PRIORITY = { Echo: 0, Scanner: 1, RCP: 2, IRM: 3 };

    const assignPosts = (postTypes, period) => {
      const usedThisPeriod = new Set();
      const results = new Array(postTypes.length).fill(null);

      // Pre-fill the avis person's guaranteed slot (prevents them being pushed out).
      // Exception socle : le slot avis est exempté de la règle de supervision —
      // ce jour-là le socle est considéré supervisé par le radiologue référent.
      if (avisSlotPeriod === period && avisSlotIdx >= 0) {
        results[avisSlotIdx] = { type: avisSlotType, staffId: avisId };
        usedThisPeriod.add(avisId);
        // Si l'avis person est un interne, les socles pourront être assignés
        // sur les autres slots de cette période sans problème.
      }

      // Sort slots by priority so Echo/Scanner are filled before IRM (Rule 3)
      const order = postTypes
        .map((type, idx) => ({ type, idx }))
        .sort((a, b) => (POST_PRIORITY[a.type] ?? 99) - (POST_PRIORITY[b.type] ?? 99));

      for (const { type: postType, idx } of order) {
        if (results[idx] !== null) continue; // already pre-filled

        let candidates = staff.filter(s => {
          if (usedThisPeriod.has(s.id)) return false;

          // ── Avis person special handling ──
          if (s.id === avisId) {
            // Their own period: slot is already pre-filled above, skip
            if (avisSlotPeriod === period) return false;
            // Other period (Rule 2): only Scanner/IRM, only if not absent there
            if (avisCanDoOther) {
              const absKey = period === 'morning' ? 'absMorning' : 'absAfternoon';
              if (avail[avisId][absKey]) return false;          // absent this period
              return postType === 'Scanner' || postType === 'IRM'; // Rule 1 implied (no Echo)
            }
            return false;
          }

          // Regular person
          if (!avail[s.id][period]) return false;
          return true;
        });

        // Règle socle : une personne 'socle' ne peut être postée sur un poste
        // non-Echo que si au moins un 'interne' est déjà assigné dans cette
        // même demi-journée (supervision obligatoire).
        if (postType !== 'Echo') {
          const internInPeriod = [...usedThisPeriod].some(
            id => staff.find(s => s.id === id)?.role === 'intern'
          );
          if (!internInPeriod) {
            candidates = candidates.filter(s => s.role !== 'socle');
          }
        }

        // Soft rule: avoid a second Scanner for the same person in the same day
        if (postType === 'Scanner') {
          const pref = candidates.filter(s => !scannerToday.has(s.id));
          if (pref.length > 0) candidates = pref;
        }

        if (!candidates.length) {
          results[idx] = { type: postType, staffId: null };
          continue;
        }

        // Pick the person with the lowest workload for this post type
        candidates.sort((a, b) => {
          const tk = postType.toLowerCase();
          const dt = workloads[a.id][tk] - workloads[b.id][tk];
          if (dt !== 0) return dt;
          const dd = workloads[a.id].total - workloads[b.id].total;
          if (dd !== 0) return dd;
          return a.name.localeCompare(b.name);
        });

        const sel = candidates[0];
        results[idx] = { type: postType, staffId: sel.id };
        usedThisPeriod.add(sel.id);
        workloads[sel.id][postType.toLowerCase()]++;
        workloads[sel.id].total++;
        if (postType === 'Scanner') scannerToday.add(sel.id);

        // Consume weekly budget.
        // Avis person's budget was already consumed for both half-days at avis selection;
        // if they appear here via Rule 2, no extra charge is needed.
        if (sel.id !== avisId) {
          addUsed(sel.id, day);
          if (period === 'morning' && getUsed(sel.id, day) >= 8) {
            avail[sel.id].afternoon = false;
          }
        }
      }

      return results;
    };

    const morningPosts   = assignPosts(tmpl.morning,   'morning');
    const afternoonPosts = assignPosts(tmpl.afternoon, 'afternoon');

    schedule[dateStr] = {
      avis:       avisId,
      avisPeriod,
      morning:    morningPosts,
      afternoon:  afternoonPosts,
    };
  }

  return { schedule, workloads };
}
