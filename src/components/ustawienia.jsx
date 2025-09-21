import React, { useState } from "react";
export let settings = [];
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";

export default function Ustawienia() {
  const [tag, setTag] = useState("");
  const [days, setDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false,
  });
  const [maxRepeats, setMaxRepeats] = useState(1);

  const handleDayChange = (day) => {
    setDays((prevDays) => ({
      ...prevDays,
      [day]: !prevDays[day],
    }));
  };

  const handleSaveSettings = () => {
    settings = {
      tag,
      allowedDays: Object.keys(days).filter((day) => days[day]),
      maxRepeats,
    };
    console.log("nowe ustawienia: ",settings);
  };

  return (
    <Box
      id="container"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: 2,
      }}
    >
      <Typography variant="h4" sx={{ mb: 3 }}>
        Ustawienia
      </Typography>

      <Box
        component="form"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          width: "100%",
          maxWidth: 400,
        }}
      >
        {/* Pole do wprowadzenia tagu */}
        <TextField
          label="Tag potrawy"
          variant="outlined"
          fullWidth
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />

        {/* Wybór dni tygodnia */}
        <Typography variant="subtitle1">Wybierz dni tygodnia:</Typography>
        <FormGroup>
          {Object.keys(days).map((day) => (
            <FormControlLabel
              key={day}
              control={
                <Checkbox
                  checked={days[day]}
                  onChange={() => handleDayChange(day)}
                />
              }
              label={day}
            />
          ))}
        </FormGroup>

        {/* Maksymalna liczba powtórzeń */}
        <TextField
          label="Maksymalna liczba powtórzeń w tygodniu"
          type="number"
          variant="outlined"
          fullWidth
          value={maxRepeats}
          onChange={(e) => setMaxRepeats(Number(e.target.value))}
          inputProps={{ min: 1 }}
        />

        {/* Przycisk zapisu */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSaveSettings}
        >
          Zapisz ustawienia
        </Button>
      </Box>
    </Box>
  );
}
