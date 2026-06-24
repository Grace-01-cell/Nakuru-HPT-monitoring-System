import { useEffect, useMemo, useState } from "react";
import { Search, FileText, Download } from "lucide-react";
import api from "../api/api";
import "./Submissions.css";
import MultiCheckboxFilter from "../components/MultiCheckboxFilter";

interface Submission {
  mfl_code: string;
  facility_name: string;
  subcounty_name: string;
  ward_name: string;
  reporting_month?: string;
  reporting_period: string;
  funding_source: string;
  procurement_source: string;
  amount_received: number;
  amount_allocated_to_hpt: number;
  amount_spent_on_hpt: number;
  hpt_percent: number;
  compliance_status: string;
  amount_used_for_chp_kits: number;
  chp_kits_percent_of_hpt: number;
  chp_kits_status: string;
  date_received: string;
  submitted_by: string;
  supporting_document: string;
}

const fundingSources = [
  "County Allocation",
  "FIF",
  "SHIF",
  "PHC",
  "Partners",
  "Donations",
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

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function parseReportingPeriod(period: string) {
  const parts = String(period || "").split("-");

  if (parts.length !== 2) {
    return { month: "", year: "" };
  }

  const [first, second] = parts;

  if (/^\d{4}$/.test(first)) {
    return { year: first, month: second };
  }

  return { month: first, year: second };
}

function Submissions() {
  const [records, setRecords] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedSubcounty, setSelectedSubcounty] = useState<string[]>(["All"]);
  const [selectedWard, setSelectedWard] = useState<string[]>(["All"]);
  const [selectedFacility, setSelectedFacility] = useState<string[]>(["All"]);
  const [selectedYear, setSelectedYear] = useState<string[]>(["All"]);
  const [selectedMonth, setSelectedMonth] = useState<string[]>(["All"]);
  const [selectedFundingSource, setSelectedFundingSource] = useState<string[]>([
    "All",]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 15;
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState("");

  const currentYear = new Date().getFullYear();

  const years = [
    "All",
    ...Array.from(
      { length: currentYear - 2026 + 6 },
      (_, index) => String(2026 + index)
    ),
  ];

  useEffect(() => {
    api
      .get("/records")
      .then((res) => {
        setRecords(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to load submissions");
      })
      .finally(() => setLoading(false));
  }, []);

  const subcounties = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          records
            .map((record) => record.subcounty_name)
            .filter((name) => name && name.trim() !== "")
        )
      ).sort((a, b) => a.localeCompare(b)),
    ];
  }, [records]);

  const wards = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          records
            .map((record) => record.ward_name)
            .filter((name) => name && name.trim() !== "")
        )
      ).sort((a, b) => a.localeCompare(b)),
    ];
  }, [records]);

  const facilityOptions = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          records
            .map((record) => `${record.facility_name} - ${record.mfl_code}`)
            .filter((name) => name && name.trim() !== "")
        )
      ).sort((a, b) => a.localeCompare(b)),
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const { month, year } = parseReportingPeriod(record.reporting_period);
      const facilityLabel = `${record.facility_name} - ${record.mfl_code}`;
      const searchValue = search.toLowerCase();
      const fundingSourceText = String(record.funding_source || "").toLowerCase();

      const matchesSearch =
        searchValue === "" ||
        record.facility_name?.toLowerCase().includes(searchValue) ||
        record.subcounty_name?.toLowerCase().includes(searchValue) ||
        record.ward_name?.toLowerCase().includes(searchValue) ||
        record.mfl_code?.toLowerCase().includes(searchValue) ||
        record.submitted_by?.toLowerCase().includes(searchValue);

      const matchesSubcounty =
        selectedSubcounty.includes("All") ||
        selectedSubcounty.includes(record.subcounty_name);

      const matchesWard =
        selectedWard.includes("All") || selectedWard.includes(record.ward_name);

      const matchesFacility =
        selectedFacility.includes("All") ||
        selectedFacility.includes(facilityLabel);

      const matchesYear =
        selectedYear.includes("All") || selectedYear.includes(year);

      const matchesMonth =
        selectedMonth.includes("All") || selectedMonth.includes(month);

      const matchesFundingSource =
        selectedFundingSource.includes("All") ||
        selectedFundingSource.some((source) =>
          fundingSourceText.includes(source.toLowerCase())
        );

      return (
        matchesSearch &&
        matchesSubcounty &&
        matchesWard &&
        matchesFacility &&
        matchesYear &&
        matchesMonth &&
        matchesFundingSource
      );
    });
  }, [
    records,
    search,
    selectedSubcounty,
    selectedWard,
    selectedFacility,
    selectedYear,
    selectedMonth,
    selectedFundingSource,
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));

const paginatedRecords = filteredRecords.slice(
  (page - 1) * rowsPerPage,
  page * rowsPerPage
);
  const totalSubmissions = filteredRecords.length;

  const compliantFacilities = filteredRecords.filter(
    (r) => r.compliance_status === "Compliant"
  ).length;

  const nonCompliantFacilities = filteredRecords.filter(
    (r) => r.compliance_status === "Non-Compliant"
  ).length;

  const totalDocuments = filteredRecords.filter(
    (r) => r.supporting_document
  ).length;

  function openDocument(path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const documentPath = path.startsWith("/") ? path : `/${path}`;
  setSelectedDocumentUrl(`${baseUrl}${documentPath}`);
}

  function downloadCSV() {
    const headers = [
      "Facility",
      "MFL Code",
      "Subcounty",
      "Ward",
      "Reporting Period",
      "Funding Source",
      "Procurement Source",
      "Date Received",
      "Amount Received",
      "HPT Allocated",
      "HPT Spent",
      "HPT %",
      "HPT Status",
      "CHP Kits Amount",
      "CHP Kits %",
      "CHP Status",
      "Submitted By",
      "Supporting Document",
    ];

    const rows = filteredRecords.map((record) => [
      record.facility_name,
      record.mfl_code,
      record.subcounty_name,
      record.ward_name,
      record.reporting_period,
      record.funding_source,
      record.procurement_source,
      record.date_received,
      record.amount_received,
      record.amount_allocated_to_hpt,
      record.amount_spent_on_hpt,
      record.hpt_percent,
      record.compliance_status,
      record.amount_used_for_chp_kits,
      record.chp_kits_percent_of_hpt,
      record.chp_kits_status,
      record.submitted_by,
      record.supporting_document,
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
    link.download = "hpt_submissions.csv";
    link.click();

    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="dashboard-loading">Loading submissions...</div>;
  }

  return (
  <>
    <div className="submissions-page">
      <div className="submissions-heading">
        <div>
          <h2>Submissions</h2>
          <p>Track submitted HPT and CHP Kits compliance records.</p>
        </div>
      </div>

      <div className="dashboard-filters">
        <MultiCheckboxFilter
          label="Subcounty"
          options={subcounties.filter((item) => item !== "All")}
          selected={selectedSubcounty}
          onChange={setSelectedSubcounty}
        />

        <MultiCheckboxFilter
          label="Ward"
          options={wards.filter((item) => item !== "All")}
          selected={selectedWard}
          onChange={setSelectedWard}
        />

        <MultiCheckboxFilter
          label="Facility"
          options={facilityOptions.filter((item) => item !== "All")}
          selected={selectedFacility}
          onChange={setSelectedFacility}
        />

        <MultiCheckboxFilter
          label="Year"
          options={years.filter((item) => item !== "All")}
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
          label="Funding Source"
          options={fundingSources}
          selected={selectedFundingSource}
          onChange={setSelectedFundingSource}
        />
      </div>

      <div className="submissions-kpis">
        <div className="submission-kpi">
          <span>Total Submissions</span>
          <strong>{totalSubmissions}</strong>
        </div>

        <div className="submission-kpi">
          <span>HPT Compliant</span>
          <strong>{compliantFacilities}</strong>
        </div>

        <div className="submission-kpi">
          <span>HPT Non-Compliant</span>
          <strong>{nonCompliantFacilities}</strong>
        </div>

        <div className="submission-kpi">
          <span>With Documents</span>
          <strong>{totalDocuments}</strong>
        </div>
      </div>

      <div className="submissions-card">
        <div className="submissions-toolbar">
          <div className="submission-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search by facility, MFL, ward, subcounty, or submitted by..."
              value={search}
              onChange={(e) => {setSearch(e.target.value);setPage(1);}}
            />
          </div>

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
                <th>Ward</th>
                <th>Reporting Period</th>
                <th>Funding Source</th>
                <th>Procurement Source</th>
                <th>Date Received</th>
                <th>Amount Received</th>
                <th>HPT %</th>
                <th>HPT Status</th>
                <th>CHP Kits %</th>
                <th>CHP Status</th>
                <th>Submitted By</th>
                <th>Document</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.map((record, index) => (
                <tr key={`${record.mfl_code}-${record.reporting_period}-${index}`}>
                  <td>
                    <strong>{record.facility_name}</strong>
                    <small>MFL: {record.mfl_code}</small>
                  </td>

                  <td>{record.subcounty_name || "—"}</td>
                  <td>{record.ward_name || "—"}</td>
                  <td>{record.reporting_period || "—"}</td>
                  <td>{record.funding_source || "—"}</td>
                  <td>{record.procurement_source || "—"}</td>
                  <td>{record.date_received || "—"}</td>
                  <td>{money(record.amount_received)}</td>
                  <td>{record.hpt_percent}%</td>

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

                  <td>{record.submitted_by || "—"}</td>

                  <td>
                    {record.supporting_document ? (
                      <button
                        className="view-doc-btn document-pill"
                        type="button"
                        onClick={() => openDocument(record.supporting_document)}
                      >
                        <FileText size={16} />
                        View
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}

              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={14}>No submissions found for the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="table-footer">
          Showing {filteredRecords.length} submission(s).
        </p>
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
    {selectedDocumentUrl && (
      <div className="pdf-modal-overlay">
        <div className="pdf-modal">
          <div className="pdf-modal-header">
            <h3>Supporting Document</h3>

            <button
              type="button"
              onClick={() => setSelectedDocumentUrl("")}
            >
              Close
            </button>
          </div>

          <iframe
            src={selectedDocumentUrl}
            title="Document Preview"
            className="pdf-frame"
          />
        </div>
      </div>
    )}
  </>
  );
}

export default Submissions;
    