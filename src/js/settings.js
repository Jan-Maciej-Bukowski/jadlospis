export const settings = {
  // excludedTags: JSON.parse(localStorage.getItem("excludedTags")) || {
  //   Poniedziałek: { śniadanie: [], obiad: [], kolacja: [] },
  //   Wtorek: { śniadanie: [], obiad: [], kolacja: [] },
  //   Środa: { śniadanie: [], obiad: [], kolacja: [] },
  //   Czwartek: { śniadanie: [], obiad: [], kolacja: [] },
  //   Piątek: { śniadanie: [], obiad: [], kolacja: [] },
  //   Sobota: { śniadanie: [], obiad: [], kolacja: [] },
  //   Niedziela: { śniadanie: [], obiad: [], kolacja: [] },
  // },
  // specialDishes: JSON.parse(localStorage.getItem("specialDishes")) || {
  //   Poniedziałek: { śniadanie: "", obiad: "", kolacja: "" },
  //   Wtorek: { śniadanie: "", obiad: "", kolacja: "" },
  //   Środa: { śniadanie: "", obiad: "", kolacja: "" },
  //   Czwartek: { śniadanie: "", obiad: "", kolacja: "" },
  //   Piątek: { śniadanie: "", obiad: "", kolacja: "" },
  //   Sobota: { śniadanie: "", obiad: "", kolacja: "" },
  //   Niedziela: { śniadanie: "", obiad: "", kolacja: "" },
  // },
  // UI / stylistic settings (defaults; can be overridden from localStorage)
  ui: JSON.parse(localStorage.getItem("uiSettings")) || {
    showFavoriteStar: true, // czy wyświetlać gwiazdkę obok ulubionych w jadłospisie
    compactTable: false, // czy tabelki mają zwarty styl (mniejsze paddingi)
    highlightFavorites: false, // czy wyróżniać wiersze ulubionych w tabelach
    showRating: false, // czy wyświetlać ocenę w jadłospisie
    showTags: false, // czy wyświetlać tagi w jadłospisie
    showImage: false
  },
  noDishText: localStorage.getItem("noDishText") || "Brak potraw",
};
