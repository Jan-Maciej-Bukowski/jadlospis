import React from "react";
import { Box, Typography } from "@mui/material";
import LooksOneIcon from "@mui/icons-material/LooksOne";
import LooksTwoIcon from "@mui/icons-material/LooksTwo";
import Looks3Icon from "@mui/icons-material/Looks3";
import Looks4Icon from "@mui/icons-material/Looks4";
import Looks5Icon from "@mui/icons-material/Looks5";
import Looks6Icon from "@mui/icons-material/Looks6";
import PropTypes from "prop-types";

const icons = {
  1: LooksOneIcon,
  2: LooksTwoIcon,
  3: Looks3Icon,
  4: Looks4Icon,
  5: Looks5Icon,
  6: Looks6Icon,
};

function OptionTitle({ id, name }) {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      {/* <LooksOneIcon sx={{ color: "var(--color-secondary)" }} fontSize="large"/> */}
      {React.createElement(icons[id] || LooksOneIcon, {
        sx: { color: "var(--color-secondary)" },
        fontSize: "large",
      })}
      <Typography>{name}</Typography>
    </Box>
  );
}

OptionTitle.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string.isRequired,
};

export default OptionTitle;
