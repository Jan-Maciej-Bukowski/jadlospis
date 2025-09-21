import React, { useState } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import { addDish }from "../js/potrawy";

export default function DodajPotrawe() {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [otherParams, setOtherParams] = useState("");

  function newDish() {
    const data = {
      name: name,
      tags: tags,
      otherParams: otherParams,
    };
    console.log("dodao potrawę: ", data);
    addDish(data);
  }

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
        Dodaj Nową Potrawę
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
        <TextField
          label="Nazwa Potrawy"
          variant="outlined"
          fullWidth
          required
          value={name}
          onChange={(e) => setName(e.target.value)} // Aktualizacja stanu
        />
        <TextField
          label="Tagi (np. wegańskie, szybkie)"
          variant="outlined"
          fullWidth
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)} // Aktualizacja stanu
        />
        <TextField
          label="Inne Parametry"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          value={otherParams}
          onChange={(e) => setOtherParams(e.target.value)} // Aktualizacja stanu
        />
        <Button onClick={newDish} variant="contained" color="primary" fullWidth>
          Dodaj
        </Button>
      </Box>
    </Box>
  );
}
