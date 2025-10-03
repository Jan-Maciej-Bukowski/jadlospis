export function generateMenu(dishes, settings, daysOfWeek, weeks = 1) {
  // returns array of weeks: [ week0DaysArray, week1DaysArray, ... ]
  const W = Math.max(1, Number(weeks) || 1);
  const { excludedTags = {}, specialDishes = {} } = settings || {};
  const placeholder = settings?.noDishText || "Brak potraw";

  // Build slot list: each slot = { week, dayIndex, dayName, meal, assigned }
  const meals = ["śniadanie", "obiad", "kolacja"];
  const slots = [];
  for (let w = 0; w < W; w++) {
    for (let di = 0; di < daysOfWeek.length; di++) {
      const dayName = daysOfWeek[di];
      for (const meal of meals) {
        slots.push({
          week: w,
          dayIndex: di,
          dayName,
          meal,
          assigned: null, // { name, favorite?, color? } or placeholder
          special: false,
        });
      }
    }
  }

  // Apply specialDishes: if defined for a specific day+meal, assign one of them
  // specialDishes structure is expected: { "Poniedziałek": { śniadanie: "Dish A, Dish B", ... }, ... }
  slots.forEach((slot) => {
    const sdRaw = specialDishes?.[slot.dayName]?.[slot.meal];
    if (sdRaw) {
      const list = ("" + sdRaw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length > 0) {
        const choice = list[Math.floor(Math.random() * list.length)];
        slot.assigned = { name: choice, favorite: false };
        slot.special = true;
      }
    }
  });

  // Helpers to check if dish can go to slot (tags/allowedMeals/per-week/per-global checks done externally)
  const slotAllowsDish = (slot, dish, globalCounts, weekCountsForWeek) => {
    if (!dish) return false;
    const allowedMeals = dish.allowedMeals || ["śniadanie", "obiad", "kolacja"];
    if (!allowedMeals.includes(slot.meal)) return false;
    const excl = excludedTags[slot.dayName]?.[slot.meal] || [];
    if (Array.isArray(dish.tags) && dish.tags.some((t) => excl.includes(t)))
      return false;
    // weekCountsForWeek is an object mapping dish.name -> count in that week
    const currentWeekCount = weekCountsForWeek[dish.name] || 0;
    const maxPerWeek = dish.maxRepeats ?? Infinity;
    if (currentWeekCount >= maxPerWeek) return false;
    const currentGlobal = globalCounts[dish.name] || 0;
    const maxAcross = dish.maxAcrossWeeks ?? Infinity;
    if (currentGlobal >= maxAcross) return false;
    return true;
  };

  // Pre-calc available slots per dish (unassigned and matching allowedMeals/tags)
  const availableSlotsForDish = (dish) =>
    slots.filter(
      (s) =>
        !s.assigned &&
        !s.special &&
        (dish.allowedMeals || ["śniadanie", "obiad", "kolacja"]).includes(
          s.meal
        ) &&
        !(
          Array.isArray(dish.tags) &&
          (excludedTags[s.dayName]?.[s.meal] || []).some((t) =>
            dish.tags.includes(t)
          )
        )
    );

  // GLOBAL counters
  const globalCounts = {}; // dish.name -> count across all placed
  const weekCounts = Array.from({ length: W }, () => ({})); // per-week maps

  // 1) Place dishes with finite maxAcrossWeeks in a balanced way
  const constrainedDishes = dishes.filter((d) =>
    Number.isFinite(d.maxAcrossWeeks)
  );
  for (const dish of constrainedDishes) {
    const maxAcross = Math.max(0, dish.maxAcrossWeeks || 0);
    if (maxAcross <= 0) continue;
    // available slots that match tags/allowedMeals (ignore per-week/per-global limits here)
    const avail = availableSlotsForDish(dish);
    const occ = Math.min(maxAcross, avail.length);
    if (occ === 0) continue;
    // Distribute occ occurrences across W weeks evenly:
    // strategy: for occIndex = 0..occ-1 assign to week = Math.floor(occIndex * W / occ)
    const targetsPerWeek = Array(W).fill(0);
    for (let i = 0; i < occ; i++) {
      const wi = Math.floor((i * W) / occ);
      targetsPerWeek[wi] = (targetsPerWeek[wi] || 0) + 1;
    }

    // For each week, place targetsPerWeek[wi] items in that week trying to spread across days/meals
    for (let wi = 0; wi < W; wi++) {
      let toPlace = targetsPerWeek[wi] || 0;
      // Gather candidate slots in week wi matching dish (and not special/assigned)
      const weekSlots = slots.filter(
        (s) =>
          s.week === wi &&
          !s.assigned &&
          !s.special &&
          (dish.allowedMeals || ["śniadanie", "obiad", "kolacja"]).includes(
            s.meal
          )
      );
      if (weekSlots.length === 0) break;

      // place items trying to spread across days and meals
      while (toPlace > 0) {
        // candidates that still allow dish (respecting per-week and tags/global limits)
        const candidates = weekSlots.filter((s) =>
          slotAllowsDish(s, dish, globalCounts, weekCounts[wi] || {})
        );

        if (candidates.length === 0) break;

        // score candidates: prefer slots on days and meals where this dish has been used less this week
        const scored = candidates.map((c) => {
          const dayAssignedCount = slots.filter(
            (x) =>
              x.week === wi &&
              x.dayIndex === c.dayIndex &&
              x.assigned &&
              x.assigned.name === dish.name
          ).length;
          const mealAssignedCount = slots.filter(
            (x) =>
              x.week === wi &&
              x.meal === c.meal &&
              x.assigned &&
              x.assigned.name === dish.name
          ).length;
          // lower score is better: weight day spread higher than meal spread
          const score =
            dayAssignedCount * 100 + mealAssignedCount * 10 + Math.random();
          return { slot: c, score };
        });

        // find minimal score
        let minScore = Infinity;
        for (const s of scored) if (s.score < minScore) minScore = s.score;

        // pick all with minimal score (within tiny epsilon) and choose random among them
        const bestCandidates = scored
          .filter((s) => s.score <= minScore + 1e-6)
          .map((s) => s.slot);
        const best =
          bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
        if (!best) break;

        // assign
        best.assigned = {
          name: dish.name,
          favorite: !!dish.favorite,
          color: dish.color || "",
        };
        weekCounts[wi][dish.name] = (weekCounts[wi][dish.name] || 0) + 1;
        globalCounts[dish.name] = (globalCounts[dish.name] || 0) + 1;

        // remove this slot from weekSlots array (so it's not reused)
        const idx = weekSlots.indexOf(best);
        if (idx >= 0) weekSlots.splice(idx, 1);
        toPlace--;
      }
    }
  }

  // 2) Fill remaining slots sequentially but choose dishes biased toward those used less (to keep spread)
  const remainingSlots = slots.filter((s) => !s.assigned && !s.special);
  for (const slot of remainingSlots) {
    // build candidate list for this slot
    const candidates = dishes.filter((dish) => {
      // respect allowedMeals and tags
      const allowedMeals = dish.allowedMeals || [
        "śniadanie",
        "obiad",
        "kolacja",
      ];
      if (!allowedMeals.includes(slot.meal)) return false;
      const excl = excludedTags[slot.dayName]?.[slot.meal] || [];
      if (Array.isArray(dish.tags) && dish.tags.some((t) => excl.includes(t)))
        return false;
      // week/local counts
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
      slot.assigned = { name: placeholder, favorite: false };
      continue;
    }

    // compute weights: prefer dishes with higher probability and lower global usage
    const weights = candidates.map((dish) => {
      const prob = Math.max(1, Math.round(dish.probability ?? 100));
      const used = globalCounts[dish.name] || 0;
      const weight = prob / (1 + used); // dish used less => higher weight
      return Math.max(0.1, weight);
    });

    // weighted random pick
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

    // assign
    slot.assigned = {
      name: chosen.name,
      favorite: !!chosen.favorite,
      color: chosen.color || "",
    };
    weekCounts[slot.week][chosen.name] =
      (weekCounts[slot.week][chosen.name] || 0) + 1;
    globalCounts[chosen.name] = (globalCounts[chosen.name] || 0) + 1;
  }

  // 3) any special slots that were not assigned (shouldn't happen) -> placeholder
  slots.forEach((s) => {
    if (!s.assigned) s.assigned = { name: placeholder, favorite: false };
  });

  // Build weeksMenus structure from slots
  const weeksMenus = [];
  for (let w = 0; w < W; w++) {
    const weekMenu = [];
    for (let di = 0; di < daysOfWeek.length; di++) {
      const dayName = daysOfWeek[di];
      const dayMenu = { day: dayName };
      for (const meal of meals) {
        const slot = slots.find(
          (s) => s.week === w && s.dayIndex === di && s.meal === meal
        );
        // normalize to keep legacy structure: either string name or object {name,...}
        if (slot && slot.assigned) {
          dayMenu[meal] = slot.assigned;
        } else {
          dayMenu[meal] = { name: placeholder, favorite: false };
        }
      }
      weekMenu.push(dayMenu);
    }
    weeksMenus.push(weekMenu);
  }

  return weeksMenus;
}
