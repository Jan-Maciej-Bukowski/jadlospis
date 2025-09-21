import React, { useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import dishes from "../js/potrawy"; // Importuj tablicę potraw

export default function Potrawy() {
  const [openIndex, setOpenIndex] = useState(null); // Przechowuje indeks otwartego elementu
  const [editIndex, setEditIndex] = useState(null); // Przechowuje indeks edytowanego elementu
  const [editedDish, setEditedDish] = useState({ name: "", tags: "" }); // Przechowuje dane edytowanej potrawy

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index); // Przełącz otwieranie/zamykanie
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedDish({
      name: dishes[index].name,
      tags: dishes[index].tags.join(", "),
    });
  };

  const handleSave = (index) => {
    // Zapisz zmiany w tablicy potraw
    dishes[index].name = editedDish.name;
    dishes[index].tags = editedDish.tags.split(",").map((tag) => tag.trim());
    setEditIndex(null); // Zamknij tryb edycji
  };

  const handleCancel = () => {
    setEditIndex(null); // Anuluj edycję
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Lista Potraw
      </Typography>

      <List>
        {dishes.map((dish, index) => (
          <React.Fragment key={index}>
            <ListItem button onClick={() => handleToggle(index)}>
              <ListItemText primary={dish.name} />
              {openIndex === index ? <ExpandLess /> : <ExpandMore />}
            </ListItem>

            <Collapse in={openIndex === index} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 4, pb: 2 }}>
                <Typography variant="subtitle1">Tagi:</Typography>
                <Typography variant="body2">
                  {dish.tags.join(", ") || "Brak tagów"}
                </Typography>

                {/* Edycja potrawy */}
                {editIndex === index ? (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      label="Nazwa potrawy"
                      variant="outlined"
                      fullWidth
                      value={editedDish.name}
                      onChange={(e) =>
                        setEditedDish({ ...editedDish, name: e.target.value })
                      }
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Tagi (oddzielone przecinkami)"
                      variant="outlined"
                      fullWidth
                      value={editedDish.tags}
                      onChange={(e) =>
                        setEditedDish({ ...editedDish, tags: e.target.value })
                      }
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSave(index)}
                      sx={{ mr: 2 }}
                    >
                      Zapisz
                    </Button>
                    <Button variant="outlined" onClick={handleCancel}>
                      Anuluj
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleEdit(index)}
                    sx={{ mt: 2 }}
                  >
                    Edytuj
                  </Button>
                )}
              </Box>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}
