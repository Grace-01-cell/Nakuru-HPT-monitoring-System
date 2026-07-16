import { useState } from "react";
import "./MultiCheckboxFilter.css";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

function MultiCheckboxFilter({
  label,
  options,
  selected,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const allSelected =
    selected.length === 0 || selected.includes("All");

  function toggleOption(option: string) {
    if (option === "All") {
      onChange(["All"]);
      setOpen(false);
      return;
    }

    let updatedValues: string[];

    if (allSelected) {
      updatedValues = [option];
    } else if (selected.includes(option)) {
      updatedValues = selected.filter(
        (item) => item !== option
      );
    } else {
      updatedValues = [...selected, option];
    }

    if (updatedValues.length === 0) {
      updatedValues = ["All"];
    }

    onChange(updatedValues);

    // Close the dropdown immediately after selection.
    setOpen(false);
  }

  const displayText = allSelected
    ? "All"
    : selected.length === 1
    ? selected[0]
    : `${selected.length} selected`;

  return (
    <div className="multi-filter">
      <label>{label}</label>

      <button
        type="button"
        className="multi-filter-button"
        onClick={() =>
          setOpen((currentOpen) => !currentOpen)
        }
        aria-expanded={open}
      >
        <span>{displayText}</span>
        <span>{open ? "⌃" : "⌄"}</span>
      </button>

      {open && (
        <div className="multi-filter-dropdown">
          <label className="check-row">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => toggleOption("All")}
            />
            All
          </label>

          {options.map((option) => (
            <label
              className="check-row"
              key={option}
            >
              <input
                type="checkbox"
                checked={
                  !allSelected &&
                  selected.includes(option)
                }
                onChange={() =>
                  toggleOption(option)
                }
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiCheckboxFilter;