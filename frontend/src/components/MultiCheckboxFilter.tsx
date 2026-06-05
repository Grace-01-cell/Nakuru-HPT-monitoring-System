import { useState } from "react";
import "./MultiCheckboxFilter.css";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

function MultiCheckboxFilter({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.includes("All");

  function toggleOption(option: string) {
    if (option === "All") {
      onChange(["All"]);
      return;
    }

    let updated = allSelected
      ? [option]
      : selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    if (updated.length === 0) updated = ["All"];

    onChange(updated);
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
        onClick={() => setOpen(!open)}
      >
        <span>{displayText}</span>
        <span>⌄</span>
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
            <label className="check-row" key={option}>
              <input
                type="checkbox"
                checked={!allSelected && selected.includes(option)}
                onChange={() => toggleOption(option)}
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