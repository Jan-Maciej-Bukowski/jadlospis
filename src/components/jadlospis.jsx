import React, { useState } from "react";
import { settings } from "./ustawienia";

import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dishes from "../js/potrawy"; // Importuj potrawy
import { generateMenu } from "../js/generateMenu"; // Importuj funkcję generującą jadłospis

export default function Jadlospis() {
  const [menu, setMenu] = useState(null);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const handleGenerateMenu = () => {
    const generatedMenu = generateMenu(dishes, settings, daysOfWeek);
    setMenu(generatedMenu);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Jadłospis
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={handleGenerateMenu}
        sx={{ mb: 3 }}
      >
        Generuj jadłospis
      </Button>

      {menu && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Dzień tygodnia</strong>
              </TableCell>
              <TableCell>
                <strong>Proponowana potrawa</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {menu.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{entry.day}</TableCell>
                <TableCell>{entry.dish}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
