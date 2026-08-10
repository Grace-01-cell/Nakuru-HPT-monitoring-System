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

interface MonthlyTrendRow {
  key: string;
  month: string;
  claims: number;
  reimbursements: number;
  rejections: number;
}

interface ContractedTrendRow {
  key: string;
  quarter: string;
  facilities: number;
}

const reportTypes = [
  "SHA Contracted Facilities",
  "SHA Claims",
  "SHA Reimbursements",
  "SHA Rejections",
];

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const quarters = ["Q1", "Q2", "Q3", "Q4"];

const MONTH_ORDER = new Map(
  months.map((month, index) => [month, index + 1])
);

const QUARTER_ORDER = new Map(
  quarters.map((quarter, index) => [quarter, index + 1])
);

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function compactMoney(value: number) {
  const numericValue = Number(value || 0);

  if (Math.abs(numericValue) >= 1_000_000) {
    return `${(numericValue / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(numericValue) >= 1_000) {
    return `${(numericValue / 1_000).toFixed(1)}K`;
  }

  return numericValue.toLocaleString();
}

function getSubmittedAtRank(value: string) {
  if (!value) return 0;

  const parsed = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getReportPeriodRank(report: SHAReport) {
  const year = Number(report.reporting_year || 0);

  if (report.report_type === "SHA Contracted Facilities") {
    const quarter = QUARTER_ORDER.get(report.reporting_quarter) || 0;
    return year * 100 + quarter * 3;
  }

  const month = MONTH_ORDER.get(report.reporting_month) || 0;
  return year * 100 + month;
}

function getLatestReport(
  reports: SHAReport[],
  reportType: string
): SHAReport | undefined {
  return reports
    .filter((report) => report.report_type === reportType)
    .slice()
    .sort((a, b) => {
      const periodDifference = getReportPeriodRank(b) - getReportPeriodRank(a);

      if (periodDifference !== 0) {
        return periodDifference;
      }

      const submittedDifference =
        getSubmittedAtRank(b.submitted_at) -
        getSubmittedAtRank(a.submitted_at);

      if (submittedDifference !== 0) {
        return submittedDifference;
      }

      return Number(b.report_id || 0) - Number(a.report_id || 0);
    })[0];
}

function SHAPerformance() {
  const currentYear = new Date().getFullYear();

  const [reports, setReports] = useState<SHAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedDocument, setSelectedDocument] =
    useState<string | null>(null);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState("");

  const [selectedReportType, setSelectedReportType] = useState<string[]>([
    "All",
  ]);
  const [selectedYear, setSelectedYear] = useState<string[]>(["All"]);
  const [selectedMonth, setSelectedMonth] = useState<string[]>(["All"]);
  const [selectedQuarter, setSelectedQuarter] = useState<string[]>(["All"]);
  const [selectedSubmittedBy, setSelectedSubmittedBy] = useState<string[]>([
    "All",
  ]);

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
        setReports(Array.isArray(res.data) ? res.data : []);
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

  const summary = useMemo(() => {
    const contracted = getLatestReport(reports, "SHA Contracted Facilities");
    const claims = getLatestReport(reports, "SHA Claims");
    const reimbursements = getLatestReport(reports, "SHA Reimbursements");
    const rejections = getLatestReport(reports, "SHA Rejections");

    return {
      contractedFacilities: Number(contracted?.value || 0),
      claims: Number(claims?.value || 0),
      reimbursements: Number(reimbursements?.value || 0),
      rejections: Number(rejections?.value || 0),
      contractedPeriod: contracted?.reporting_period || "No data yet",
      claimsPeriod: claims?.reporting_period || "No data yet",
      reimbursementsPeriod: reimbursements?.reporting_period || "No data yet",
      rejectionsPeriod: rejections?.reporting_period || "No data yet",
    };
  }, [reports]);

  const monthlyTrend = useMemo<MonthlyTrendRow[]>(() => {
    const trendMap = new Map<string, MonthlyTrendRow & Record<string, unknown>>();
    const latestSubmissionMap = new Map<string, number>();

    reports
      .filter((report) => report.report_type !== "SHA Contracted Facilities")
      .forEach((report) => {
        const year = String(report.reporting_year || "").trim();
        const month = String(report.reporting_month || "").trim();
        const monthNumber = MONTH_ORDER.get(month);

        if (!year || !monthNumber) return;

        const periodKey = `${year}-${String(monthNumber).padStart(2, "0")}`;
        const valueKey = `${periodKey}-${report.report_type}`;
        const submittedRank =
          getSubmittedAtRank(report.submitted_at) || Number(report.report_id || 0);
        const existingRank = latestSubmissionMap.get(valueKey) ?? -1;

        if (submittedRank < existingRank) return;

        latestSubmissionMap.set(valueKey, submittedRank);

        if (!trendMap.has(periodKey)) {
          trendMap.set(periodKey, {
            key: periodKey,
            month: `${month} ${year}`,
            claims: 0,
            reimbursements: 0,
            rejections: 0,
          });
        }

        const row = trendMap.get(periodKey)!;
        const numericValue = Number(report.value || 0);

        if (report.report_type === "SHA Claims") {
          row.claims = numericValue;
        } else if (report.report_type === "SHA Reimbursements") {
          row.reimbursements = numericValue;
        } else if (report.report_type === "SHA Rejections") {
          row.rejections = numericValue;
        }
      });

    return Array.from(trendMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, month, claims, reimbursements, rejections }) => ({
        key,
        month,
        claims,
        reimbursements,
        rejections,
      }));
  }, [reports]);

  const contractedTrend = useMemo<ContractedTrendRow[]>(() => {
    const trendMap = new Map<string, ContractedTrendRow>();
    const latestSubmissionMap = new Map<string, number>();

    reports
      .filter((report) => report.report_type === "SHA Contracted Facilities")
      .forEach((report) => {
        const year = String(report.reporting_year || "").trim();
        const quarter = String(report.reporting_quarter || "").trim();
        const quarterNumber = QUARTER_ORDER.get(quarter);

        if (!year || !quarterNumber) return;

        const periodKey = `${year}-Q${quarterNumber}`;
        const submittedRank =
          getSubmittedAtRank(report.submitted_at) || Number(report.report_id || 0);
        const existingRank = latestSubmissionMap.get(periodKey) ?? -1;

        if (submittedRank < existingRank) return;

        latestSubmissionMap.set(periodKey, submittedRank);
        trendMap.set(periodKey, {
          key: periodKey,
          quarter: `${quarter} ${year}`,
          facilities: Number(report.value || 0),
        });
      });

    return Array.from(trendMap.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );
  }, [reports]);

  const rejectionPie = useMemo(() => {
    const reimbursed = Number(summary.reimbursements || 0);
    const rejected = Number(summary.rejections || 0);
    const total = reimbursed + rejected;

    if (total <= 0) {
      return [
        { name: "Reimbursed", value: 0 },
        { name: "Rejected", value: 0 },
      ];
    }

    const reimbursedPercent = Number(((reimbursed / total) * 100).toFixed(1));
    const rejectedPercent = Number(((rejected / total) * 100).toFixed(1));

    return [
      { name: "Reimbursed", value: reimbursedPercent },
      { name: "Rejected", value: rejectedPercent },
    ];
  }, [summary.reimbursements, summary.rejections]);

  function getDocumentUrl(path: string) {
    if (!path) return "";

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const baseUrl = (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
    ).replace(/\/$/, "");

    const documentPath = path.startsWith("/") ? path : `/${path}`;

    return `${baseUrl}${documentPath}`;
  }

  function openDocument(path: string, reportTitle: string) {
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
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
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
    return (
      <div className="sha-performance-page">Loading SHA performance...</div>
    );
  }

  return (
    <div className="sha-performance-page">
      <div className="sha-performance-header">
        <div>
          <h2>SHA Performance</h2>
          <p>
            County-level SHA claims, reimbursements, rejections and contracted
            facility reporting.
          </p>
        </div>
      </div>

      <div className="sha-kpi-grid">
        <div className="sha-kpi-card">
          <div>
            <span>SHA Contracted Facilities</span>
            <strong>{summary.contractedFacilities.toLocaleString()}</strong>
            <p>
              {summary.contractedPeriod === "No data yet"
                ? "No quarterly submission yet"
                : `Latest: ${summary.contractedPeriod}`}
            </p>
          </div>
          <div className="sha-kpi-icon">
            <Building2 size={24} />
          </div>
        </div>

        <div className="sha-kpi-card">
          <div>
            <span>SHA Claims</span>
            <strong>{money(summary.claims)}</strong>
            <p>
              {summary.claimsPeriod === "No data yet"
                ? "No monthly submission yet"
                : `Latest: ${summary.claimsPeriod}`}
            </p>
          </div>
          <div className="sha-kpi-icon">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="sha-kpi-card">
          <div>
            <span>SHA Reimbursements</span>
            <strong>{money(summary.reimbursements)}</strong>
            <p>
              {summary.reimbursementsPeriod === "No data yet"
                ? "No monthly submission yet"
                : `Latest: ${summary.reimbursementsPeriod}`}
            </p>
          </div>
          <div className="sha-kpi-icon success">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="sha-kpi-card">
          <div>
            <span>SHA Rejections</span>
            <strong>{money(summary.rejections)}</strong>
            <p>
              {summary.rejectionsPeriod === "No data yet"
                ? "No monthly submission yet"
                : `Latest: ${summary.rejectionsPeriod}`}
            </p>
          </div>
          <div className="sha-kpi-icon danger">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      <div className="sha-chart-card wide">
        <h3>Monthly SHA Financial Trend</h3>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={330}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => compactMoney(Number(value))} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="claims"
                name="Claims"
                stroke="#2563eb"
              />
              <Line
                type="monotone"
                dataKey="reimbursements"
                name="Reimbursements"
                stroke="#16a34a"
              />
              <Line
                type="monotone"
                dataKey="rejections"
                name="Rejections"
                stroke="#dc2626"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="sha-empty-chart">
            No monthly SHA financial submissions yet.
          </div>
        )}
      </div>

      <div className="sha-analysis-grid">
        <div className="sha-chart-card">
          <h3>Claims vs Reimbursements</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => compactMoney(Number(value))} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
                <Bar
                  dataKey="claims"
                  name="Claims"
                  fill="#2563eb"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="reimbursements"
                  name="Reimbursements"
                  fill="#16a34a"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="sha-empty-chart">No monthly submissions yet.</div>
          )}
        </div>

        <div className="sha-chart-card">
          <h3>Rejection Rate</h3>
          {summary.reimbursements > 0 || summary.rejections > 0 ? (
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
          ) : (
            <div className="sha-empty-chart">
              No reimbursement or rejection submissions yet.
            </div>
          )}
        </div>

        <div className="sha-chart-card">
          <h3>Contracted Facilities Trend</h3>
          {contractedTrend.length > 0 ? (
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
          ) : (
            <div className="sha-empty-chart">
              No contracted-facility submissions yet.
            </div>
          )}
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
        <div className="sha-document-modal-overlay" onClick={closeDocument}>
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