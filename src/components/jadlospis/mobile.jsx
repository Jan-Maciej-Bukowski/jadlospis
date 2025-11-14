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
              sx={{
                p: 2,
                backgroundColor: "rgba(0, 0, 0, 0.04)",
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
              const dishColor = dishObj?.color || dish?.color || "";
              const cellStyle = dishColor ? { backgroundColor: dishColor } : {};

              return (
                <Box
                  key={meal}
                  sx={{
                    p: 2,
                    borderBottom:
                      mealIdx < 2
                        ? "1px solid rgba(224, 224, 224, 0.4)"
                        : "none",
                    ...cellStyle,
                    transition: "all 0.2s ease",
                    "&:active": {
                      backgroundColor: cellStyle.backgroundColor
                        ? cellStyle.backgroundColor
                        : "rgba(0, 0, 0, 0.03)",
                    },
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
                      color: "rgba(0,0,0,0.6)",
                      mb: 1,
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      letterSpacing: "0.5px",
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
