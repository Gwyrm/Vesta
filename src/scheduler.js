// ─── Constants ───────────────────────────────────────────────────────────────

export const DAY_NAMES = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
];

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ─── Postes (spécialisés) ────────────────────────────────────────────────────

export const POST_TYPES = [
  'ScannerDigestif', 'ScannerUrologique',
  'IRMDigestive',    'IRMUrologique',
  'EchoDigestive',   'EchoUrologique',
  'RCPDigestive',    'RCPUrologique',  'RCPFoie',
];

export const POST_LABELS = {
  ScannerDigestif:   'Scanner dig.',
  ScannerUrologique: 'Scanner uro.',
  IRMDigestive:      'IRM dig.',
  IRMUrologique:     'IRM uro.',
  EchoDigestive:     'Écho dig.',
  EchoUrologique:    'Écho uro.',
  RCPDigestive:      'RCP dig.',
  RCPUrologique:     'RCP uro.',
  RCPFoie:           'RCP foie',
  Avis:              'Avis',
};

export const POST_FAMILY = {
  ScannerDigestif:   'Scanner',
  ScannerUrologique: 'Scanner',
  IRMDigestive:      'IRM',
  IRMUrologique:     'IRM',
  EchoDigestive:     'Echo',
  EchoUrologique:    'Echo',
  RCPDigestive:      'RCP',
  RCPUrologique:     'RCP',
  RCPFoie:           'RCP',
};

export const FAMILY_LABELS = {
  Scanner: 'Scanner',
  IRM:     'IRM',
  Echo:    'Écho',
  RCP:     'RCP',
  Avis:    'Avis',
};

/**
 * Postes par jour de semaine (1=Lun … 5=Ven).
 * Les postes peuvent apparaître plusieurs fois (ex. jeudi après-midi = 2 IRM digestives).
 */
export const DAY_TEMPLATES = {
  1: { // Lundi
    morning:   ['ScannerDigestif', 'IRMUrologique'],
    afternoon: ['ScannerDigestif', 'RCPUrologique'],
  },
  2: { // Mardi
    morning:   ['ScannerDigestif', 'ScannerUrologique', 'IRMDigestive'],
    afternoon: ['EchoDigestive', 'ScannerDigestif'],
  },
  3: { // Mercredi
    morning:   ['ScannerUrologique'],
    afternoon: ['ScannerDigestif', 'RCPDigestive'],
  },
  4: { // Jeudi
    morning:   ['ScannerDigestif', 'RCPFoie'],
    afternoon: ['IRMDigestive', 'IRMDigestive', 'IRMUrologique'],
  },
  5: { // Vendredi
    morning:   ['EchoDigestive', 'ScannerUrologique'],
    afternoon: ['EchoUrologique', 'ScannerDigestif', 'IRMDigestive'],
  },
};

// ─── Styles (par famille, avec alias par type spécialisé) ────────────────────

export const FAMILY_STYLES = {
  Scanner: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700'    },
  IRM:     { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-700' },
  Echo:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700'},
  RCP:     { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700' },
  Avis:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700'   },
};

// Compatibilité : permet à ScheduleView de récupérer le style à partir du type spécialisé ou « Avis »
export const POST_STYLES = {
  ...Object.fromEntries(POST_TYPES.map(t => [t, FAMILY_STYLES[POST_FAMILY[t]]])),
  Avis: FAMILY_STYLES.Avis,
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(date) {
  return (
    date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0')
  );
}

/** Toutes les dates lun–ven du mois donné. */
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
 * Regroupe les jours par semaine (chaque sous-tableau commence par un lundi
 * — ou par le premier jour si le mois ne commence pas un lundi).
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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function shiftDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

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

// ─── ISO week (key stable across year boundaries) ────────────────────────────

function isoWeekKey(date) {
  const d = new Date(date);
  const dow = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - dow + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

function makeWorkload() {
  const w = { avis: 0, total: 0 };
  for (const t of POST_TYPES) w[t] = 0;
  return w;
}

/**
 * Génération principale du planning internes.
 *
 *   schedule[dateStr] = {
 *     avis: staffId | null,
 *     avisPeriod: 'morning' | 'afternoon' | null,    // période avec scanner/IRM
 *     avisRcpPeriod: 'morning' | 'afternoon' | null, // période avec RCP (si jour RCP)
 *     morning:   [{ type, staffId }],
 *     afternoon: [{ type, staffId }],
 *   }
 *   workloads[staffId] = { ScannerDigestif, …, RCPFoie, avis, total }
 *
 * `locks` (optionnel) — verrous manuels :
 *   locks[dateStr] = {
 *     avis?:        staffId | null,    // null = explicitement non assigné
 *     morning?:     { [idx]: staffId | null },
 *     afternoon?:   { [idx]: staffId | null },
 *   }
 *
 * `offs` (optionnel) — demi-journées « off » imposées par l'utilisateur, sous
 * forme `{ "<staffId>::YYYY-MM-DD-morning": true, … }` (similaire aux absences).
 */
export function generateSchedule(staff, year, month, locks = {}, offs = {}) {
  if (!staff.length) return { schedule: {}, workloads: {} };

  const weekdays = getWeekdays(year, month);
  const holidays = getFrenchHolidays(year);

  const workloads = Object.fromEntries(staff.map(s => [s.id, makeWorkload()]));

  // ── Budget hebdomadaire (max 8 demi-journées utilisées par personne) ──
  const weekBudget = {};
  const budgetKey  = (id, date) => `${id}::${isoWeekKey(date)}`;
  const getUsed    = (id, date) => weekBudget[budgetKey(id, date)] || 0;
  const addUsed    = (id, date, n = 1) => {
    const k = budgetKey(id, date);
    weekBudget[k] = (weekBudget[k] || 0) + n;
  };

  // ── Compteur d'avis par semaine ──
  const weeklyAvis = {};
  const avisWeekKey = (id, date) => `${id}::${isoWeekKey(date)}`;
  const getAvisWeek = (id, date) => weeklyAvis[avisWeekKey(id, date)] || 0;
  const incAvisWeek = (id, date) => {
    const k = avisWeekKey(id, date);
    weeklyAvis[k] = (weeklyAvis[k] || 0) + 1;
  };

  // ── Jour précédent (pour interdire 2 avis consécutifs si possible) ──
  let prevAvisId = null;

  // ── Helpers ──
  const isAbsent = (person, dateStr, period) =>
    person.absences?.includes(`${dateStr}-${period}`);
  const isOff = (staffId, dateStr, period) =>
    !!offs[`${staffId}::${dateStr}-${period}`];
  const personById = id => staff.find(s => s.id === id) ?? null;

  const schedule = {};

  for (const day of weekdays) {
    const dateStr = formatDate(day);
    if (holidays.has(dateStr)) continue;
    const tmpl     = DAY_TEMPLATES[day.getDay()];
    const dayLocks = locks[dateStr] ?? {};

    // ── Disponibilité par personne ──────────────────────────────────────────
    const avail = {};
    for (const s of staff) {
      const abM  = isAbsent(s, dateStr, 'morning');
      const abA  = isAbsent(s, dateStr, 'afternoon');
      const offM = isOff(s.id, dateStr, 'morning');
      const offA = isOff(s.id, dateStr, 'afternoon');
      const used = getUsed(s.id, day);
      avail[s.id] = {
        morning:      !abM && !offM && used < 8,
        afternoon:    !abA && !offA && used < 8,
        absMorning:   abM,
        absAfternoon: abA,
        offMorning:   offM,
        offAfternoon: offA,
      };
    }

    // ── Détermination des périodes pour l'avis ──────────────────────────────
    // Règles :
    //   • avis posté sur 1 poste Scanner/IRM, dans une seule période (préférence : matin)
    //   • si un RCP existe ce jour : avis aussi posté sur RCP, dans l'autre période
    //   • si Scanner/IRM ET RCP sont sur la même période, l'avis prend RCP cette
    //     période et Scanner/IRM dans l'autre
    const familiesIn = period => new Set(tmpl[period].map(t => POST_FAMILY[t]));
    const morningFams   = familiesIn('morning');
    const afternoonFams = familiesIn('afternoon');
    const morningHasSI    = morningFams.has('Scanner')   || morningFams.has('IRM');
    const afternoonHasSI  = afternoonFams.has('Scanner') || afternoonFams.has('IRM');
    const morningHasRCP   = morningFams.has('RCP');
    const afternoonHasRCP = afternoonFams.has('RCP');
    const dayHasRCP       = morningHasRCP || afternoonHasRCP;

    let mainPeriod = null;  // période où l'avis prend Scanner/IRM
    let rcpPeriod  = null;  // période où l'avis prend RCP (si jour RCP)

    if (dayHasRCP) {
      if (afternoonHasRCP && !morningHasRCP && morningHasSI) {
        mainPeriod = 'morning';   rcpPeriod = 'afternoon';
      } else if (morningHasRCP && !afternoonHasRCP && afternoonHasSI) {
        mainPeriod = 'afternoon'; rcpPeriod = 'morning';
      } else if (morningHasRCP && afternoonHasSI) {
        mainPeriod = 'afternoon'; rcpPeriod = 'morning';
      } else if (afternoonHasRCP && morningHasSI) {
        mainPeriod = 'morning';   rcpPeriod = 'afternoon';
      } else {
        // Cas dégénéré
        mainPeriod = morningHasSI ? 'morning' : (afternoonHasSI ? 'afternoon' : null);
        rcpPeriod  = morningHasRCP ? 'morning' : 'afternoon';
        if (mainPeriod === rcpPeriod) mainPeriod = null;
      }
    } else {
      mainPeriod = morningHasSI ? 'morning' : (afternoonHasSI ? 'afternoon' : null);
      rcpPeriod  = null;
    }

    // ── Sélection de la personne d'avis ─────────────────────────────────────
    let avisId       = null;
    let avisLockUsed = false;

    if (dayLocks.avis !== undefined) {
      avisLockUsed = true;
      avisId = dayLocks.avis;
      if (avisId && !personById(avisId)) avisId = null;
    } else if (mainPeriod) {
      // Eligibilité :
      //   • rôle ≠ 'socle'
      //   • mainPeriod disponible
      //   • si jour RCP : rcpPeriod aussi disponible
      let candidates = staff.filter(s => {
        if (s.role === 'socle') return false;
        const a = avail[s.id];
        if (!a[mainPeriod]) return false;
        if (rcpPeriod && !a[rcpPeriod]) return false;
        const consume = (!a.absMorning && !a.offMorning ? 1 : 0)
                      + (!a.absAfternoon && !a.offAfternoon ? 1 : 0);
        return getUsed(s.id, day) + consume <= 8;
      });

      candidates.sort((a, b) => {
        // Soft : préférer ceux qui n'ont pas atteint 2 avis cette semaine
        const aOver = getAvisWeek(a.id, day) >= 2 ? 1 : 0;
        const bOver = getAvisWeek(b.id, day) >= 2 ? 1 : 0;
        if (aOver !== bOver) return aOver - bOver;

        // Soft : éviter 2 jours consécutifs
        const aPrev = a.id === prevAvisId ? 1 : 0;
        const bPrev = b.id === prevAvisId ? 1 : 0;
        if (aPrev !== bPrev) return aPrev - bPrev;

        const da = workloads[a.id].avis - workloads[b.id].avis;
        if (da !== 0) return da;

        const dt = workloads[a.id].total - workloads[b.id].total;
        if (dt !== 0) return dt;

        return a.name.localeCompare(b.name);
      });

      avisId = candidates[0]?.id ?? null;
    }

    // Si auto-sélection et avis pas dispo dans une période requise → pas d'avis
    if (avisId && !avisLockUsed) {
      const a = avail[avisId];
      if (mainPeriod && !a[mainPeriod]) avisId = null;
      else if (rcpPeriod && !a[rcpPeriod]) avisId = null;
    }

    let avisPeriod    = null;
    let avisRcpPeriod = null;

    if (avisId) {
      avisPeriod    = mainPeriod;
      avisRcpPeriod = rcpPeriod;

      workloads[avisId].avis++;
      incAvisWeek(avisId, day);

      const a = avail[avisId];
      if (!a.absMorning   && !a.offMorning)   addUsed(avisId, day);
      if (!a.absAfternoon && !a.offAfternoon) addUsed(avisId, day);
    }

    // ── Pré-positionnement des slots avis ───────────────────────────────────
    const scannerToday = new Set();

    let avisSIIdx = -1;
    if (avisId && avisPeriod) {
      avisSIIdx = tmpl[avisPeriod].findIndex(t => {
        const fam = POST_FAMILY[t];
        return fam === 'Scanner' || fam === 'IRM';
      });
    }
    let avisRcpIdx = -1;
    if (avisId && avisRcpPeriod) {
      avisRcpIdx = tmpl[avisRcpPeriod].findIndex(t => POST_FAMILY[t] === 'RCP');
    }

    // ── Assignation des postes ──────────────────────────────────────────────
    const FAMILY_PRIORITY = { Echo: 0, Scanner: 1, RCP: 2, IRM: 3 };

    const assignPosts = (postTypes, period) => {
      const usedThisPeriod = new Set();
      const results = new Array(postTypes.length).fill(null);
      const periodLocks = dayLocks[period] ?? {};

      // 1) Verrous manuels d'abord
      for (let idx = 0; idx < postTypes.length; idx++) {
        if (idx in periodLocks) {
          const lockedId = periodLocks[idx];
          results[idx] = { type: postTypes[idx], staffId: lockedId };
          if (lockedId) {
            usedThisPeriod.add(lockedId);
            workloads[lockedId][postTypes[idx]]++;
            workloads[lockedId].total++;
            if (POST_FAMILY[postTypes[idx]] === 'Scanner') scannerToday.add(lockedId);
            if (lockedId !== avisId) addUsed(lockedId, day);
          }
        }
      }

      // 2) Pré-place le slot Scanner/IRM de l'avis
      if (avisId && period === avisPeriod && avisSIIdx >= 0
          && results[avisSIIdx] === null) {
        const t = postTypes[avisSIIdx];
        results[avisSIIdx] = { type: t, staffId: avisId };
        usedThisPeriod.add(avisId);
        workloads[avisId][t]++;
        workloads[avisId].total++;
        if (POST_FAMILY[t] === 'Scanner') scannerToday.add(avisId);
      }

      // 3) Pré-place le slot RCP de l'avis
      if (avisId && period === avisRcpPeriod && avisRcpIdx >= 0
          && results[avisRcpIdx] === null) {
        const t = postTypes[avisRcpIdx];
        results[avisRcpIdx] = { type: t, staffId: avisId };
        usedThisPeriod.add(avisId);
        workloads[avisId][t]++;
        workloads[avisId].total++;
      }

      // 4) Tri des slots restants par priorité famille (Echo > Scanner > RCP > IRM)
      const order = postTypes
        .map((type, idx) => ({ type, idx, family: POST_FAMILY[type] }))
        .filter(o => results[o.idx] === null)
        .sort((a, b) =>
          (FAMILY_PRIORITY[a.family] ?? 99) - (FAMILY_PRIORITY[b.family] ?? 99)
        );

      for (const { type: postType, idx, family } of order) {
        let candidates = staff.filter(s => {
          if (usedThisPeriod.has(s.id)) return false;
          if (s.id === avisId) return false; // déjà placé(e) sur ses slots
          if (!avail[s.id][period]) return false;
          return true;
        });

        // Règle socle : poste ≠ Echo et ≠ IRM → supervision par un interne
        // déjà posté dans la même période
        if (family !== 'Echo' && family !== 'IRM') {
          const internInPeriod = [...usedThisPeriod].some(
            id => personById(id)?.role === 'intern'
          );
          if (!internInPeriod) {
            candidates = candidates.filter(s => s.role !== 'socle');
          }
        }

        // Soft : éviter 2 scanners pour la même personne sur la même journée
        if (family === 'Scanner') {
          const pref = candidates.filter(s => !scannerToday.has(s.id));
          if (pref.length > 0) candidates = pref;
        }

        if (!candidates.length) {
          results[idx] = { type: postType, staffId: null };
          continue;
        }

        candidates.sort((a, b) => {
          const dt = workloads[a.id][postType] - workloads[b.id][postType];
          if (dt !== 0) return dt;
          const dd = workloads[a.id].total - workloads[b.id].total;
          if (dd !== 0) return dd;
          return a.name.localeCompare(b.name);
        });

        const sel = candidates[0];
        results[idx] = { type: postType, staffId: sel.id };
        usedThisPeriod.add(sel.id);
        workloads[sel.id][postType]++;
        workloads[sel.id].total++;
        if (family === 'Scanner') scannerToday.add(sel.id);

        addUsed(sel.id, day);
        if (period === 'morning' && getUsed(sel.id, day) >= 8) {
          avail[sel.id].afternoon = false;
        }
      }

      return results;
    };

    const morningPosts   = assignPosts(tmpl.morning,   'morning');
    const afternoonPosts = assignPosts(tmpl.afternoon, 'afternoon');

    schedule[dateStr] = {
      avis:          avisId,
      avisPeriod,
      avisRcpPeriod,
      morning:       morningPosts,
      afternoon:     afternoonPosts,
    };

    if (avisId) prevAvisId = avisId;
  }

  return { schedule, workloads };
}
