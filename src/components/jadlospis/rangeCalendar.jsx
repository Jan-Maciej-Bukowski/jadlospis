import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pl";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Box, Typography, Button } from "@mui/material";
import PropTypes from "prop-types";
import CustomCalendarToolbar from "./CustomCalendarToolbar";

moment.locale("pl");
const localizer = momentLocalizer(moment);

function RangeCalendar({ onDateRangeSelect, selectedStart, selectedEnd }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [tempStart, setTempStart] = useState(null);

  // new: control view/date so navigation and view buttons work reliably
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(selectedStart || new Date());

  useEffect(() => {
    if (selectedStart) setDate(selectedStart);
  }, [selectedStart]);

  const handleSelectSlot = (slotInfo) => {
    if (!selectionMode) return;

    const clickedDate = slotInfo.start;

    if (!tempStart) {
      // First click
      setTempStart(clickedDate);
    } else {
      // Second click
      const start = tempStart <= clickedDate ? tempStart : clickedDate;
      const end = tempStart <= clickedDate ? clickedDate : tempStart;

      onDateRangeSelect?.(start, end);
      setTempStart(null);
      setSelectionMode(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setTempStart(null);
  };

  // Zakresy jako eventy do wyświetlenia na kalendarzu
  const events = [];
  if (selectedStart && selectedEnd) {
    events.push({
      id: "range",
      title: `Jadłospis: ${moment(selectedStart).format("DD.MM")} - ${moment(
        selectedEnd
      ).format("DD.MM")}`,
      start: selectedStart,
      end: moment(selectedEnd).add(1, "day").toDate(), // +1 dzień aby obejmować ostatni dzień
      resource: "range",
    });
  }

  if (tempStart) {
    events.push({
      id: "temp",
      title: `Od: ${moment(tempStart).format("DD.MM")}`,
      start: tempStart,
      end: tempStart,
      resource: "temp",
    });
  }

  const eventStyleGetter = (event) => {
    if (event.resource === "range") {
      return {
        style: {
          backgroundColor: "#04bf8a",
          borderRadius: "5px",
          opacity: 0.8,
          color: "white",
          border: "2px solid #026873",
          display: "block",
        },
      };
    }
    if (event.resource === "temp") {
      return {
        style: {
          backgroundColor: "#ff9800",
          borderRadius: "5px",
          opacity: 0.6,
          color: "white",
          border: "1px dashed #ff6f00",
          display: "block",
        },
      };
    }
    return {};
  };

  const messages = {
    today: "Dziś",
    previous: "Poprzedni",
    next: "Następny",
    month: "Miesiąc",
    week: "Tydzień",
    day: "Dzień",
    agenda: "Agenda",
    date: "Data",
    time: "Czas",
    event: "Wydarzenie",
    showMore: (total) => `+${total} więcej`,
  };

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 700,
          color: "var(--color-bg-dark)",
        }}
      >
        Wybierz zakres dat dla jadłospisu
      </Typography>

      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Button
          variant={selectionMode ? "contained" : "outlined"}
          color={selectionMode ? "primary" : "inherit"}
          onClick={() => {
            if (selectionMode) {
              handleCancelSelection();
            } else {
              setSelectionMode(true);
              setTempStart(null);
            }
          }}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1,
          }}
        >
          {selectionMode ? "Anuluj wybór" : "Wybierz zakres"}
        </Button>

        {selectionMode && tempStart && (
          <Typography
            variant="body2"
            sx={{
              alignSelf: "center",
              color: "var(--color-primary-dark)",
              fontWeight: 500,
            }}
          >
            Kliknij drugą datę (od {moment(tempStart).format("DD.MM.YYYY")})
          </Typography>
        )}

        {selectedStart && selectedEnd && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              backgroundColor: "rgba(4, 191, 138, 0.1)",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--color-primary)",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Wybrany zakres: {moment(selectedStart).format("DD.MM.YYYY")} -{" "}
              {moment(selectedEnd).format("DD.MM.YYYY")}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                onDateRangeSelect?.(null, null);
              }}
              sx={{ textTransform: "none" }}
            >
              Wyczyść
            </Button>
          </Box>
        )}
      </Box>

      <Box
        className="calendar-container"
        sx={{
          height: 550,
          "& .rbc-date-cell": {
            cursor: selectionMode ? "pointer" : "default",
            "&:hover": selectionMode
              ? { backgroundColor: "rgba(4, 191, 138, 0.1)" }
              : {},
          },
          "& .rbc-slot-selecting": {
            backgroundColor: "rgba(4, 191, 138, 0.2)",
          },
        }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day", "agenda"]}
          view={view}
          date={date}
          onView={(v) => setView(v)}
          onNavigate={(newDate) => setDate(new Date(newDate))}
          defaultView={Views.MONTH}
          defaultDate={new Date()}
          onSelectSlot={handleSelectSlot}
          selectable={selectionMode}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomCalendarToolbar,
          }}
          messages={messages}
          culture="pl"
        />
      </Box>
    </Box>
  );
}

RangeCalendar.propTypes = {
  onDateRangeSelect: PropTypes.func,
  selectedStart: PropTypes.instanceOf(Date),
  selectedEnd: PropTypes.instanceOf(Date),
};

export default RangeCalendar;
