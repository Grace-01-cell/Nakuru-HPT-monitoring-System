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
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import api from "../api/api";
import "./Dashboard.css";
import MultiCheckboxFilter from "../components/MultiCheckboxFilter";
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
  const [selectedSubcounty, setSelectedSubcounty] = useState(["All"]);
  const [selectedMonth, setSelectedMonth] = useState(["All"]);
  const [selectedFundingSource, setSelectedFundingSource] = useState(["All"]);
  const [fundingSourceTrend, setFundingSourceTrend] = useState([]);
  const [hptAllocationTrend, setHptAllocationTrend] = useState([]);

  const fundingSourceChartData = Object.values(
  fundingSourceTrend.reduce((acc: any, item: any) => {
    const period = item.reporting_period;

    if (!acc[period]) {
      acc[period] = { reporting_period: period };
    }

    acc[period][item.funding_source] = item.amount_received;

    return acc;
  }, {})
);

const hptAllocationChartData = hptAllocationTrend;

  const rowsPerPage = 10;

  useEffect(() => {
  setLoading(true);

  api.get(
  `/dashboard/county?reporting_periods=${selectedMonth.join(",")}&subcounties=${selectedSubcounty.join(",")}&funding_sources=${selectedFundingSource.join(",")}`
)
    .then((res) => {
      setSummary(res.data.summary);
      setFacilities(res.data.facility_compliance);
      setFundingSourceTrend(res.data.funding_source_trend || []);
      setHptAllocationTrend(res.data.hpt_allocation_trend || []);
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to load dashboard data");
    })
    .finally(() => setLoading(false));
}, [selectedMonth, selectedSubcounty, selectedFundingSource]);

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
      selectedSubcounty.includes("All") || selectedSubcounty.includes(facility.subcounty_name)
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
  <MultiCheckboxFilter
    label="Subcounty"
    options={subcounties.filter((item) => item !== "All")}
    selected={selectedSubcounty}
    onChange={(values) => {
      setSelectedSubcounty(values);
      setPage(1);
    }}
  />

  <MultiCheckboxFilter
    label="Reporting Period"
    options={["Jan-2026", "Feb-2026", "Mar-2026", "Apr-2026", "May-2026"]}
    selected={selectedMonth}
    onChange={setSelectedMonth}
  />

  <MultiCheckboxFilter
    label="Funding Source"
    options={[
      "FIF",
      "SHIF",
      "Facility Collection (Out of Pocket)",
      "Partner Funding",
    ]}
    selected={selectedFundingSource}
    onChange={setSelectedFundingSource}
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

      <div className="dashboard-analysis-grid">
  <div className="compliance-stack">
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
                (filteredSummary.compliant_facilities / submittedFacilities) *
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
  </div>

  <div className="trend-stack">
    <div className="chart-card wide">
      <h3>Funding Source Trend</h3>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={fundingSourceChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="reporting_period" />

          <YAxis
            tickFormatter={(value) =>
              `${(Number(value) / 1000000).toFixed(1)}M`
            }
          />

          <Tooltip
            formatter={(value: number) =>
              `KES ${Number(value).toLocaleString()}`
            }
          />

          <Legend />

          <Line type="monotone" dataKey="FIF" stroke="#2563eb" />
          <Line type="monotone" dataKey="SHIF" stroke="#16a34a" />
          <Line
            type="monotone"
            dataKey="Facility Collection (Out of Pocket)"
            stroke="#f97316"
          />
          <Line type="monotone" dataKey="Partner Funding" stroke="#7c3aed" />
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div className="chart-card wide">
      <h3>Total Allocation Trend</h3>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={hptAllocationChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="reporting_period" />

          <YAxis
            tickFormatter={(value) =>
              `${(Number(value) / 1000000).toFixed(1)}M`
            }
          />

          <Tooltip
            formatter={(value: number) =>
              `KES ${Number(value).toLocaleString()}`
            }
          />

          <Legend />

          <Line
            type="monotone"
            dataKey="amount_received"
            name="Total Funds Received"
            stroke="#2563eb"
          />

          <Line
            type="monotone"
            dataKey="hpt_spent"
            name="HPT Expenditure"
            stroke="#f97316"
          />

          <Line
            type="monotone"
            dataKey="chp_kits_used"
            name="CHP Kits Support"
            stroke="#7c3aed"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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