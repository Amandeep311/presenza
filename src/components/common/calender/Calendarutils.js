import { ALL_BRANCHES, HOLIDAYS_2026 } from './data/holidayData';

// ─── Build Holiday Lookup Map ─────────────────────────────────────────────────
export const HOLIDAY_MAP = {};
HOLIDAYS_2026.forEach(h => {
  HOLIDAY_MAP[h.date] = h;
});

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/** Zero-pad and return "YYYY-MM-DD" */
export const toDateStr = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export const getDaysInMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate();

export const getFirstDayOfMonth = (year, month) =>
  new Date(year, month, 1).getDay();

/** Return the date of the nth Saturday in a month, or -1 if not found */
export const getNthSaturday = (year, month, n) => {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === 6) {
      count++;
      if (count === n) return d;
    }
  }
  return -1;
};

/** Add n days to a "YYYY-MM-DD" string */
export const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ─── Holiday / Off-day Helpers ────────────────────────────────────────────────

/** True when dominant holiday type is 'full' across branches */
export const isAllBranches = branches =>
  ALL_BRANCHES.every(b => !!branches[b]);

/** Returns the dominant display type across all branches of a holiday */
export const getDomType = branches => {
  const types = [...new Set(Object.values(branches))];
  if (types.includes('full')) return 'full';
  if (types.includes('half1')) return 'half1';
  return 'half2';
};

/**
 * True if the date is a Sunday, 2nd Saturday, or 4th Saturday.
 * @param {string} dateStr - "YYYY-MM-DD"
 */
export const isWeeklyOff = dateStr => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const dow = d.getDay();
  if (dow === 0) return true;
  const secondSat = getNthSaturday(year, month, 2);
  const fourthSat = getNthSaturday(year, month, 4);
  return day === secondSat || day === fourthSat;
};

/**
 * Returns { holiday, type } if the date has a holiday for the given branch,
 * otherwise null.
 * @param {string} dateStr
 * @param {string} branch
 */
export const isHolidayForBranch = (dateStr, branch) => {
  const h = HOLIDAY_MAP[dateStr];
  if (!h) return null;
  if (h.branches[branch]) return { holiday: h, type: h.branches[branch] };
  return null;
};

/**
 * True if the date is completely free (weekly off OR full-day holiday) for
 * the branch — i.e. no leave deduction needed.
 */
export const isFreeDayForBranch = (dateStr, branch) => {
  if (isWeeklyOff(dateStr)) return true;
  const bh = isHolidayForBranch(dateStr, branch);
  return bh && bh.type === 'full';
};

/**
 * True if the date is a sandwich candidate (weekly off OR any kind of holiday).
 */
export const isSandwichCandidate = (dateStr, branch) => {
  if (isWeeklyOff(dateStr)) return true;
  const bh = isHolidayForBranch(dateStr, branch);
  return !!bh;
};

// ─── Leave Calculation ────────────────────────────────────────────────────────

/**
 * Calculates effective leave days between startDate and endDate,
 * applying sandwich rules, half-day holiday logic, and leave type.
 *
 * @param {string} startDateStr  - "YYYY-MM-DD"
 * @param {string} endDateStr    - "YYYY-MM-DD"
 * @param {'full'|'half'|'short'} leaveType
 * @param {'half1'|'half2'} halfDayType
 * @param {string} userBranch
 * @returns {{ total: number, breakdown: Array, sandwichWarning: object|null }}
 */
export const calculateLeaveDays = (
  startDateStr,
  endDateStr,
  leaveType = 'full',
  halfDayType = 'half1',
  userBranch,
) => {
  const isSingleDay = startDateStr === endDateStr;
  const shortLeaveCount = 0.5;

  const breakdown = [];
  let days = 0;

  const cursor = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Build a set of all dates in the applied range (for sandwich look-ahead/look-back)
  const appliedDates = new Set();
  {
    const c = new Date(startDateStr);
    while (c <= end) {
      appliedDates.add(c.toISOString().split('T')[0]);
      c.setDate(c.getDate() + 1);
    }
  }

  while (cursor <= end) {
    const ds = cursor.toISOString().split('T')[0];
    const off = isWeeklyOff(ds);
    const branchHoliday = isHolidayForBranch(ds, userBranch);
    const isFree = isFreeDayForBranch(ds, userBranch);

    let dayCount = 0;
    let label = '';
    let isSandwich = false;

    if (isFree) {
      // Check sandwich: is there a working-day anchor on both sides within the range?
      let leftAnchor = false;
      let rightAnchor = false;

      {
        let check = addDays(ds, -1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isFreeDayForBranch(check, userBranch)) { leftAnchor = true; break; }
          check = addDays(check, -1);
          steps++;
        }
      }
      {
        let check = addDays(ds, 1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isFreeDayForBranch(check, userBranch)) { rightAnchor = true; break; }
          check = addDays(check, 1);
          steps++;
        }
      }

      if (leftAnchor && rightAnchor) {
        dayCount = 1;
        isSandwich = true;
        const name = branchHoliday
          ? branchHoliday.holiday.name
          : off ? 'Weekly Off' : 'Holiday';
        label = `🥪 Sandwich: ${name} counted as leave`;
      } else {
        dayCount = 0;
        const name = branchHoliday ? branchHoliday.holiday.name : 'Weekly Off';
        label = `${name} — Free (not counted)`;
      }
    } else if (
      branchHoliday &&
      (branchHoliday.type === 'half1' || branchHoliday.type === 'half2')
    ) {
      let leftAnchor = false;
      let rightAnchor = false;

      {
        let check = addDays(ds, -1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isSandwichCandidate(check, userBranch)) { leftAnchor = true; break; }
          check = addDays(check, -1);
          steps++;
        }
      }
      {
        let check = addDays(ds, 1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isSandwichCandidate(check, userBranch)) { rightAnchor = true; break; }
          check = addDays(check, 1);
          steps++;
        }
      }

      if (leftAnchor && rightAnchor && !isSingleDay) {
        dayCount = 1;
        isSandwich = true;
        label = `🥪 Sandwich: ${branchHoliday.holiday.name} (half day) counted as full leave`;
      } else if (leaveType === 'short') {
        dayCount = shortLeaveCount;
        label = `${branchHoliday.holiday.name} (Half Day Holiday — Short Leave)`;
      } else if (leaveType === 'half') {
        dayCount = 0.5;
        label = `${branchHoliday.holiday.name} (Half Day Holiday)`;
      } else {
        dayCount = 1;
        label = `${branchHoliday.holiday.name} (Half Day — Full day counted)`;
      }
    } else {
      if (leaveType === 'short' && isSingleDay) {
        dayCount = shortLeaveCount;
        label = 'Short Leave (0.5 day)';
      } else if (leaveType === 'half' && isSingleDay) {
        dayCount = 0.5;
        label = 'Half Day Leave';
      } else {
        dayCount = 1;
        label = 'Working Day';
      }
    }

    days += dayCount;
    breakdown.push({ date: ds, count: dayCount, label, isSandwich });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Sandwich warning for short-leave + adjacent holiday
  let sandwichWarning = null;
  if (leaveType === 'short' && isSingleDay) {
    const nextDay = addDays(startDateStr, 1);
    const dayAfter = addDays(startDateStr, 2);
    const nextIsFreeOrHalf = isSandwichCandidate(nextDay, userBranch);
    const dayAfterIsLeave = !isFreeDayForBranch(dayAfter, userBranch);

    if (nextIsFreeOrHalf && dayAfterIsLeave) {
      const bh = isHolidayForBranch(nextDay, userBranch);
      const name = bh ? bh.holiday.name : 'Weekly Off';
      const nextDate = new Date(nextDay).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short',
      });
      sandwichWarning = {
        nextDay,
        name,
        message: `⚠️ Sandwich Alert: "${name}" on ${nextDate} falls between your short leave and the next working day. If you're also applying leave on ${new Date(
          dayAfter,
        ).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short',
        })}, that holiday will be counted as leave too.`,
      };
    }
  }

  return { total: days, breakdown, sandwichWarning };
};