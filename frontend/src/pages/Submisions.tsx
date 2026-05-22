import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import api from "../api/api";
import "./Submissions.css";

interface SubmissionRecord {
  mfl_code: string;
  facility_name: string;
  subcounty_name: string;
  ward_name: string;
  amount_received: number;
  funding_source: string;
  date_received: string;
  amount_allocated_to_hpt: number;
  amount_spent_on_hpt: number;
  amount_used_for_chp_kits: number;
  hpt_percent: number;
  compliance_status: string;
  chp_kits_percent_of_hpt: number;
  chp_kits_status: string;
  supporting_document: string;
  submitted_by: string;
  submission_date?: string;
}

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function Submissions() {
  const [records, setRecords] = useState<SubmissionRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/records").then((res) => {
      setRecords(res.data);
    });
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) =>
      `${record.facility_name} ${record.subcounty_name} ${record.submitted_by}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [records, search]);

  function downloadCSV() {
    const headers = [
      "Facility",
      "Subcounty",
      "Ward",
      "Funding Source",
      "Date Received",
      "Amount Received",
      "HPT %",
      "HPT Status",
      "CHP Kits %",
      "CHP Status",
      "Submitted By",
      "Document",
    ];

    const rows = filteredRecords.map((r) => [
      r.facility_name,
      r.subcounty_name,
      r.ward_name,
      r.funding_source,
      r.date_received,
      r.amount_received,
      r.hpt_percent,
      r.compliance_status,
      r.chp_kits_percent_of_hpt,
      r.chp_kits_status,
      r.submitted_by,
      r.supporting_document,
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
    link.download = "submissions.csv";
    link.click();

    window.URL.revokeObjectURL(url);
  }

  const compliant = records.filter(
    (r) => r.compliance_status === "Compliant"
  ).length;

  const nonCompliant = records.filter(
    (r) => r.compliance_status === "Non-Compliant"
  ).length;

  const withDocuments = records.filter((r) => r.supporting_document).length;

  return (
    <div className="submissions-page">
      <div className="submissions-heading">
        <div>
          <h2>Submissions</h2>
          <p>Operational view of facility-submitted HPT records.</p>
        </div>

        <button className="download-btn" onClick={downloadCSV}>
          <Download size={16} />
          Export Submissions
        </button>
      </div>

      <div className="submissions-kpis">
        <div className="submission-kpi">
          <span>Total Submissions</span>
          <strong>{records.length}</strong>
        </div>

        <div className="submission-kpi">
          <span>HPT Compliant</span>
          <strong>{compliant}</strong>
        </div>

        <div className="submission-kpi">
          <span>HPT Non-Compliant</span>
          <strong>{nonCompliant}</strong>
        </div>

        <div className="submission-kpi">
          <span>With Documents</span>
          <strong>{withDocuments}</strong>
        </div>
      </div>

      <div className="submissions-toolbar">
        <div className="submission-search">
          <Search size={18} />
          <input
            placeholder="Search by facility, subcounty, or submitted by..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="submissions-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Facility</th>
                <th>Funding Source</th>
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
              {filteredRecords.map((record, index) => (
                <tr key={`${record.mfl_code}-${index}`}>
                  <td>
                    <strong>{record.facility_name}</strong>
                    <small>
                      {record.subcounty_name || "—"} • {record.ward_name || "—"}
                    </small>
                  </td>

                  <td>{record.funding_source || "—"}</td>
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
                      <span className="document-pill">
                        <FileText size={14} />
                        View
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="table-footer">
          Showing {filteredRecords.length} of {records.length} submissions
        </p>
      </div>
    </div>
  );
}

export default Submissions;