import React from "react";
import { Box, Chip, Rating } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";

export default function DesktopJadlospis({
  week,
  wi,
  dishesAll,
  settings,
  ui,
  isNarrow,
  cellPadding,
  getVisualDay,
  handleDragOver,
  handleDrop,
  startTouchDragCell,
  handleDragStart,
  handleDragEnd,
}) {
  // week = array of day entries for this week
  return (
    <Box
      className="table"
      sx={{
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "150px 1fr 1fr 1fr",
        }}
      >
        <Box className="table-header" sx={{ p: cellPadding }}>
          Dzień tygodnia
        </Box>
        <Box className="table-header" sx={{ p: cellPadding }}>
          Śniadanie
        </Box>
        <Box className="table-header" sx={{ p: cellPadding }}>
          Obiad
        </Box>
        <Box className="table-header" sx={{ p: cellPadding }}>
          Kolacja
        </Box>
      </Box>

      {/* Data rows */}
      {week.map((entry, index) => (
        <Box
          key={index}
          sx={{
            display: "grid",
            gridTemplateColumns: "150px 1fr 1fr 1fr",
            "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
          }}
        >
          <Box
            className="table-day"
            sx={{
              p: cellPadding,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getVisualDay(index, entry.day)}
          </Box>

          {["śniadanie", "obiad", "kolacja"].map((meal) => {
            const dish = entry[meal];
            const name =
              dish?.name ?? dish ?? settings.noDishText ?? "Brak potraw";
            const favorite = !!dish?.favorite;
            const dishObj = dishesAll.find((d) => d.name === name);
            const dishColor = dishObj?.color || dish?.color || "";
            const cellStyle = dishColor ? { backgroundColor: dishColor } : {};
            return (
              <Box
                className="table-meal"
                key={meal}
                sx={{
                  p: cellPadding,
                  ...cellStyle,
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: cellStyle.backgroundColor
                      ? cellStyle.backgroundColor
                      : "rgba(0, 0, 0, 0.03)",
                  },
                }}
                onDragOver={handleDragOver}
                onDrop={(e) =>
                  handleDrop(e, { week: wi, dayIndex: index, meal })
                }
                data-drop-week={wi}
                data-drop-dayindex={index}
                data-drop-meal={meal}
                onTouchStart={(e) =>
                  startTouchDragCell(e, { week: wi, dayIndex: index, meal })
                }
              >
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
                      alignItems: "flex-start",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, { week: wi, dayIndex: index, meal })
                      }
                      onDragEnd={(e) => handleDragEnd(e)}
                      onTouchStart={(e) =>
                        startTouchDragCell(e, {
                          week: wi,
                          dayIndex: index,
                          meal,
                        })
                      }
                      sx={{
                        cursor: "grab",
                        display: "inline-block",
                        maxWidth: "100%",
                        overflowWrap: "anywhere",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        transition: "all 0.2s ease",
                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.05)" },
                        "&:active": {
                          cursor: "grabbing",
                          transform: "scale(0.98)",
                        },
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontSize: isNarrow ? "0.9rem" : "1.05rem",
                          lineHeight: 1.4,
                          fontWeight: 400,
                        }}
                      >
                        {name}
                      </Box>
                    </Box>

                    {favorite && ui.showFavoriteStar && (
                      <FavoriteIcon
                        color="error"
                        sx={{ fontSize: 18, flexShrink: 0 }}
                      />
                    )}

                    {!isNarrow && ui.showRating && dishObj?.rating != null && (
                      <Rating
                        value={dishObj.rating}
                        size="small"
                        readOnly
                        precision={0.5}
                        sx={{ flexShrink: 0 }}
                      />
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
                            size={
                              isNarrow
                                ? "small"
                                : ui.compactTable
                                ? "small"
                                : "medium"
                            }
                            sx={{
                              fontSize: isNarrow ? "0.65rem" : undefined,
                              height: isNarrow ? 22 : undefined,
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
      ))}
    </Box>
  );
}
