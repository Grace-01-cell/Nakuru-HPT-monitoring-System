import { useEffect, useState } from "react";
import {
  Wallet,
  Download,
  Package,
  ClipboardCheck,
  Percent,
  ShieldCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../api/api";
import "./Dashboard.css";
import MonthSelector from "../components/MonthSelector";
function getMonthYear(dateString: string) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  }).replace(" ", "-");
}
interface Summary {
  total_amount_received: number;
  total_hpt_allocated: number;
  total_hpt_spent: number;
  total_balance: number;
  average_hpt_percent: number;
  required_hpt_percent: number;
  total_facilities_submitted: number;
  compliant_facilities: number;
  non_compliant_facilities: number;
  total_chp_kits_used: number;
  required_chp_kits_amount: number;
  chp_kits_percent_of_hpt: number;
  required_chp_kits_percent_of_hpt: number;
  chp_kits_compliant_facilities: number;
  chp_kits_below_target_facilities: number;
}

interface FacilityCompliance {
  mfl_code: string;
  facility_name: string;
  subcounty_name: string;
  ward_name: string;
  amount_received: number;
  hpt_allocated: number;
  hpt_spent: number;
  balance: number;
  hpt_percent: number;
  required_hpt_percent: number;
  compliance_status: string;
  amount_used_for_chp_kits: number;
  required_chp_kits_amount: number;
  chp_kits_percent_of_hpt: number;
  required_chp_kits_percent_of_hpt: number;
  chp_kits_status: string;
  reporting_period: string;
}

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
}) {
  return (
    <div className="kpi-card">
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
        <span>{subtitle}</span>
      </div>
      <div className="kpi-icon">
        <Icon size={22} />
      </div>
    </div>
  );
}

function CountyDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [facilities, setFacilities] = useState<FacilityCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedSubcounty, setSelectedSubcounty] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");

  const rowsPerPage = 10;

  useEffect(() => {
  setLoading(true);

  api
    .get(`/dashboard/county?reporting_periods=${selectedMonth}`)
    .then((res) => {
      setSummary(res.data.summary);
      setFacilities(res.data.facility_compliance);
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to load dashboard data");
    })
    .finally(() => setLoading(false));
}, [selectedMonth]);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (!summary) {
    return <div>No dashboard data found.</div>;
  }

  const subcounties = [
    "All",
    ...Array.from(
      new Set(
        facilities
          .map((facility) => facility.subcounty_name)
          .filter((name) => name && name.trim() !== "")
      )
    ),
  ];

  const filteredFacilities = facilities.filter((facility) => {
    return (
      selectedSubcounty === "All" || facility.subcounty_name === selectedSubcounty
    );
  });
  const filteredSummary = {
    total_amount_received: filteredFacilities.reduce(
  (sum, facility) => sum + Number(facility.amount_received || 0),
  0
),
    total_hpt_allocated: filteredFacilities.reduce(
      (sum, facility) => sum + Number(facility.hpt_allocated || 0),
      0
    ),

    total_hpt_spent: filteredFacilities.reduce(
      (sum, facility) => sum + Number(facility.hpt_spent || 0),
      0
    ),

    total_chp_kits_used: filteredFacilities.reduce(
      (sum, facility) => sum + Number(facility.amount_used_for_chp_kits || 0),
      0
    ),

    compliant_facilities: filteredFacilities.filter(
      (facility) => facility.compliance_status === "Compliant"
    ).length,

    non_compliant_facilities: filteredFacilities.filter(
      (facility) => facility.compliance_status === "Non-Compliant"
    ).length,

    chp_kits_compliant_facilities: filteredFacilities.filter(
      (facility) => facility.chp_kits_status === "Compliant"
    ).length,

    chp_kits_below_target_facilities: filteredFacilities.filter(
      (facility) => facility.chp_kits_status === "Below Target"
    ).length,
  };

  const filteredHptPercent =
    filteredSummary.total_amount_received > 0
      ? (
          (filteredSummary.total_hpt_allocated /
            filteredSummary.total_amount_received) *
          100
        ).toFixed(2)
      : "0.00";

  const filteredHptUtilization =
    filteredSummary.total_hpt_allocated > 0
      ? (
          (filteredSummary.total_hpt_spent /
            filteredSummary.total_hpt_allocated) *
          100
        ).toFixed(1)
      : "0.0";

  const filteredChpPercent =
    filteredSummary.total_hpt_allocated > 0
      ? (
          (filteredSummary.total_chp_kits_used /
            filteredSummary.total_hpt_allocated) *
          100
        ).toFixed(2)
      : "0.00";

  const submittedFacilities = filteredFacilities.length || 1;

  const lowestHptFacilities = [...filteredFacilities]
    .sort((a, b) => a.hpt_percent - b.hpt_percent)
    .slice(0, 10);

  const lowestChpFacilities = [...filteredFacilities]
    .sort((a, b) => a.chp_kits_percent_of_hpt - b.chp_kits_percent_of_hpt)
    .slice(0, 10);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFacilities.length / rowsPerPage)
  );

  const paginatedFacilities = filteredFacilities.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  function downloadCSV() {
    const headers = [
      "Facility",
      "Subcounty",
      "Ward",
      "Amount Received",
      "HPT Allocated",
      "HPT Spent",
      "HPT %",
      "HPT Status",
      "CHP Kits Amount",
      "CHP Kits %",
      "CHP Kits Status",
    ];

    const rows = filteredFacilities.map((facility) => [
      facility.facility_name,
      facility.subcounty_name,
      facility.ward_name,
      facility.amount_received,
      facility.hpt_allocated,
      facility.hpt_spent,
      facility.hpt_percent,
      facility.compliance_status,
      facility.amount_used_for_chp_kits,
      facility.chp_kits_percent_of_hpt,
      facility.chp_kits_status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "facility_compliance.csv";
    link.click();

    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <h2>County Dashboard</h2>
        <p>Facility-level HPT and CHP Kits compliance visibility.</p>
      </div>

      <div className="dashboard-filters">
        <div className="filter-group">
          <label>Subcounty</label>
          <select
            value={selectedSubcounty}
            onChange={(e) => {
              setSelectedSubcounty(e.target.value);
              setPage(1);
            }}
          
        
          >
            {subcounties.map((subcounty) => (
              <option key={subcounty} value={subcounty}>
                {subcounty}
              </option>
            ))}
          </select>
        </div>
        <MonthSelector
          value={selectedMonth}
          onChange={setSelectedMonth}
        />
      </div>

      <div className="kpi-grid">
        <KpiCard
          title="Total Funds Received"
          value={money(filteredSummary.total_amount_received)}
          subtitle={`${filteredFacilities.length} facilities submitted`}
          icon={Wallet}
        />

        <KpiCard
          title="Total HPT Allocation"
          value={money(filteredSummary.total_hpt_allocated)}
          subtitle={`${filteredHptPercent}% of total received`}
          icon={Percent}
        />

        <KpiCard
          title="Total HPT Expenditure"
          value={money(filteredSummary.total_hpt_spent)}
          subtitle={`${filteredHptUtilization}% of HPT allocated`}
          icon={ShieldCheck}
        />

        <KpiCard
          title="CHP Kits Support"
          value={money(filteredSummary.total_chp_kits_used)}
          subtitle={`${filteredChpPercent}% of HPT allocation`}
          icon={Package}
        />

        <KpiCard
          title="CHP Kits Compliance"
          value={`${filteredSummary.chp_kits_compliant_facilities}/${filteredFacilities.length}`}
          subtitle="Facilities meeting CHP Kits target"
          icon={ClipboardCheck}
        />
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3>HPT Compliance Status</h3>

          <div className="compliance-bars">
            <div className="compliance-row">
              <div>
                <strong>Compliant</strong>
                <span>Facilities meeting 40% HPT requirement</span>
              </div>
              <b>{filteredSummary.compliant_facilities}</b>
            </div>

            <div className="bar-track">
              <div
                className="bar-fill green"
                style={{
                  width: `${
                    (filteredSummary.compliant_facilities /
                      submittedFacilities) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="compliance-row">
              <div>
                <strong>Non-Compliant</strong>
                <span>Facilities below 40% HPT requirement</span>
              </div>
              <b>{filteredSummary.non_compliant_facilities}</b>
            </div>

            <div className="bar-track">
              <div
                className="bar-fill red"
                style={{
                  width: `${
                    (filteredSummary.non_compliant_facilities /
                      submittedFacilities) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="chart-card wide">
          <h3>Bottom 10 Facilities by HPT %</h3>

          <ResponsiveContainer width="100%" height={420}>
            <BarChart
              data={lowestHptFacilities}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 180, bottom: 10 }}
            >
              <XAxis type="number" domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="facility_name"
                width={170}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="hpt_percent"
                name="HPT %"
                fill="#2563eb"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3>CHP Kits Compliance Status</h3>

          <div className="compliance-bars">
            <div className="compliance-row">
              <div>
                <strong>Compliant</strong>
                <span>Facilities meeting 5% of HPT target</span>
              </div>
              <b>{filteredSummary.chp_kits_compliant_facilities}</b>
            </div>

            <div className="bar-track">
              <div
                className="bar-fill green"
                style={{
                  width: `${
                    (filteredSummary.chp_kits_compliant_facilities /
                      submittedFacilities) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="compliance-row">
              <div>
                <strong>Below Target</strong>
                <span>Facilities below CHP Kits requirement</span>
              </div>
              <b>{filteredSummary.chp_kits_below_target_facilities}</b>
            </div>

            <div className="bar-track">
              <div
                className="bar-fill red"
                style={{
                  width: `${
                    (filteredSummary.chp_kits_below_target_facilities /
                      submittedFacilities) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="chart-card wide">
          <h3>Bottom 10 Facilities by CHP Kits %</h3>

          <ResponsiveContainer width="100%" height={420}>
            <BarChart
              data={lowestChpFacilities}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 180, bottom: 10 }}
            >
              <XAxis type="number" domain={[0, 20]} />
              <YAxis
                type="category"
                dataKey="facility_name"
                width={170}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="chp_kits_percent_of_hpt"
                name="CHP Kits % of HPT"
                fill="#0f766e"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card wide">
        <div className="table-title-row">
          <h3>Facility Compliance Table</h3>

          <button className="download-btn" onClick={downloadCSV}>
            <Download size={16} />
            Download Table
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Facility</th>
                <th>Subcounty</th>
                <th>HPT %</th>
                <th>HPT Status</th>
                <th>CHP Kits Amount</th>
                <th>CHP Kits %</th>
                <th>CHP Status</th>
              </tr>
            </thead>

            <tbody>
              {paginatedFacilities.map((facility) => (
                <tr key={facility.mfl_code}>
                  <td>{facility.facility_name}</td>
                  <td>{facility.subcounty_name || "—"}</td>
                  <td>{facility.hpt_percent}%</td>
                  <td>
                    <span
                      className={
                        facility.compliance_status === "Compliant"
                          ? "status compliant"
                          : "status non-compliant"
                      }
                    >
                      {facility.compliance_status}
                    </span>
                  </td>
                  <td>{money(facility.amount_used_for_chp_kits)}</td>
                  <td>{facility.chp_kits_percent_of_hpt}%</td>
                  <td>
                    <span
                      className={
                        facility.chp_kits_status === "Compliant"
                          ? "status compliant"
                          : "status non-compliant"
                      }
                    >
                      {facility.chp_kits_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default CountyDashboard;