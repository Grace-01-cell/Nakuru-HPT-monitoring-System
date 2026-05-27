import "./FacilityTrends.css";
import { LineChart } from "lucide-react";

function FacilityTrends() {
  return (
    <div className="facility-coming-page">
      <img
        src="/assets/Lake-Nakuru-2.png"
        alt=""
        className="facility-bg-image"
      />

      <div className="facility-bg-overlay" />

      <div className="facility-coming-card">
        <div className="facility-icon">
          <LineChart size={42} />
        </div>

        <h1>Facility Trends</h1>

        <p className="coming-soon">
          Advanced facility-level analytics will become available as additional
          monthly reporting data is collected.
        </p>

        <div className="future-features">
          <div className="feature-item">Facility-level compliance trends over time</div>
          <div className="feature-item">HPT allocation and expenditure history</div>
          <div className="feature-item">CHP Kits utilization tracking</div>
          
          <div className="feature-item">Submission history and reporting timelines</div>
          <div className="feature-item">Procurement source trends (KEMSA/MEDS/Other)</div>
          <div className="feature-item">Supporting document history</div>
        </div>
      </div>
    </div>
  );
}

export default FacilityTrends;