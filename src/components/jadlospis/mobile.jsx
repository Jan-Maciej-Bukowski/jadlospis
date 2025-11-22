import React from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Slider,
  Collapse,
  Chip,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";

const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

// helper to build image src
const imgSrc = (dish) => {
  if (!dish) return null;
  const a = dish.avatar || dish.image || "";
  if (!a) return null;
  if (a.startsWith("http")) return a;
  return `${API}${a}`;
};

export default function MobileJadlospis({
  week,
  wi,
  dishesAll,
  settings,
  ui,
  getVisualDay,
  startTouchDragCell,
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {week.map((entry, index) => {
        return (
          <Box
            key={index}
            sx={{
              border: "1px solid rgba(224, 224, 224, 0.6)",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            {/* Day header */}
            <Box
              className="primary"
              sx={{
                p: 2,
                fontWeight: 600,
                fontSize: "1rem",
                borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
              }}
            >
              {getVisualDay(index, entry.day)}
            </Box>

            {/* Meals stacked vertically */}
            {["śniadanie", "obiad", "kolacja"].map((meal, mealIdx) => {
              const dish = entry[meal];
              const name =
                dish?.name ?? dish ?? settings.noDishText ?? "Brak potraw";
              const favorite = !!dish?.favorite;
              const dishObj = dishesAll.find((d) => d.name === name);

              const noDishText = settings?.noDishText ?? "Brak potraw";
              const isEmpty = !dish || name === noDishText;

              return (
                <Box
                  className={isEmpty ? "table-meal-empty" : "table-meal"}
                  key={meal}
                  sx={{
                    p: 2,
                    borderBottom:
                      mealIdx < 2
                        ? "1px solid rgba(224, 224, 224, 0.4)"
                        : "none",
                    transition: "all 0.2s ease",
                  }}
                  data-drop-week={wi}
                  data-drop-dayindex={index}
                  data-drop-meal={meal}
                  onTouchStart={(e) =>
                    startTouchDragCell(e, {
                      week: wi,
                      dayIndex: index,
                      meal,
                    })
                  }
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      fontWeight: 600,
                      mb: 1,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      letterSpacing: "0.5px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      width: "fit-content",
                    }}
                  >
                    {meal}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      {/* thumbnail image */}
                      {imgSrc(dishObj) && (ui?.showImage ?? false) ? (
                        <img
                          src={imgSrc(dishObj)}
                          alt={name}
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: "cover",
                            borderRadius: 6,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            flexShrink: 0,
                          }}
                        />
                      )}

                      <Box
                        onTouchStart={(e) =>
                          startTouchDragCell(e, {
                            week: wi,
                            dayIndex: index,
                            meal,
                          })
                        }
                        sx={{
                          display: "inline-block",
                          flex: 1,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          transition: "all 0.2s ease",
                          "&:active": {
                            backgroundColor: "rgba(0,0,0,0.05)",
                            transform: "scale(0.98)",
                          },
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontSize: "0.95rem",
                            lineHeight: 1.4,
                            fontWeight: 400,
                          }}
                        >
                          {name}
                        </Box>
                      </Box>

                      {favorite && ui.showFavoriteStar && (
                        <FavoriteIcon color="error" sx={{ fontSize: 16 }} />
                      )}
                    </Box>

                    {ui.showTags &&
                      Array.isArray(dishObj?.tags) &&
                      dishObj.tags.length > 0 && (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            flexWrap: "wrap",
                            mt: 0.5,
                          }}
                        >
                          {dishObj.tags.map((t, i) => (
                            <Chip
                              key={i}
                              label={t}
                              size="small"
                              sx={{
                                fontSize: "0.65rem",
                                height: 22,
                              }}
                              className="meal-tag"
                            />
                          ))}
                        </Box>
                      )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
