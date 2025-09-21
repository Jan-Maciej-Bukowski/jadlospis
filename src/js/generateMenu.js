export function generateMenu(dishes, settings, daysOfWeek) {
  const menu = [];
  const dishCounts = {}; // Licznik powtórzeń potraw

  daysOfWeek.forEach((day) => {
    // Filtruj potrawy na podstawie ustawień
    const filteredDishes = dishes.filter((dish) => {
      const dishTags = dish.tags || [];
      const isTagAllowed = settings.tag
        ? dishTags.includes(settings.tag)
        : true;
      const isDayAllowed = settings.allowedDays.includes(day);
      const isUnderMaxRepeats =
        !dishCounts[dish.name] || dishCounts[dish.name] < settings.maxRepeats;

      //console.log("ustawienia: ",settings," dish: ",dish);
      // dish.name, dish.tags
      // settings.tag, settings.allowedDays, maxRepeats

      return isTagAllowed && isDayAllowed && isUnderMaxRepeats;
    });
    /*
    console.log("Dishes:", dishes);
    console.log("Settings:", settings);
    console.log("Day:", day);*/
    console.log("przefiltrowane: " + filteredDishes);

    // Wybierz losową potrawę z przefiltrowanych
    const randomDish = filteredDishes[
      Math.floor(Math.random() * filteredDishes.length)
    ] || {
      name: "Brak potraw",
    };

    // Dodaj potrawę do jadłospisu
    menu.push({ day, dish: randomDish.name });

    // Zaktualizuj licznik powtórzeń
    if (randomDish.name !== "Brak potraw") {
      dishCounts[randomDish.name] = (dishCounts[randomDish.name] || 0) + 1;
    }
  });

  return menu;
}
