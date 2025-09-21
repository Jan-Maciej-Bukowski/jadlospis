import React, { useState } from "react";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import Navigation from "./components/navbar";

function App() {
  const [value, setValue] = useState(0); // Initialize state for BottomNavigation

  return (
    <>
      <Navigation></Navigation>
    </>
  );
}

export default App;
