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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import DAYS from "../utils/days.js";

export default function ListDishesConfig({ dishes, onDishChange }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Upewnij się, że dishes jest tablicą i ma elementy
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return null;
  }

  return (
    <TableContainer
      component={Paper}
      sx={{ 
        mt: { xs: 1, md: 2 }, 
        mb: { xs: 1, md: 2 },
        maxHeight: { xs: "400px", md: "none" },
        overflowY: { xs: "auto", md: "visible" }
      }}
      className="config-table"
      id="temporary-meals-config"
    >
      <Table size={isMobile ? "small" : "small"}>
        <TableHead>
          <TableRow className="config-table-header">
            <TableCell 
              className="config-column-header"
              sx={{ 
                fontSize: { xs: "0.75rem", md: "0.875rem" },
                padding: { xs: "8px 4px", md: "12px 16px" }
              }}
            >
              Potrawa
            </TableCell>
            <TableCell 
              className="config-column-header"
              sx={{ 
                fontSize: { xs: "0.75rem", md: "0.875rem" },
                padding: { xs: "8px 4px", md: "12px 16px" },
                display: { xs: "none", sm: "table-cell" }
              }}
            >
              Dozwolone dni
            </TableCell>
            <TableCell
              className="config-column-header"
              align="center"
              sx={{ 
                width: { xs: 80, md: 160 },
                fontSize: { xs: "0.7rem", md: "0.875rem" },
                padding: { xs: "8px 4px", md: "12px 16px" }
              }}
            >
              {isMobile ? "Max/tydz." : "Max. na tydzień"}
            </TableCell>
            <TableCell
              className="config-column-header"
              align="center"
              sx={{ 
                width: { xs: 80, md: 160 },
                fontSize: { xs: "0.7rem", md: "0.875rem" },
                padding: { xs: "8px 4px", md: "12px 16px" }
              }}
            >
              {isMobile ? "Max/jadł." : "Max. w jadłospisie"}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dishes.map((dish) => (
            <TableRow key={dish.name} className="config-row">
              <TableCell 
                className="config-meal-name"
                sx={{ 
                  fontSize: { xs: "0.8rem", md: "0.875rem" },
                  padding: { xs: "8px 4px", md: "12px 16px" }
                }}
              >
                {dish.name}
              </TableCell>

              <TableCell 
                className="config-days"
                sx={{ 
                  padding: { xs: "8px 4px", md: "12px 16px" },
                  display: { xs: "none", sm: "table-cell" }
                }}
              >
                <FormGroup row className="config-days-group">
                  {DAYS.map((day) => (
                    <FormControlLabel
                      key={day}
                      className="config-day-checkbox"
                      control={
                        <Checkbox
                          size="small"
                          className="checkbox"
                          checked={(dish.allowedDays || DAYS).includes(day)}
                          onChange={(e) => {
                            const currentDays = dish.allowedDays || DAYS;
                            const newDays = e.target.checked
                              ? [...currentDays, day]
                              : currentDays.filter((d) => d !== day);

                            onDishChange(dish.name, {
                              ...dish,
                              allowedDays: newDays.length ? newDays : DAYS,
                            });
                          }}
                        />
                      }
                      label={day.slice(0, 3)}
                      sx={{ mr: { xs: 0.5, md: 1 } }}
                    />
                  ))}
                </FormGroup>
              </TableCell>

              <TableCell 
                align="center" 
                className="config-max-week"
                sx={{ padding: { xs: "8px 4px", md: "12px 16px" } }}
              >
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
                  sx={{ width: { xs: 50, md: 80 } }}
                />
              </TableCell>

              <TableCell 
                align="center" 
                className="config-max-total"
                sx={{ padding: { xs: "8px 4px", md: "12px 16px" } }}
              >
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
                  sx={{ width: { xs: 50, md: 80 } }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
