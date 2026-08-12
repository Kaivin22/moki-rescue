/** Product rules used by the planner. Keep assumptions explicit and versioned. */
export const PLANNING_RULES = {
  defaultVisitDurationMin: 60,
  defaultDayStart: '08:00',
  defaultDayEnd: '21:00',
  transitionBufferMin: 10,
  mealBreakDurationMin: 60,
  usableVisitMinutesPerDay: 11 * 60,
  estimatedTransferMinutes: {
    motorbike: 25,
    car: 30,
    bicycle: 35,
    walk: 50,
  },
  mealWindows: {
    lunch: { startMin: 11 * 60 + 30, endMin: 13 * 60 },
    dinner: { startMin: 18 * 60, endMin: 19 * 60 + 30 },
  },
  neutralWeatherScore: 70,
} as const;
