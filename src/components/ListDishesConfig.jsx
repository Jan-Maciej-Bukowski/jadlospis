import React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import log from "../utils/log";
import DAYS from "../utils/days.js";

export default function ListDishesConfig({ dishes, onDishChange }) {
  // Upewnij się, że dishes jest tablicą i ma elementy
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return null;
  }

  console.log("DISHES", dishes);
  dishes.map((dish) => {
    DAYS.map((day) => {
      console.log("dni: " + dish.allowedDays); // || DAYS).includes(day));
    });
  });

  return (
    <TableContainer
      component={Paper}
      sx={{ mt: 2, mb: 2 }}
      className="config-table"
      id="temporary-meals-config"
    >
      <Table size="small">
        <TableHead>
          <TableRow className="config-table-header">
            <TableCell className="config-column-header">Potrawa</TableCell>
            <TableCell className="config-column-header">
              Dozwolone dni
            </TableCell>
            <TableCell
              className="config-column-header"
              align="center"
              sx={{ width: 160 }}
            >
              Max. na tydzień
            </TableCell>
            <TableCell
              className="config-column-header"
              align="center"
              sx={{ width: 160 }}
            >
              Max. w jadłospisie
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dishes.map((dish) => (
            <TableRow key={dish.name} className="config-row">
              <TableCell className="config-meal-name">{dish.name}</TableCell>

              <TableCell className="config-days">
                <FormGroup row className="config-days-group">
                  {DAYS.map((day) => (
                    <FormControlLabel
                      key={day}
                      className="config-day-checkbox"
                      control={
                        <Checkbox
                          size="small"
                          className="config-checkbox"
                          checked={(dish.allowedDays || DAYS).includes(day)}
                          onChange={(e) => {
                            const currentDays = dish.allowedDays || DAYS;
                            const newDays = e.target.checked
                              ? [...currentDays, day]
                              : currentDays.filter((d) => d !== day);

                            log("current/new", currentDays, newDays);

                            onDishChange(dish.name, {
                              ...dish,
                              allowedDays: newDays.length ? newDays : DAYS,
                            });
                          }}
                        />
                      }
                      label={day.slice(0, 3)} // Skrócone nazwy dni
                      sx={{ mr: 1 }}
                    />
                  ))}
                </FormGroup>
              </TableCell>

              <TableCell align="center" className="config-max-week">
                <TextField
                  type="number"
                  size="small"
                  className="config-number-input"
                  value={dish.maxRepeats || 1}
                  onChange={(e) =>
                    onDishChange(dish.name, {
                      ...dish,
                      maxRepeats: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  inputProps={{
                    min: 1,
                    max: 7,
                    style: { textAlign: "center" },
                  }}
                  sx={{ width: 80 }}
                />
              </TableCell>

              <TableCell align="center" className="config-max-total">
                <TextField
                  type="number"
                  size="small"
                  className="config-number-input"
                  value={dish.maxAcrossWeeks || ""}
                  onChange={(e) =>
                    onDishChange(dish.name, {
                      ...dish,
                      maxAcrossWeeks: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  inputProps={{
                    min: 1,
                    style: { textAlign: "center" },
                  }}
                  sx={{ width: 80 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
