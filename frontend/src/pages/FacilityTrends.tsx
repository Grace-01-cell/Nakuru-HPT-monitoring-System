import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { FileText, Upload } from "lucide-react";
import api from "../api/api";
import "./FacilityTrends.css";

interface FacilityRecord {
  mfl_code: string;
  facility_name: string;
  subcounty_name: string;
  ward_name: string;
  reporting_period: string;
  amount_received: number;
  amount_allocated_to_hpt: number;
  amount_spent_on_hpt: number;
  hpt_percent: number;
  compliance_status: string;
  amount_used_for_chp_kits: number;
  chp_kits_percent_of_hpt: number;
  chp_kits_status: string;
  supporting_document: string;
}

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function FacilityTrends() {
  const user = JSON.parse(localStorage.getItem("hpt_user") || "{}");
  const facilityMfl = user?.facility_mfl_code;

  const [records, setRecords] = useState<FacilityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/records")
      .then((res) => {
        setRecords(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to load facility trends");
      })
      .finally(() => setLoading(false));
  }, []);

  const facilityRecords = useMemo(() => {
    return records.filter(
      (record) => String(record.mfl_code) === String(facilityMfl)
    );
  }, [records, facilityMfl]);

  const trendData = facilityRecords.map((record) => ({
    reporting_period: record.reporting_period,
    hpt_percent: Number(record.hpt_percent || 0),
    chp_kits_percent: Number(record.chp_kits_percent_of_hpt || 0),
  }));

  const latestRecord = facilityRecords[facilityRecords.length - 1];

  function openDocument(path: string) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const documentPath = path.startsWith("/") ? path : `/${path}`;
    window.open(`${baseUrl}${documentPath}`, "_blank");
  }

  if (loading) {
    return <div className="facility-trends-page">Loading facility trends...</div>;
  }

  return (
    <div className="facility-trends-page">
      <div className="facility-trends-header">
        <div>
          <h2>Facility Performance Trend</h2>
          <p>
            Monthly HPT compliance and CHP Kits utilization for{" "}
            <strong>{user?.facility_name || "this facility"}</strong>.
          </p>
        </div>
      </div>

      <div className="facility-kpi-grid">
        <div className="facility-kpi-card">
          <span>Total Submissions</span>
          <strong>{facilityRecords.length}</strong>
        </div>

        <div className="facility-kpi-card">
          <span>Latest HPT Compliance</span>
          <strong>{latestRecord ? `${latestRecord.hpt_percent}%` : "0%"}</strong>
        </div>

        <div className="facility-kpi-card">
          <span>Latest CHP Kits Utilization</span>
          <strong>
            {latestRecord ? `${latestRecord.chp_kits_percent_of_hpt}%` : "0%"}
          </strong>
        </div>

        <div className="facility-kpi-card">
          <span>Latest HPT Allocation</span>
          <strong>
            {latestRecord ? money(latestRecord.amount_allocated_to_hpt) : money(0)}
          </strong>
        </div>
      </div>

      <div className="facility-chart-grid">
        <div className="facility-chart-card">
          <h3>Monthly HPT Compliance Progression</h3>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reporting_period" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="hpt_percent"
                name="HPT Compliance %"
                stroke="#2563eb"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="facility-chart-card">
          <h3>Monthly CHP Kits Utilization Progression</h3>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reporting_period" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="chp_kits_percent"
                name="CHP Kits % of HPT"
                stroke="#16a34a"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="facility-submissions-card">
        <h3>My Submissions</h3>

        <div className="facility-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reporting Period</th>
                <th>Total Funding</th>
                <th>HPT Allocated</th>
                <th>HPT Spent</th>
                <th>HPT Status</th>
                <th>CHP Kits %</th>
                <th>CHP Status</th>
                <th>Document</th>
                <th>Correction</th>
              </tr>
            </thead>

            <tbody>
              {facilityRecords.map((record, index) => (
                <tr key={`${record.mfl_code}-${record.reporting_period}-${index}`}>
                  <td>{record.reporting_period}</td>
                  <td>{money(record.amount_received)}</td>
                  <td>{money(record.amount_allocated_to_hpt)}</td>
                  <td>{money(record.amount_spent_on_hpt)}</td>
                  <td>
                    <span
                      className={
                        record.compliance_status === "Compliant"
                          ? "status compliant"
                          : "status non-compliant"
                      }
                    >
                      {record.compliance_status}
                    </span>
                  </td>
                  <td>{record.chp_kits_percent_of_hpt}%</td>
                  <td>
                    <span
                      className={
                        record.chp_kits_status === "Compliant"
                          ? "status compliant"
                          : "status non-compliant"
                      }
                    >
                      {record.chp_kits_status}
                    </span>
                  </td>
                  <td>
                    {record.supporting_document ? (
                      <button
                        type="button"
                        className="facility-doc-btn"
                        onClick={() => openDocument(record.supporting_document)}
                      >
                        <FileText size={15} />
                        View
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button type="button" className="facility-replace-btn" disabled>
                      <Upload size={15} />
                      Replace Document
                    </button>
                  </td>
                </tr>
              ))}

              {facilityRecords.length === 0 && (
                <tr>
                  <td colSpan={9}>No submissions found for this facility.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="facility-note">
          Document replacement will be enabled once the correction endpoint is added.
        </p>
      </div>
    </div>
  );
}

export default FacilityTrends;