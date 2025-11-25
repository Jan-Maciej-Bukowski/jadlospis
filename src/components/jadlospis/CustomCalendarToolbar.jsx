import React from "react";
import { Box, Button, IconButton, Typography, ButtonGroup } from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Today,
  CalendarMonth,
  ViewWeek,
  ViewDay,
  ViewAgenda,
} from "@mui/icons-material";
import moment from "moment";
import PropTypes from "prop-types";

function CustomCalendarToolbar({ label, onNavigate, onView, view, views }) {
  const viewLabels = {
    month: "Miesiąc",
    week: "Tydzień",
    day: "Dzień",
    agenda: "Agenda",
  };

  const viewIcons = {
    month: <CalendarMonth fontSize="small" />,
    week: <ViewWeek fontSize="small" />,
    day: <ViewDay fontSize="small" />,
    agenda: <ViewAgenda fontSize="small" />,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "stretch", sm: "center" },
        gap: 2,
        p: 2,
        backgroundColor: "var(--color-bg-dark)",
        borderRadius: "8px 8px 0 0",
        borderBottom: "3px solid var(--color-primary)",
      }}
    >
      {/* Navigation Section */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          justifyContent: { xs: "space-between", sm: "flex-start" },
        }}
      >
        <IconButton
          onClick={() => onNavigate("PREV")}
          sx={{
            color: "white",
            backgroundColor: "var(--color-surface-dark)",
            "&:hover": {
              backgroundColor: "var(--color-primary)",
            },
          }}
          size="small"
        >
          <ChevronLeft />
        </IconButton>

        <Button
          onClick={() => onNavigate("TODAY")}
          variant="contained"
          startIcon={<Today />}
          sx={{
            backgroundColor: "var(--color-primary)",
            color: "white",
            textTransform: "none",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: "var(--color-primary-dark)",
            },
          }}
          size="small"
        >
          Dziś
        </Button>

        <IconButton
          onClick={() => onNavigate("NEXT")}
          sx={{
            color: "white",
            backgroundColor: "var(--color-surface-dark)",
            "&:hover": {
              backgroundColor: "var(--color-primary)",
            },
          }}
          size="small"
        >
          <ChevronRight />
        </IconButton>
      </Box>

      {/* Current Date Label */}
      <Typography
        variant="h6"
        sx={{
          color: "white",
          fontWeight: 700,
          textAlign: "center",
          fontSize: { xs: "1rem", sm: "1.25rem" },
        }}
      >
        {label}
      </Typography>

      {/* View Selector */}
      <ButtonGroup
        variant="contained"
        size="small"
        sx={{
          "& .MuiButton-root": {
            textTransform: "none",
            fontWeight: 500,
            minWidth: { xs: "auto", sm: "80px" },
            px: { xs: 1, sm: 2 },
          },
        }}
      >
        {views.map((viewName) => (
          <Button
            key={viewName}
            onClick={() => onView(viewName)}
            startIcon={viewIcons[viewName]}
            sx={{
              backgroundColor:
                view === viewName
                  ? "var(--color-primary)"
                  : "var(--color-surface-dark)",
              color: "white",
              "&:hover": {
                backgroundColor:
                  view === viewName
                    ? "var(--color-primary-dark)"
                    : "var(--color-primary)",
              },
            }}
          >
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              {viewLabels[viewName]}
            </Box>
          </Button>
        ))}
      </ButtonGroup>
    </Box>
  );
}

CustomCalendarToolbar.propTypes = {
  label: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onView: PropTypes.func.isRequired,
  view: PropTypes.string.isRequired,
  views: PropTypes.array.isRequired,
};

export default CustomCalendarToolbar;