import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Building2,
  
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import "./Layout.css";

const menuItems = [
  
  { label: "Data Collection", path: "/data-collection", icon: ClipboardList },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Submissions", path: "/submissions", icon: FileText },
  { label: "Facilities", path: "/facilities", icon: Building2 },
  
  { label: "Settings", path: "/settings", icon: Settings },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/assets/nakuru-logo.png" alt="Nakuru County" />
        <div>
          <h2>Nakuru County</h2>
          <p>HPT Monitoring</p>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-box">
          <div className="avatar">JD</div>
          <div>
            <strong>Jane Doe</strong>
            <p>County Viewer</p>
          </div>
        </div>

        <button className="logout-btn">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;