import { CalendarDays, X } from "lucide-react";
import "./MonthSelector.css";

const months = [
  "All",
  "May-2026",
  "Apr-2026",
  "Mar-2026",
  "Feb-2026",
  "Jan-2026",
];

function MonthSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="month-filter">
      

      <div className="month-select-wrap custom-month">
        <CalendarDays size={17} />

        <select value={value} onChange={(e) => onChange(e.target.value)}>
          
          {months.map((month) => (
            <option value={month} key={month}>
              {month}
            </option>
          ))}
        </select>

        {value && (
          <button type="button" onClick={() => onChange("")}>
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default MonthSelector;