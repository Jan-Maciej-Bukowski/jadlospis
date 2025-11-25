import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import { Navigate } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pl";
import "react-big-calendar/lib/css/react-big-calendar.css";
import PropTypes from "prop-types";
import CustomCalendarToolbar from "./CustomCalendarToolbar";
import { settings }from "../../js/settings.js";

moment.locale("pl");
const localizer = momentLocalizer(moment);

function GeneratedCalendar({ menu, dateRangeStart }) {
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(dateRangeStart || new Date());

  useEffect(() => {
    if (dateRangeStart) setDate(dateRangeStart);
  }, [dateRangeStart]);

  // Funkcja do konwersji jadłospisu na eventy dla kalendarza
  const menuToCalendarEvents = (menuData, startDate) => {
    if (!menuData || !Array.isArray(menuData)) return [];
    const isMultiWeek = Array.isArray(menuData[0]);
    const allDays = isMultiWeek ? menuData.flat() : menuData;

    const events = [];
    let currentDate = new Date(startDate || date || new Date());
    currentDate.setHours(0, 0, 0, 0);

    allDays.forEach((dayEntry, index) => {
      if (!dayEntry) {
        currentDate.setDate(currentDate.getDate() + 1);
        return;
      }
      const times = Array.isArray(dayEntry.times) ? dayEntry.times : [];
      times.forEach((t, ti) => {
        const assigned = t.assigned || {};
        const name = assigned.name || "";
        const startParts = (t.startTime || t.start || "00:00").split(":");
        const endParts = (t.endTime || t.end || "00:00").split(":");
        const s = new Date(currentDate);
        s.setHours(
          Number(startParts[0] || 0),
          Number(startParts[1] || 0),
          0,
          0
        );
        const e = new Date(currentDate);
        e.setHours(Number(endParts[0] || 0), Number(endParts[1] || 0), 0, 0);

        // hide placeholders (no dish)
        if (!name || name === (settings?.noDishText || "Brak potraw")) return;

        events.push({
          id: `day-${index}-${ti}`,
          title: `${name}`,
          start: s,
          end: e,
          resource: {
            assigned,
            startTime: t.startTime || t.start,
            endTime: t.endTime || t.end,
          },
        });
      });

      currentDate.setDate(currentDate.getDate() + 1);
    });

    return events;
  };

  // NEW: stylizuj eventy na podstawie ich stanu
  const eventStyleGetter = (event) => {
    if (!event.resource?.assigned || !event.resource.assigned.name) {
      return { style: { display: "none", height: 0, padding: 0, margin: 0 } };
    }
    return {
      style: {
        backgroundColor: "#04bf8a",
        border: "1px solid #026873",
        padding: "4px 6px",
        fontSize: "0.85rem",
      },
    };
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
    <Box className="calendar-container" sx={{ height: 700 }}>
      <Calendar
        localizer={localizer}
        events={menuToCalendarEvents(menu, dateRangeStart)}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        views={["month", "week", "day", "agenda"]}
        view={view}
        date={date}
        onView={(v) => setView(v)}
        onNavigate={(newDate) => setDate(new Date(newDate))}
        eventPropGetter={eventStyleGetter}
        components={{ toolbar: CustomCalendarToolbar }}
        messages={messages}
        culture="pl"
      />
    </Box>
  );
}

GeneratedCalendar.propTypes = {
  menu: PropTypes.array.isRequired,
  dateRangeStart: PropTypes.instanceOf(Date),
};

export default GeneratedCalendar;
