import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle,
  Download,
  FileText,
  Search,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/api";
import MultiCheckboxFilter from "../components/MultiCheckboxFilter";
import "./SHAPerformance.css";

interface SHAReport {
  report_id: string;
  report_type: string;
  frequency: string;
  reporting_year: string;
  reporting_month: string;
  reporting_quarter: string;
  reporting_period: string;
  value: number;
  submitted_by: string;
  notes: string;
  supporting_document: string;
  submitted_at: string;
}

const reportTypes = [
  "SHA Contracted Facilities",
  "SHA Claims",
  "SHA Reimbursements",
  "SHA Rejections",
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const quarters = ["Q1", "Q2", "Q3", "Q4"];

const dummySummary = {
  contractedFacilities: 186,
  claims: 18450000,
  reimbursements: 16900000,
  rejections: 1550000,
};

const monthlyTrend = [
  { month: "Jan", claims: 12000000, reimbursements: 11000000, rejections: 900000 },
  { month: "Feb", claims: 13400000, reimbursements: 12400000, rejections: 750000 },
  { month: "Mar", claims: 14600000, reimbursements: 13600000, rejections: 830000 },
  { month: "Apr", claims: 15400000, reimbursements: 14700000, rejections: 640000 },
  { month: "May", claims: 17200000, reimbursements: 16100000, rejections: 780000 },
  { month: "Jun", claims: 18450000, reimbursements: 16900000, rejections: 1550000 },
];

const contractedTrend = [
  { quarter: "Q1", facilities: 171 },
  { quarter: "Q2", facilities: 178 },
  { quarter: "Q3", facilities: 183 },
  { quarter: "Q4", facilities: 186 },
];

const rejectionPie = [
  { name: "Reimbursed", value: 92 },
  { name: "Rejected", value: 8 },
];

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function compactMoney(value: number) {
  return `${(Number(value || 0) / 1000000).toFixed(1)}M`;
}

function SHAPerformance() {
  const currentYear = new Date().getFullYear();
  const [reports, setReports] = useState<SHAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDocument, setSelectedDocument] =
  useState<string | null>(null);

const [selectedDocumentTitle, setSelectedDocumentTitle] =
  useState("");

  const [selectedReportType, setSelectedReportType] = useState<string[]>(["All"]);
  const [selectedYear, setSelectedYear] = useState<string[]>(["All"]);
  const [selectedMonth, setSelectedMonth] = useState<string[]>(["All"]);
  const [selectedQuarter, setSelectedQuarter] = useState<string[]>(["All"]);
  const [selectedSubmittedBy, setSelectedSubmittedBy] = useState<string[]>(["All"]);

  const years = [
    "All",
    ...Array.from({ length: currentYear - 2026 + 6 }, (_, index) =>
      String(2026 + index)
    ),
  ];

  useEffect(() => {
  api
    .get("/county-sha-reports")
    .then((res) => {
      setReports(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    })
    .catch((err) => {
      console.error(err);
      setReports([]);
    })
    .finally(() => setLoading(false));
}, []);

  const submittedByOptions = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          reports
            .map((report) => report.submitted_by)
            .filter((name) => name && name.trim() !== "")
        )
      ).sort((a, b) => a.localeCompare(b)),
    ];
  }, [reports]);

  const filteredReports = useMemo(() => {
    const searchValue = search.toLowerCase();

    return reports.filter((report) => {
      const matchesReportType =
        selectedReportType.includes("All") ||
        selectedReportType.includes(report.report_type);

      const matchesYear =
        selectedYear.includes("All") ||
        selectedYear.includes(String(report.reporting_year));

      const matchesMonth =
        selectedMonth.includes("All") ||
        selectedMonth.includes(report.reporting_month);

      const matchesQuarter =
        selectedQuarter.includes("All") ||
        selectedQuarter.includes(report.reporting_quarter);

      const matchesSubmittedBy =
        selectedSubmittedBy.includes("All") ||
        selectedSubmittedBy.includes(report.submitted_by);

      const matchesSearch =
        searchValue === "" ||
        report.report_type?.toLowerCase().includes(searchValue) ||
        report.reporting_period?.toLowerCase().includes(searchValue) ||
        report.submitted_by?.toLowerCase().includes(searchValue) ||
        report.notes?.toLowerCase().includes(searchValue);

      return (
        matchesReportType &&
        matchesYear &&
        matchesMonth &&
        matchesQuarter &&
        matchesSubmittedBy &&
        matchesSearch
      );
    });
  }, [
    reports,
    search,
    selectedReportType,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedSubmittedBy,
  ]);

  function getDocumentUrl(path: string) {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const baseUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  const documentPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${baseUrl}${documentPath}`;
}

function openDocument(
  path: string,
  reportTitle: string
) {
  setSelectedDocument(path);
  setSelectedDocumentTitle(reportTitle);
}

function closeDocument() {
  setSelectedDocument(null);
  setSelectedDocumentTitle("");
}
  function downloadCSV() {
    const headers = [
      "Report Type",
      "Frequency",
      "Year",
      "Month",
      "Quarter",
      "Period",
      "Value",
      "Submitted By",
      "Submitted At",
      "Notes",
      "Document",
    ];

    const rows = filteredReports.map((report) => [
      report.report_type,
      report.frequency,
      report.reporting_year,
      report.reporting_month,
      report.reporting_quarter,
      report.reporting_period,
      report.value,
      report.submitted_by,
      report.submitted_at,
      report.notes,
      report.supporting_document,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "sha_reports.csv";
    link.click();

    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="sha-performance-page">Loading SHA performance...</div>;
  }

  return (
    <div className="sha-performance-page">
      <div className="sha-performance-header">
        <div>
          <h2>SHA Performance</h2>
          <p>County-level SHA claims, reimbursements, rejections and contracted facility reporting.</p>
        </div>
      </div>

      <div className="sha-kpi-grid">
        <div className="sha-kpi-card">
          <div>
            <span>SHA Contracted Facilities</span>
            <strong>{dummySummary.contractedFacilities}</strong>
            <p>Latest quarterly update</p>
          </div>
          <div className="sha-kpi-icon">
            <Building2 size={24} />
          </div>
        </div>

        <div className="sha-kpi-card">
          <div>
            <span>SHA Claims</span>
            <strong>{money(dummySummary.claims)}</strong>
            <p>Latest monthly claims</p>
          </div>
          <div className="sha-kpi-icon">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="sha-kpi-card">
          <div>
            <span>SHA Reimbursements</span>
            <strong>{money(dummySummary.reimbursements)}</strong>
            <p>Latest monthly reimbursements</p>
          </div>
          <div className="sha-kpi-icon success">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="sha-kpi-card">
          <div>
            <span>SHA Rejections</span>
            <strong>{money(dummySummary.rejections)}</strong>
            <p>Latest monthly rejected claims</p>
          </div>
          <div className="sha-kpi-icon danger">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      <div className="sha-chart-card wide">
        <h3>Monthly SHA Financial Trend</h3>
        <ResponsiveContainer width="100%" height={330}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => compactMoney(Number(value))} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Legend />
            <Line type="monotone" dataKey="claims" name="Claims" stroke="#2563eb" />
            <Line type="monotone" dataKey="reimbursements" name="Reimbursements" stroke="#16a34a" />
            <Line type="monotone" dataKey="rejections" name="Rejections" stroke="#dc2626" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="sha-analysis-grid">
        <div className="sha-chart-card">
          <h3>Claims vs Reimbursements</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => compactMoney(Number(value))} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Legend />
              <Bar dataKey="claims" name="Claims" fill="#2563eb" radius={[8, 8, 0, 0]} />
              <Bar dataKey="reimbursements" name="Reimbursements" fill="#16a34a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="sha-chart-card">
          <h3>Rejection Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={rejectionPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label={({ name, value }) => `${name}: ${value}%`}
              >
                <Cell fill="#16a34a" />
                <Cell fill="#dc2626" />
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="sha-chart-card">
          <h3>Contracted Facilities Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={contractedTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="facilities"
                name="Contracted Facilities"
                stroke="#7c3aed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sha-report-section">
        <div className="sha-report-title">
          <div>
            <h3>Uploaded SHA Reports</h3>
            <p>Report history from county SHA submissions.</p>
          </div>

          <button className="sha-download-btn" onClick={downloadCSV}>
            <Download size={16} />
            Download Table
          </button>
        </div>

        <div className="sha-filters">
          <MultiCheckboxFilter
            label="Report Type"
            options={reportTypes}
            selected={selectedReportType}
            onChange={setSelectedReportType}
          />

          <MultiCheckboxFilter
            label="Year"
            options={years.filter((year) => year !== "All")}
            selected={selectedYear}
            onChange={setSelectedYear}
          />

          <MultiCheckboxFilter
            label="Month"
            options={months}
            selected={selectedMonth}
            onChange={setSelectedMonth}
          />

          <MultiCheckboxFilter
            label="Quarter"
            options={quarters}
            selected={selectedQuarter}
            onChange={setSelectedQuarter}
          />

          <MultiCheckboxFilter
            label="Submitted By"
            options={submittedByOptions.filter((name) => name !== "All")}
            selected={selectedSubmittedBy}
            onChange={setSelectedSubmittedBy}
          />

          <div className="sha-search">
            <label>Search</label>
            <div>
              <Search size={16} />
              <input
                type="text"
                placeholder="Search reports, notes or submitted by"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="sha-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report Type</th>
                <th>Frequency</th>
                <th>Period</th>
                <th>Value</th>
                <th>Submitted By</th>
                <th>Submitted At</th>
                <th>Notes</th>
                <th>Document</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report, index) => (
                <tr key={`${report.report_id}-${index}`}>
                  <td>{report.report_type}</td>
                  <td>{report.frequency}</td>
                  <td>{report.reporting_period}</td>
                  <td>
                    {report.report_type === "SHA Contracted Facilities"
                      ? Number(report.value || 0).toLocaleString()
                      : money(Number(report.value || 0))}
                  </td>
                  <td>{report.submitted_by || "—"}</td>
                  <td>{report.submitted_at || "—"}</td>
                  <td>{report.notes || "—"}</td>
                  <td>
                    {report.supporting_document ? (
                      <button
  type="button"
  className="sha-view-btn"
  onClick={() =>
    openDocument(
      report.supporting_document,
      `${report.report_type} — ${report.reporting_period}`
    )
  }
>
  <FileText size={15} />
  View
</button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={8}>No SHA reports uploaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

                <p className="sha-table-footer">
          Showing {filteredReports.length} uploaded SHA report(s).
        </p>
      </div>

      {selectedDocument && (
        <div
          className="sha-document-modal-overlay"
          onClick={closeDocument}
        >
          <div
            className="sha-document-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sha-document-modal-header">
              <div>
                <h3>Supporting Document</h3>
                <p>{selectedDocumentTitle}</p>
              </div>

              <button
                type="button"
                className="sha-document-close-btn"
                onClick={closeDocument}
                aria-label="Close document preview"
              >
                ×
              </button>
            </div>

            <div className="sha-document-modal-body">
              <iframe
                src={getDocumentUrl(selectedDocument)}
                title={selectedDocumentTitle || "SHA supporting document"}
              />
            </div>

            <div className="sha-document-modal-footer">
              <button
                type="button"
                className="sha-document-close-footer-btn"
                onClick={closeDocument}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SHAPerformance;