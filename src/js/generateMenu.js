export function generateMenu(dishes, settings, daysOfWeek, weeks = 1) {
  const W = Math.max(1, Number(weeks) || 1);
  const placeholder = settings?.noDishText || "Brak potraw";

  // collect master time ranges from dishes (format "HH:MM-HH:MM")
  const normalizeTime = (t) =>
    String(t || "")
      .trim()
      .replace(/\s+/g, "")
      .slice(0, 5); // "HH:MM"

  const toKey = (s, e) => `${normalizeTime(s)}-${normalizeTime(e)}`;

  const defaultRanges = [
    { start: "07:00", end: "09:00" },
    { start: "12:00", end: "14:00" },
    { start: "18:00", end: "20:00" },
  ];

  const rangesSet = new Map();

  dishes.forEach((d) => {
    if (Array.isArray(d.allowedTimes) && d.allowedTimes.length > 0) {
      d.allowedTimes.forEach((rng) => {
        const key = toKey(rng.start, rng.end);
        if (!rangesSet.has(key)) {
          rangesSet.set(key, {
            start: normalizeTime(rng.start),
            end: normalizeTime(rng.end),
          });
        }
      });
    }
  });

  // fallback to defaults if none
  if (rangesSet.size === 0) {
    defaultRanges.forEach((r) => rangesSet.set(toKey(r.start, r.end), r));
  }

  // sort master ranges by start time
  const masterRanges = Array.from(rangesSet.values()).sort((a, b) =>
    a.start > b.start ? 1 : -1
  );

  // Build slot list: each slot = { week, dayIndex, dayName, timeRange, assigned }
  const slots = [];
  for (let w = 0; w < W; w++) {
    for (let di = 0; di < daysOfWeek.length; di++) {
      const dayName = daysOfWeek[di];
      for (const tr of masterRanges) {
        slots.push({
          week: w,
          dayIndex: di,
          dayName,
          timeRange: { start: tr.start, end: tr.end }, // "HH:MM"
          assigned: null,
          special: false,
        });
      }
    }
  }

  const norm = (s) => String(s || "").toLowerCase();

  // helper: check time overlap between slot and any dish allowedTimes
  const timeToMinutes = (hhmm) => {
    if (!hhmm || typeof hhmm !== "string") return 0;
    const [hh = "0", mm = "0"] = hhmm.split(":");
    return Number(hh) * 60 + Number(mm);
  };

  const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
    const aS = timeToMinutes(aStart);
    const aE = timeToMinutes(aEnd);
    const bS = timeToMinutes(bStart);
    const bE = timeToMinutes(bEnd);
    return Math.max(aS, bS) < Math.min(aE, bE);
  };

  const slotAllowsDish = (slot, dish, globalCounts, weekCountsForWeek) => {
    if (!dish) return false;

    // allowedDays
    const allowedDays = Array.isArray(dish.allowedDays)
      ? dish.allowedDays.map(norm)
      : daysOfWeek.map(norm);
    if (!allowedDays.includes(norm(slot.dayName))) return false;

    // allowedTimes: if provided, require overlap; otherwise allow
    if (Array.isArray(dish.allowedTimes) && dish.allowedTimes.length > 0) {
      const ok = dish.allowedTimes.some((rng) =>
        rangesOverlap(
          slot.timeRange.start,
          slot.timeRange.end,
          rng.start,
          rng.end
        )
      );
      if (!ok) return false;
    }

    const excl =
      settings?.excludedTags?.[slot.dayName]?.[slot.timeRange?.start] || [];
    if (Array.isArray(dish.tags) && dish.tags.some((t) => excl.includes(t)))
      return false;

    const currentWeekCount = weekCountsForWeek[dish.name] || 0;
    const maxPerWeek = dish.maxRepeats ?? Infinity;
    if (currentWeekCount >= maxPerWeek) return false;

    const currentDayCount = slots.filter(
      (x) =>
        x.week === slot.week &&
        x.dayIndex === slot.dayIndex &&
        x.assigned &&
        x.assigned.name === dish.name
    ).length;
    const maxPerDay = dish.maxPerDay ?? Infinity;
    if (currentDayCount >= maxPerDay) return false;

    const currentGlobal = globalCounts[dish.name] || 0;
    const maxAcross = dish.maxAcrossWeeks ?? Infinity;
    if (currentGlobal >= maxAcross) return false;

    return true;
  };

  const availableSlotsForDish = (dish) =>
    slots.filter(
      (s) =>
        !s.assigned &&
        !s.special &&
        (!Array.isArray(dish.allowedTimes) ||
          dish.allowedTimes.length === 0 || // if dish has no allowedTimes, it's ok for any
          dish.allowedTimes.some((rng) =>
            rangesOverlap(
              s.timeRange.start,
              s.timeRange.end,
              rng.start,
              rng.end
            )
          ))
    );

  const globalCounts = {};
  const weekCounts = Array.from({ length: W }, () => ({}));

  // 1) place constrained dishes (maxAcrossWeeks) similarly to previous logic
  const constrainedDishes = dishes.filter((d) =>
    Number.isFinite(d.maxAcrossWeeks)
  );
  for (const dish of constrainedDishes) {
    const maxAcross = Math.max(0, dish.maxAcrossWeeks || 0);
    if (maxAcross <= 0) continue;
    const avail = availableSlotsForDish(dish);
    const occ = Math.min(maxAcross, avail.length);
    if (occ === 0) continue;

    const targetsPerWeek = Array(W).fill(0);
    for (let i = 0; i < occ; i++) {
      const wi = Math.floor((i * W) / occ);
      targetsPerWeek[wi] = (targetsPerWeek[wi] || 0) + 1;
    }

    for (let wi = 0; wi < W; wi++) {
      let toPlace = targetsPerWeek[wi] || 0;
      const weekSlots = slots.filter(
        (s) => s.week === wi && !s.assigned && !s.special
      );
      if (weekSlots.length === 0) break;

      while (toPlace > 0) {
        const candidates = weekSlots.filter((s) =>
          slotAllowsDish(s, dish, globalCounts, weekCounts[wi] || {})
        );
        if (candidates.length === 0) break;

        const scored = candidates.map((c) => {
          const dayAssignedCount = slots.filter(
            (x) =>
              x.week === wi &&
              x.dayIndex === c.dayIndex &&
              x.assigned &&
              x.assigned.name === dish.name
          ).length;
          const timeAssignedCount = slots.filter(
            (x) =>
              x.week === wi &&
              x.timeRange.start === c.timeRange.start &&
              x.assigned &&
              x.assigned.name === dish.name
          ).length;
          const score =
            dayAssignedCount * 100 + timeAssignedCount * 10 + Math.random();
          return { slot: c, score };
        });

        let minScore = Infinity;
        for (const s of scored) if (s.score < minScore) minScore = s.score;

        const bestCandidates = scored
          .filter((s) => s.score <= minScore + 1e-6)
          .map((s) => s.slot);
        const best =
          bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
        if (!best) break;

        best.assigned = {
          name: dish.name,
          favorite: !!dish.favorite,
          color: dish.color || "",
          startTime: best.timeRange.start,
          endTime: best.timeRange.end,
        };
        weekCounts[wi][dish.name] = (weekCounts[wi][dish.name] || 0) + 1;
        globalCounts[dish.name] = (globalCounts[dish.name] || 0) + 1;

        const idx = weekSlots.indexOf(best);
        if (idx >= 0) weekSlots.splice(idx, 1);
        toPlace--;
      }
    }
  }

  // 2) fill remaining slots sequentially
  const remainingSlots = slots.filter((s) => !s.assigned && !s.special);
  for (const slot of remainingSlots) {
    const candidates = dishes.filter((dish) => {
      if (Array.isArray(dish.allowedTimes) && dish.allowedTimes.length > 0) {
        // require overlap
        if (
          !dish.allowedTimes.some((rng) =>
            rangesOverlap(
              slot.timeRange.start,
              slot.timeRange.end,
              rng.start,
              rng.end
            )
          )
        )
          return false;
      }
      if (
        Array.isArray(dish.allowedDays) &&
        !dish.allowedDays.map(norm).includes(norm(slot.dayName))
      )
        return false;
      const excl =
        settings?.excludedTags?.[slot.dayName]?.[slot.timeRange?.start] || [];
      if (Array.isArray(dish.tags) && dish.tags.some((t) => excl.includes(t)))
        return false;
      const currentWeekCount =
        (weekCounts[slot.week] && weekCounts[slot.week][dish.name]) || 0;
      const maxPerWeek = dish.maxRepeats ?? Infinity;
      if (currentWeekCount >= maxPerWeek) return false;
      const currentGlobal = globalCounts[dish.name] || 0;
      const maxAcross = dish.maxAcrossWeeks ?? Infinity;
      if (currentGlobal >= maxAcross) return false;
      return true;
    });

    if (candidates.length === 0) {
      slot.assigned = {
        name: placeholder,
        favorite: false,
        startTime: slot.timeRange.start,
        endTime: slot.timeRange.end,
      };
      continue;
    }

    const weights = candidates.map((dish) => {
      const used = globalCounts[dish.name] || 0;
      const weight = 1 / (1 + used);
      return Math.max(0.1, weight);
    });

    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    let pickIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pickIndex = i;
        break;
      }
    }
    const chosen = candidates[pickIndex] || candidates[0];

    slot.assigned = {
      name: chosen.name,
      favorite: !!chosen.favorite,
      color: chosen.color || "",
      startTime: slot.timeRange.start,
      endTime: slot.timeRange.end,
    };
    weekCounts[slot.week][chosen.name] =
      (weekCounts[slot.week][chosen.name] || 0) + 1;
    globalCounts[chosen.name] = (globalCounts[chosen.name] || 0) + 1;
  }

  // 3) ensure assigned
  slots.forEach((s) => {
    if (!s.assigned)
      s.assigned = {
        name: placeholder,
        favorite: false,
        startTime: s.timeRange.start,
        endTime: s.timeRange.end,
      };
  });

  // Build weeksMenus: each day has times: [{ startTime, endTime, assigned }]
  const weeksMenus = [];
  for (let w = 0; w < W; w++) {
    const weekMenu = [];
    for (let di = 0; di < daysOfWeek.length; di++) {
      const dayName = daysOfWeek[di];
      const dayMenu = { day: dayName, times: [] };
      for (const tr of masterRanges) {
        const slot = slots.find(
          (s) =>
            s.week === w &&
            s.dayIndex === di &&
            s.timeRange.start === tr.start &&
            s.timeRange.end === tr.end
        );
        if (slot && slot.assigned) {
          dayMenu.times.push({
            startTime: slot.timeRange.start,
            endTime: slot.timeRange.end,
            assigned: slot.assigned,
          });
        } else {
          dayMenu.times.push({
            startTime: tr.start,
            endTime: tr.end,
            assigned: { name: placeholder, favorite: false },
          });
        }
      }
      weekMenu.push(dayMenu);
    }
    weeksMenus.push(weekMenu);
  }

  return weeksMenus;
}
