import { describe, it, expect } from 'vitest';

import {
  buildRotation,
  computeWeekCount,
  generateExterneSchedule,
  getExterneWeeks,
  POST_SPECIALTY,
  SPECIALTY_KEYS,
  SPECIALTIES,
  DAY_TEMPLATES_EXTERNE,
  formatDate,
} from './schedulerExterne.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** A Monday in 2025 (6 January 2025 = lundi). */
const MON = new Date(2025, 0, 6);

const externs = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `e${i + 1}`,
    name: `Extern ${i + 1}`,
    role: 'extern',
    absences: [],
  }));

/** Mark a person fully absent on a given week (0-indexed). */
function absentWeek(person, weekIdx, startDate = MON, weekCount = 6) {
  const weeks = getExterneWeeks(startDate, weekCount);
  for (const day of weeks[weekIdx]) {
    const ds = formatDate(day);
    person.absences.push(`${ds}-morning`, `${ds}-afternoon`);
  }
}

/** Iterate over every (dateStr, period, slot) of a schedule. */
function* iterSlots(schedule) {
  for (const [dateStr, day] of Object.entries(schedule)) {
    for (const period of /** @type {const} */ (['morning', 'afternoon'])) {
      for (const slot of day[period] ?? []) {
        yield { dateStr, period, type: slot.type, staffId: slot.staffId };
      }
    }
  }
}

// ─── computeWeekCount ──────────────────────────────────────────────────────

describe('computeWeekCount', () => {
  it('returns 6 from Monday week 1 to Friday week 6', () => {
    const start = new Date(2025, 0, 6);  // Mon 6 jan
    const end   = new Date(2025, 1, 14); // Fri 14 feb (week 6)
    expect(computeWeekCount(start, end)).toBe(6);
  });

  it('handles a single week (start=end same Monday)', () => {
    expect(computeWeekCount(MON, MON)).toBe(1);
  });

  it('returns at least 1 even when end < start', () => {
    const before = new Date(2024, 11, 30);
    expect(computeWeekCount(MON, before)).toBeGreaterThanOrEqual(1);
  });

  it('rounds down to full weeks (any day inside a week → that week counts)', () => {
    const wed = new Date(2025, 0, 8); // Wed week 1
    expect(computeWeekCount(MON, wed)).toBe(1);
    const wedW3 = new Date(2025, 0, 22); // Wed week 3
    expect(computeWeekCount(MON, wedW3)).toBe(3);
  });
});

// ─── getExterneWeeks ───────────────────────────────────────────────────────

describe('getExterneWeeks', () => {
  it('returns weekCount weeks of 5 weekdays each', () => {
    const weeks = getExterneWeeks(MON, 6);
    expect(weeks).toHaveLength(6);
    for (const w of weeks) expect(w).toHaveLength(5);
  });

  it('skips weekends (each week is contiguous Mon–Fri)', () => {
    const weeks = getExterneWeeks(MON, 2);
    for (const w of weeks) {
      const dows = w.map((d) => d.getDay());
      expect(dows).toEqual([1, 2, 3, 4, 5]); // Mon-Fri
    }
  });

  it('honors a custom weekCount (e.g. 8 weeks)', () => {
    expect(getExterneWeeks(MON, 8)).toHaveLength(8);
  });
});

// ─── buildRotation ─────────────────────────────────────────────────────────

describe('buildRotation', () => {
  it('cycles through the 5 specialties for one extern over 5 weeks', () => {
    const staff = externs(1);
    const r = buildRotation(staff, 5);
    const seen = new Set();
    for (let w = 0; w < 5; w++) seen.add(r[w]['e1']);
    expect(seen.size).toBe(5);
    expect([...seen].sort()).toEqual([...SPECIALTY_KEYS].sort());
  });

  it('week 6 repeats the first specialty (5+1 rollover)', () => {
    const staff = externs(1);
    const r = buildRotation(staff, 6);
    expect(r[5]['e1']).toBe(r[0]['e1']);
  });

  it('with ≥6 externs, two of them share a specialty in week 0 (modulo 5)', () => {
    const staff = externs(6);
    const r = buildRotation(staff, 6);
    const sameAsFirst = staff.filter((s) => r[0][s.id] === r[0]['e1']);
    expect(sameAsFirst.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for a fully-absent week and does not consume the cycle', () => {
    const staff = externs(1);
    absentWeek(staff[0], 1); // absent week index 1
    const weeks = getExterneWeeks(MON, 6);
    const r = buildRotation(staff, 6, weeks);

    expect(r[1]['e1']).toBeNull();
    // Week 0 starts cycle at SPECIALTY_KEYS[0] for staff[0] (i=0).
    expect(r[0]['e1']).toBe(SPECIALTY_KEYS[0]);
    // Week 2 should be the *second* specialty in the cycle (skip not consumed).
    expect(r[2]['e1']).toBe(SPECIALTY_KEYS[1]);
    expect(r[3]['e1']).toBe(SPECIALTY_KEYS[2]);
  });

  it('multiple full-week absences each push the cycle forward', () => {
    const staff = externs(1);
    absentWeek(staff[0], 1);
    absentWeek(staff[0], 3);
    const weeks = getExterneWeeks(MON, 6);
    const r = buildRotation(staff, 6, weeks);

    expect(r[0]['e1']).toBe(SPECIALTY_KEYS[0]);
    expect(r[1]['e1']).toBeNull();
    expect(r[2]['e1']).toBe(SPECIALTY_KEYS[1]);
    expect(r[3]['e1']).toBeNull();
    expect(r[4]['e1']).toBe(SPECIALTY_KEYS[2]);
    expect(r[5]['e1']).toBe(SPECIALTY_KEYS[3]);
  });
});

// ─── generateExterneSchedule ───────────────────────────────────────────────

describe('generateExterneSchedule — règle d\'unicité poste/personne', () => {
  it('no extern is assigned the same post type more than once over the period', () => {
    const staff = externs(5);
    const { schedule } = generateExterneSchedule(staff, MON, 6);

    const counts = new Map();
    for (const slot of iterSlots(schedule)) {
      if (!slot.staffId) continue;
      const key = `${slot.staffId}|${slot.type}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const [key, n] of counts) {
      const [staffId, postType] = key.split('|');
      const s = staff.find((p) => p.id === staffId);
      if (s?.role === 'extern' && n > 1) {
        throw new Error(
          `Extern ${staffId} a fait ${postType} ${n} fois (max 1).`,
        );
      }
    }
  });

  it('still respects unicity over an 8-week window (not just the default 6)', () => {
    const staff = externs(5);
    const { schedule } = generateExterneSchedule(staff, MON, 8);
    for (const slot of iterSlots(schedule)) {
      // Just sanity-check no slot has a wonky shape
      expect(slot.type).toBeTruthy();
    }
    // Same unicity check
    const counts = new Map();
    for (const slot of iterSlots(schedule)) {
      if (!slot.staffId) continue;
      const k = `${slot.staffId}|${slot.type}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    for (const [k, n] of counts) expect(n).toBeLessThanOrEqual(1);
  });
});

describe('generateExterneSchedule — absences', () => {
  it('never assigns an absent person on a half-day where they are absent', () => {
    const staff = externs(5);
    // staff[0] absent every Monday morning
    const weeks = getExterneWeeks(MON, 6);
    for (const week of weeks) {
      const monStr = formatDate(week[0]);
      staff[0].absences.push(`${monStr}-morning`);
    }
    const { schedule } = generateExterneSchedule(staff, MON, 6);
    for (const slot of iterSlots(schedule)) {
      if (slot.staffId !== 'e1') continue;
      const isMonday = new Date(slot.dateStr).getDay() === 1;
      if (isMonday && slot.period === 'morning') {
        throw new Error(`e1 placé alors qu'absent: ${slot.dateStr}`);
      }
    }
  });

  it('an extern fully absent in week 1 still rotates through all 5 specialties via shifted cycle', () => {
    const staff = externs(1);
    absentWeek(staff[0], 0); // absent the very first week
    const weeks = getExterneWeeks(MON, 6);
    const rotation = buildRotation(staff, 6, weeks);

    const visited = new Set();
    for (let w = 0; w < 6; w++) {
      if (rotation[w]['e1']) visited.add(rotation[w]['e1']);
    }
    expect(visited.size).toBe(SPECIALTY_KEYS.length);
  });
});

describe('generateExterneSchedule — contraintes structurelles', () => {
  it('a person is never on two posts in the same half-day', () => {
    const staff = externs(5);
    const { schedule } = generateExterneSchedule(staff, MON, 6);

    for (const [dateStr, day] of Object.entries(schedule)) {
      for (const period of ['morning', 'afternoon']) {
        const ids = (day[period] ?? [])
          .map((s) => s.staffId)
          .filter(Boolean);
        const seen = new Set();
        for (const id of ids) {
          if (seen.has(id)) {
            throw new Error(
              `${id} placé deux fois ${dateStr} ${period}`,
            );
          }
          seen.add(id);
        }
      }
    }
  });

  it('every assigned (postType → staffId) matches the person\'s rotation specialty for that week', () => {
    const staff = externs(5);
    const weeks = getExterneWeeks(MON, 6);
    const { schedule, rotation } = generateExterneSchedule(staff, MON, 6);

    for (let w = 0; w < weeks.length; w++) {
      for (const day of weeks[w]) {
        const ds = formatDate(day);
        const dayResult = schedule[ds];
        if (!dayResult) continue;
        for (const period of ['morning', 'afternoon']) {
          for (const slot of dayResult[period] ?? []) {
            if (!slot.staffId) continue;
            const expectedSpec = rotation[w][slot.staffId];
            const actualSpec = POST_SPECIALTY[slot.type];
            expect(expectedSpec).toBe(actualSpec);
          }
        }
      }
    }
  });

  it('day templates respect post counts: CoursRemond ×3, RadioInterventionnelle ×2 (each half-day Wed), ScannerPédiatrique ×2', () => {
    // Tuesday morning has CoursRemond ×3
    expect(
      DAY_TEMPLATES_EXTERNE[2].morning.filter((p) => p === 'CoursRemond')
        .length,
    ).toBe(3);
    // Wednesday morning AND afternoon have RadioInterventionnelle ×2
    expect(
      DAY_TEMPLATES_EXTERNE[3].morning.filter(
        (p) => p === 'RadioInterventionnelle',
      ).length,
    ).toBe(2);
    expect(
      DAY_TEMPLATES_EXTERNE[3].afternoon.filter(
        (p) => p === 'RadioInterventionnelle',
      ).length,
    ).toBe(2);
    // Thursday morning has ScannerPédiatrique ×2
    expect(
      DAY_TEMPLATES_EXTERNE[4].morning.filter(
        (p) => p === 'ScannerPédiatrique',
      ).length,
    ).toBe(2);
  });
});

describe('generateExterneSchedule — partage de spécialité', () => {
  it('with 6 externs, two of them can be on the same specialty in the same week (no error / no duplicate slot)', () => {
    const staff = externs(6);
    const { schedule, rotation } = generateExterneSchedule(staff, MON, 6);

    // Sanity: rotation week 0 has at least one specialty taken by ≥ 2 externs.
    const counts = new Map();
    for (const id of Object.keys(rotation[0])) {
      const sp = rotation[0][id];
      if (sp == null) continue;
      counts.set(sp, (counts.get(sp) || 0) + 1);
    }
    expect([...counts.values()].some((c) => c >= 2)).toBe(true);

    // Also: schedule generated without crash, and unicity per extern still holds.
    const perPerson = new Map();
    for (const slot of iterSlots(schedule)) {
      if (!slot.staffId) continue;
      const k = `${slot.staffId}|${slot.type}`;
      perPerson.set(k, (perPerson.get(k) || 0) + 1);
    }
    for (const [, n] of perPerson) expect(n).toBeLessThanOrEqual(1);
  });
});

describe('Spécialités — couverture du catalogue', () => {
  it('every post in DAY_TEMPLATES_EXTERNE is mapped to a known specialty', () => {
    const allPosts = new Set();
    for (const tmpl of Object.values(DAY_TEMPLATES_EXTERNE)) {
      for (const p of tmpl.morning) allPosts.add(p);
      for (const p of tmpl.afternoon) allPosts.add(p);
    }
    for (const post of allPosts) {
      expect(POST_SPECIALTY[post]).toBeTruthy();
      expect(SPECIALTY_KEYS).toContain(POST_SPECIALTY[post]);
    }
  });

  it('every specialty in SPECIALTIES has at least one post listed', () => {
    for (const key of SPECIALTY_KEYS) {
      expect(SPECIALTIES[key].posts.length).toBeGreaterThan(0);
    }
  });
});
