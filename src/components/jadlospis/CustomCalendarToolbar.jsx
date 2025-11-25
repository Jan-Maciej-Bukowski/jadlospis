import React from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  ButtonGroup,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Today,
  CalendarMonth,
  ViewWeek,
  ViewDay,
  ViewAgenda,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { Navigate } from "react-big-calendar";

function CustomCalendarToolbar(props) {
  const { label, onNavigate, onView, view, views } = props;

  const availableViews = Array.isArray(views)
    ? views
    : views && typeof views === "object"
    ? Object.keys(views)
    : ["month", "week", "day", "agenda"];

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton
          onClick={() => onNavigate(Navigate.PREVIOUS)}
          size="small"
          sx={{
            color: "white",
            backgroundColor: "var(--color-surface-dark)",
            "&:hover": {
              backgroundColor: "var(--color-primary)",
            },
          }}
        >
          <ChevronLeft />
        </IconButton>

        <Button
          onClick={() => onNavigate(Navigate.TODAY)}
          variant="contained"
          size="small"
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
        >
          Dziś
        </Button>

        <IconButton
          onClick={() => onNavigate(Navigate.NEXT)}
          size="small"
          sx={{
            color: "white",
            backgroundColor: "var(--color-surface-dark)",
            "&:hover": {
              backgroundColor: "var(--color-primary)",
            },
          }}
        >
          <ChevronRight />
        </IconButton>
      </Box>

      <Typography
        variant="h6"
        sx={{ color: "white", fontWeight: 700, textAlign: "center" }}
      >
        {label}
      </Typography>

      <ButtonGroup variant="contained" size="small">
        {availableViews.map((viewName) => (
          <Button
            key={viewName}
            onClick={() => {
              if (onView) onView(viewName);
            }}
            startIcon={viewIcons[viewName] || null}
            sx={{
              backgroundColor:
                view === viewName
                  ? "var(--color-primary)"
                  : "var(--color-surface-dark)",
              color: "white",
              textTransform: "none",
            }}
          >
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              {viewLabels[viewName] || viewName}
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
  views: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
};

export default CustomCalendarToolbar;
