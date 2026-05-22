import { Bell, CalendarDays, Search } from "lucide-react";
import "./Layout.css";

function Topbar() {
  return (
    <header className="topbar">
      <div>
        <h1>HPT Monitoring System</h1>
        <p>Nakuru County visibility and compliance tracking</p>
      </div>

      <div className="topbar-actions">
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search facility..." />
        </div>

        <button className="date-btn">
          <CalendarDays size={18} />
          May 2026
        </button>

        <button className="icon-btn">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}

export default Topbar;