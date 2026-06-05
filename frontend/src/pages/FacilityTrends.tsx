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

        <h1>Facility Performance Trend</h1>

        <p className="coming-soon">
          Coming soon: This page will provide facility-specific performance trends and
  comparisons once multiple reporting periods have been validated.
        </p>

        <div className="future-features">
          <div className="feature-item">Facility-level compliance trends over time</div>
          <div className="feature-item">Monthly HPT compliance progression</div>
          <div className="feature-item">Monthly CHP Kits utilization progression</div>
          

        </div>
      </div>
    </div>
  );
}

export default FacilityTrends;