import { formatDate, getFrenchHolidays, DAY_NAMES, MONTH_NAMES } from './scheduler.js';

export { formatDate, getFrenchHolidays, DAY_NAMES, MONTH_NAMES };

// ─── Spécialités ──────────────────────────────────────────────────────────────

export const SPECIALTY_KEYS = ['ctv', 'digestif', 'osteo', 'pediatrie', 'autre'];

export const SPECIALTIES = {
  ctv:       { label: 'CTV',              posts: ['CoursRemond', 'RadioThoracique', 'ScannerThoracique'] },
  digestif:  { label: 'Digestif',          posts: ['EchoDigestive', 'ScannerDigestif'] },
  osteo:     { label: 'Ostéo-articulaire', posts: ['RadioOsteoArtic', 'EchoOsteoArtic', 'ScannerOsteoArtic'] },
  pediatrie: { label: 'Pédiatrie',         posts: ['RadioPédiatrique', 'EchoPédiatrique', 'ScannerPédiatrique'] },
  autre:     { label: 'Autre',             posts: ['EchoUrgences', 'IRMNeuro', 'RadioInterventionnelle'] },
};

export const SPECIALTY_STYLES = {
  ctv:       { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     dot: 'bg-sky-500',     badge: 'bg-sky-100 text-sky-700'      },
  digestif:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700'   },
  osteo:     { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-700'     },
  pediatrie: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700'},
  autre:     { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-700' },
};

// Type de poste → clé de spécialité
export const POST_SPECIALTY = {
  CoursRemond:            'ctv',
  RadioThoracique:        'ctv',
  ScannerThoracique:      'ctv',
  EchoDigestive:          'digestif',
  ScannerDigestif:        'digestif',
  RadioOsteoArtic:        'osteo',
  EchoOsteoArtic:         'osteo',
  ScannerOsteoArtic:      'osteo',
  RadioPédiatrique:       'pediatrie',
  EchoPédiatrique:        'pediatrie',
  ScannerPédiatrique:     'pediatrie',
  EchoUrgences:           'autre',
  IRMNeuro:               'autre',
  RadioInterventionnelle: 'autre',
};

export const POST_LABELS = {
  CoursRemond:            'Cours Rémond',
  RadioThoracique:        'Radio thoracique',
  ScannerThoracique:      'Scanner thoracique',
  EchoDigestive:          'Écho digestive',
  ScannerDigestif:        'Scanner digestif',
  RadioOsteoArtic:        'Radio ostéo-artic.',
  EchoOsteoArtic:         'Écho ostéo-artic.',
  ScannerOsteoArtic:      'Scanner ostéo-artic.',
  RadioPédiatrique:       'Radio pédiatrique',
  EchoPédiatrique:        'Écho pédiatrique',
  ScannerPédiatrique:     'Scanner pédiatrique',
  EchoUrgences:           'Écho urgences',
  IRMNeuro:               'IRM neuro',
  RadioInterventionnelle: 'Radio interv.',
};

// ─── Templates journaliers ────────────────────────────────────────────────────
// Les postes multi-personnes apparaissent plusieurs fois :
//   CoursRemond ×3 (2-3 personnes)  |  RadioInterventionnelle ×2  |  ScannerPédiatrique ×2
// RadioInterventionnelle apparaît matin ET après-midi (poste toute la journée)

export const DAY_TEMPLATES_EXTERNE = {
  1: { // Lundi
    morning:   ['RadioPédiatrique', 'EchoUrgences', 'ScannerOsteoArtic', 'ScannerDigestif', 'ScannerThoracique', 'IRMNeuro'],
    afternoon: ['RadioThoracique', 'RadioOsteoArtic', 'EchoPédiatrique', 'EchoOsteoArtic', 'ScannerDigestif', 'ScannerThoracique'],
  },
  2: { // Mardi
    morning:   ['RadioPédiatrique', 'EchoUrgences', 'CoursRemond', 'CoursRemond', 'CoursRemond', 'IRMNeuro'],
    afternoon: ['RadioThoracique', 'RadioOsteoArtic', 'EchoPédiatrique', 'EchoDigestive', 'ScannerOsteoArtic', 'IRMNeuro'],
  },
  3: { // Mercredi — RadioInterventionnelle toute la journée (×2 chaque demi-journée)
    morning:   ['RadioPédiatrique', 'EchoUrgences', 'RadioInterventionnelle', 'RadioInterventionnelle', 'ScannerOsteoArtic', 'IRMNeuro'],
    afternoon: ['RadioThoracique', 'RadioOsteoArtic', 'EchoPédiatrique', 'RadioInterventionnelle', 'RadioInterventionnelle', 'EchoOsteoArtic', 'ScannerDigestif'],
  },
  4: { // Jeudi
    morning:   ['RadioPédiatrique', 'EchoUrgences', 'ScannerDigestif', 'ScannerPédiatrique', 'ScannerPédiatrique'],
    afternoon: ['RadioThoracique', 'RadioOsteoArtic', 'EchoPédiatrique'],
  },
  5: { // Vendredi
    morning:   ['RadioPédiatrique', 'EchoUrgences', 'EchoDigestive', 'EchoOsteoArtic', 'IRMNeuro'],
    afternoon: ['RadioThoracique', 'RadioOsteoArtic', 'EchoPédiatrique', 'EchoOsteoArtic', 'ScannerDigestif', 'ScannerThoracique'],
  },
};

// ─── Helpers dates ────────────────────────────────────────────────────────────

/** Retourne le lundi de la semaine contenant `date`. */
export function getMondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Retourne `weekCount` tableaux de 5 dates (lun–ven par semaine). */
export function getExterneWeeks(startDate, weekCount = 6) {
  const weeks = [];
  const d = new Date(getMondayOf(startDate));
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let i = 0; i < 5; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    d.setDate(d.getDate() + 2); // saute sam + dim
    weeks.push(week);
  }
  return weeks;
}

/** Liste plate des jours ouvrés de la période. */
export function getExterneWeekdays(startDate, weekCount = 6) {
  return getExterneWeeks(startDate, weekCount).flat();
}

/**
 * Calcule le nombre de semaines (incluses, lun-ven) couvrant [startDate, endDate].
 * On compte combien de lundis tombent dans la fenêtre.
 */
export function computeWeekCount(startDate, endDate) {
  const startMon = getMondayOf(startDate);
  const endMon   = getMondayOf(endDate);
  const ms       = endMon.getTime() - startMon.getTime();
  if (ms < 0) return 1;
  return Math.floor(ms / (7 * 24 * 3600 * 1000)) + 1;
}

// ─── Rotation des spécialités ─────────────────────────────────────────────────

/**
 * Détermine si une personne est absente sur **toutes** les demi-journées
 * ouvrables d'une semaine (lundi matin → vendredi après-midi).
 */
function isFullyAbsentWeek(person, weekDays) {
  const absences = new Set(person.absences);
  for (const day of weekDays) {
    const ds = formatDate(day);
    if (!absences.has(`${ds}-morning`)) return false;
    if (!absences.has(`${ds}-afternoon`)) return false;
  }
  return true;
}

/**
 * Construit la rotation des spécialités sur `weekCount` semaines.
 * rotation[weekIdx][staffId] = specialtyKey | null
 *
 * Chaque personne i suit le cycle SPECIALTY_KEYS[(i + step) % 5].
 * Quand une personne est absente toute une semaine, elle ne consume pas
 * son cycle (la spé sera reportée à la semaine suivante de présence) et
 * la rotation pour elle ce week-là est `null`.
 *
 * Avec ≥ 6 externes, le modulo 5 fait que plusieurs externes partagent
 * la même spécialité une même semaine — c'est explicitement autorisé.
 */
export function buildRotation(staff, weekCount = 6, weeks = null) {
  const rotation = Array.from({ length: weekCount }, () => ({}));
  staff.forEach((s, i) => {
    let step = 0;
    for (let w = 0; w < weekCount; w++) {
      const fullyAbsent =
        weeks != null && weeks[w] && isFullyAbsentWeek(s, weeks[w]);
      if (fullyAbsent) {
        rotation[w][s.id] = null;
      } else {
        rotation[w][s.id] =
          SPECIALTY_KEYS[(i + step) % SPECIALTY_KEYS.length];
        step++;
      }
    }
  });
  return rotation;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

/**
 * Génère le planning externe sur `weekCount` semaines (default 6).
 *
 * Retourne :
 *   schedule[dateStr] = {
 *     morning:   [{ type, staffId }],
 *     afternoon: [{ type, staffId }],
 *   }
 *   rotation: Array<{ [staffId]: specialtyKey }>  (longueur weekCount)
 */
export function generateExterneSchedule(staff, startDate, weekCount = 6) {
  if (!staff.length) return { schedule: {}, rotation: [] };

  const weeks   = getExterneWeeks(startDate, weekCount);
  const allDays = weeks.flat();
  const years   = new Set(allDays.map(d => d.getFullYear()));
  const holidays = new Map();
  for (const y of years) {
    for (const [k, v] of getFrenchHolidays(y)) holidays.set(k, v);
  }

  const rotation = buildRotation(staff, weekCount, weeks);

  // Suivi de la couverture par poste/personne/semaine pour favoriser
  // le passage dans tous les postes de la spécialité
  const coverage = Array.from({ length: weekCount }, () =>
    Object.fromEntries(staff.map(s => [s.id, {}]))
  );

  // Suivi cumulé sur les 6 semaines : globalCoverage[staffId][postType] = nb d'occurrences.
  // Règle : chaque personne ne doit passer qu'une seule fois sur chaque poste
  // dans la période de 6 semaines (filtre hard, fallback soft si impossible).
  const globalCoverage = Object.fromEntries(staff.map(s => [s.id, {}]));

  const isAbsent = (person, dateStr, period) =>
    person.absences.includes(`${dateStr}-${period}`);

  const schedule = {};

  weeks.forEach((weekDays, weekIdx) => {
    const weekRotation = rotation[weekIdx]; // { staffId → specialtyKey }

    for (const day of weekDays) {
      const dateStr = formatDate(day);
      if (holidays.has(dateStr)) continue;
      const tmpl = DAY_TEMPLATES_EXTERNE[day.getDay()];
      if (!tmpl) continue;

      const dayResult = { morning: [], afternoon: [] };

      for (const period of ['morning', 'afternoon']) {
        const usedThisPeriod = new Set();

        for (const postType of tmpl[period]) {
          const postSpecialty = POST_SPECIALTY[postType];

          const candidates = staff.filter(s =>
            !usedThisPeriod.has(s.id) &&
            !isAbsent(s, dateStr, period) &&
            weekRotation[s.id] != null &&
            weekRotation[s.id] === postSpecialty
          );

          if (!candidates.length) {
            dayResult[period].push({ type: postType, staffId: null });
            continue;
          }

          // Filtre strict sur l'unicité poste/personne sur 6 semaines —
          // **règle qui ne s'applique qu'aux externes**. Les internes et
          // les socles peuvent rejouer un poste sans contrainte. Pas de
          // fallback : si tous les externes éligibles ont déjà fait ce
          // poste et qu'aucun non-externe n'est candidat, le poste reste
          // vide (cohérent avec « tous les postes ne doivent pas
          // obligatoirement être remplis »).
          const pool = candidates.filter(
            s => s.role !== 'extern' ||
                 (globalCoverage[s.id][postType] || 0) === 0
          );
          if (!pool.length) {
            dayResult[period].push({ type: postType, staffId: null });
            continue;
          }

          // Privilégier la personne ayant le moins couvert ce type de poste
          // cette semaine → garantit le passage dans tous les postes de la spécialité
          const weekTotal = id =>
            Object.values(coverage[weekIdx][id]).reduce((a, b) => a + b, 0);

          pool.sort((a, b) => {
            // Tie-break par occurrences globales sur 6 semaines : pour
            // les externes c'est essentiellement 0 ou 1 (filtre actif),
            // pour les autres c'est un nivellement de charge.
            const dgc = (globalCoverage[a.id][postType] || 0) -
                        (globalCoverage[b.id][postType] || 0);
            if (dgc !== 0) return dgc;
            const dc = (coverage[weekIdx][a.id][postType] || 0) -
                       (coverage[weekIdx][b.id][postType] || 0);
            if (dc !== 0) return dc;
            return weekTotal(a.id) - weekTotal(b.id);
          });

          const sel = pool[0];
          dayResult[period].push({ type: postType, staffId: sel.id });
          usedThisPeriod.add(sel.id);
          coverage[weekIdx][sel.id][postType] =
            (coverage[weekIdx][sel.id][postType] || 0) + 1;
          globalCoverage[sel.id][postType] =
            (globalCoverage[sel.id][postType] || 0) + 1;
        }
      }

      schedule[dateStr] = dayResult;
    }
  });

  return { schedule, rotation };
}
