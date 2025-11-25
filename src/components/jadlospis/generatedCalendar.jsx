import React from "react";
import { Box } from "@mui/material";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pl";
import "react-big-calendar/lib/css/react-big-calendar.css";
import PropTypes from "prop-types";
import CustomCalendarToolbar from "./CustomCalendarToolbar";

moment.locale("pl");
const localizer = momentLocalizer(moment);

function GeneratedCalendar({ menu, dateRangeStart }) {
  // Funkcja do konwersji jadłospisu na eventy dla kalendarza
  const menuToCalendarEvents = (menuData, startDate) => {
    if (!menuData || !Array.isArray(menuData)) return [];

    const isMultiWeek = Array.isArray(menuData[0]);
    const allDays = isMultiWeek ? menuData.flat() : menuData;

    const events = [];
    let currentDate = new Date(startDate || new Date());
    currentDate.setHours(0, 0, 0, 0);

    allDays.forEach((dayEntry, index) => {
      if (!dayEntry || !dayEntry.day) return;

      const meals = ["śniadanie", "obiad", "kolacja"];

      // Dla każdej pory dnia utwórz osobny event
      meals.forEach((meal) => {
        const dish = dayEntry[meal];
        const dishName = dish?.name || dish || "Brak potraw";

        // empty event
        if (dishName === "Brak potraw") {
          console.log("Creating empty event for", meal, "on", currentDate);
          events.push({
            id: `empty-day-${index}-${meal}`,
            className: "empty-event",
            title: `${meal}: Brak potraw`,
            start: new Date(currentDate),
            end: new Date(currentDate),
            resource: {
              dayEntry,
              meal,
              dishName: null,
            },
          });
        } else {
          events.push({
            id: `day-${index}-${meal}`,
            title: `${meal}: ${dishName}`,
            start: new Date(currentDate),
            end: new Date(currentDate),
            resource: {
              dayEntry,
              meal,
              dishName,
            },
          });
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);
    });

    return events;
  };

  // NEW: stylizuj eventy na podstawie ich stanu
  const eventStyleGetter = (event) => {
    if (event.resource?.dishName === null) {
      // Empty event - ukryj
      return {
        style: {
          visibility: "hidden",
         
        },
      };
    }
    // Normal event
    return {
      style: {
        backgroundColor: "#04bf8a",
        border: "1px solid #026873",
        padding: "4px 6px",
        fontSize: "0.85rem",
        whiteSpace: "normal",
        wordBreak: "break-word",
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
        defaultView="month"
        views={["month", "week", "day", "agenda"]}
        defaultDate={dateRangeStart || new Date()}
        popup={true}
        selectable={false}
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: CustomCalendarToolbar,
        }}
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
