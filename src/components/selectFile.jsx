import React from "react";
import PropTypes from "prop-types";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import "../styles/components/selectFile.scss";

const SelectFile = ({
  id = "file",
  accept = "image/*",
  onChange,
  onClear,
  filename,
  previewUrl,
  disabled = false,
}) => {
  const inputRef = React.useRef(null);

  const handleClear = () => {
    // reset input value so onChange fires even for same file
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onClear && onClear();
  };

  return (
    <div
      className="container"
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <div
        className="header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: previewUrl ? "center" : "flex-start",
          gap: 12,
          height: 92,
          overflow: "hidden",
          borderRadius: 8,
        }}
      >
        {/* if preview exists — show full-image; otherwise show placeholder icon + text */}
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 8,
              display: "block",
            }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width={28}
              height={28}
            >
              <g id="SVGRepo_bgCarrier" strokeWidth={0} />
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 15.4806 20.1956 16.8084 19 17.5M7 10C4.79086 10 3 11.7909 3 14C3 15.4806 3.8044 16.8084 5 17.5M7 10C7.43285 10 7.84965 10.0688 8.24006 10.1959M12 12V21M12 12L15 15M12 12L9 15"
                  stroke="#000000"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
            <p style={{ margin: 0 }}>Wybierz plik do uploadu</p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label
          htmlFor={disabled ? undefined : id}
          className="footer"
          style={{
            flex: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <UploadFileIcon size="small" />

          <p
            style={{
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {filename || "Nie wybrano pliku"}
          </p>
        </label>

        {/* MUI trash button — stops propagation so it doesn't open file dialog */}
        <IconButton
          aria-label="Usuń plik"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          disabled={disabled}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => onChange && onChange(e)}
        disabled={disabled}
        style={{ display: "none" }}
      />
    </div>
  );
};
SelectFile.propTypes = {
  id: PropTypes.string,
  accept: PropTypes.string,
  onChange: PropTypes.func,
  onClear: PropTypes.func,
  filename: PropTypes.string,
  previewUrl: PropTypes.string,
  disabled: PropTypes.bool,
};

export default SelectFile;
