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

const DAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

export default function ListDishesConfig({ dishes, onDishChange }) {
  // Upewnij się, że dishes jest tablicą i ma elementy
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return null;
  }

  console.log(dishes);
  dishes.map((dish) => {
    DAYS.map((day) => {
      console.log((dish.allowedDays))// || DAYS).includes(day));
    });
  });

  return (
    <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
      <Typography
        variant="h6"
        sx={{ p: 2, borderBottom: "1px solid rgba(0,0,0,0.12)" }}
      >
        Tymczasowa konfiguracja potraw
        <Tooltip title="Te ustawienia działają tylko dla następnie wygenerowanego jadłospisu. Nie zmieniają oryginalnych ustawień potraw.">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Potrawa</TableCell>
            <TableCell>Dozwolone dni</TableCell>
            <TableCell align="center" sx={{ width: 160 }}>
              Max. na tydzień
            </TableCell>
            <TableCell align="center" sx={{ width: 160 }}>
              Max. w jadłospisie
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dishes.map((dish) => (
            <TableRow key={dish.name}>
              <TableCell>{dish.name}</TableCell>

              <TableCell>
                <FormGroup row>
                  {DAYS.map((day) => (
                    <FormControlLabel
                      key={day}
                      control={
                        <Checkbox
                          size="small"
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

              <TableCell align="center">
                <TextField
                  type="number"
                  size="small"
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

              <TableCell align="center">
                <TextField
                  type="number"
                  size="small"
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
