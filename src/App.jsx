import React, { useState } from "react";
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
