import { useState } from "react";
import { Upload, FileText, Send } from "lucide-react";
import api from "../api/api";
import "./CountySHAReporting.css";

const reportTypes = [
  "SHA Contracted Facilities",
  "SHA Claims",
  "SHA Reimbursements",
  "SHA Rejections",
];

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const quarters = ["Q1", "Q2", "Q3", "Q4"];

function CountySHAReporting() {
  const user = JSON.parse(localStorage.getItem("hpt_user") || "{}");
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    report_type: "",
    reporting_year: String(currentYear),
    reporting_month: "",
    reporting_quarter: "",
    value: "",
    submitted_by: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
    notes: "",
  });

  const [document, setDocument] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isQuarterly = form.report_type === "SHA Contracted Facilities";

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.report_type) {
      alert("Please select report type.");
      return;
    }

    if (isQuarterly && !form.reporting_quarter) {
      alert("Please select reporting quarter.");
      return;
    }

    if (!isQuarterly && !form.reporting_month) {
      alert("Please select reporting month.");
      return;
    }

    try {
      setSubmitting(true);

      const data = new FormData();
      data.append("report_type", form.report_type);
      data.append("reporting_year", form.reporting_year);
      data.append("reporting_month", isQuarterly ? "" : form.reporting_month);
      data.append("reporting_quarter", isQuarterly ? form.reporting_quarter : "");
      data.append("value", form.value || "0");
      data.append("submitted_by", form.submitted_by || "SHA Coordinator");
      data.append("notes", form.notes);

      if (document) {
        data.append("supporting_document", document);
      }

      await api.post("/county-sha-reports", data);

      alert("SHA report submitted successfully.");

      setForm({
        report_type: "",
        reporting_year: String(currentYear),
        reporting_month: "",
        reporting_quarter: "",
        value: "",
        submitted_by: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
        notes: "",
      });
      setDocument(null);
    } catch (error) {
      console.error(error);
      alert("Failed to submit SHA report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sha-page">
      <div className="sha-header">
        <h2>County SHA Reporting</h2>
        <p>Submit county-level SHA reports for claims, reimbursements, rejections and contracted facilities.</p>
      </div>

      <form className="sha-card" onSubmit={handleSubmit}>
        <div className="sha-section-title">
          <FileText size={18} />
          <span>Report Details</span>
        </div>

        <div className="sha-grid">
          <div className="sha-form-group">
            <label>Report Type</label>
            <select
              value={form.report_type}
              onChange={(e) => {
                updateField("report_type", e.target.value);
                updateField("reporting_month", "");
                updateField("reporting_quarter", "");
              }}
              required
            >
              <option value="">Select report type</option>
              {reportTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="sha-form-group">
            <label>Reporting Year</label>
            <select
              value={form.reporting_year}
              onChange={(e) => updateField("reporting_year", e.target.value)}
              required
            >
              {Array.from(
                { length: currentYear - 2026 + 6 },
                (_, index) => 2026 + index
              ).map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </div>

          {isQuarterly ? (
            <div className="sha-form-group">
              <label>Reporting Quarter</label>
              <select
                value={form.reporting_quarter}
                onChange={(e) => updateField("reporting_quarter", e.target.value)}
                required
              >
                <option value="">Select quarter</option>
                {quarters.map((quarter) => (
                  <option key={quarter}>{quarter}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="sha-form-group">
              <label>Reporting Month</label>
              <select
                value={form.reporting_month}
                onChange={(e) => updateField("reporting_month", e.target.value)}
                required
              >
                <option value="">Select month</option>
                {months.map((month) => (
                  <option key={month}>{month}</option>
                ))}
              </select>
            </div>
          )}

          <div className="sha-form-group">
            <label>
              {form.report_type === "SHA Contracted Facilities"
                ? "Number of Contracted Facilities"
                : "Amount (KES)"}
            </label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => updateField("value", e.target.value)}
              placeholder="Enter value"
            />
          </div>

          <div className="sha-form-group">
            <label>Submitted By</label>
            <input
              type="text"
              value={form.submitted_by}
              onChange={(e) => updateField("submitted_by", e.target.value)}
              placeholder="SHA Coordinator"
              required
            />
          </div>
        </div>

        <div className="sha-form-group full">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Optional notes about this report"
          />
        </div>

        <div className="sha-section-title">
          <Upload size={18} />
          <span>Upload Report</span>
        </div>

        <label className="sha-upload-box">
          <Upload size={30} />
          <span>{document ? document.name : "Choose report document"}</span>
          <small>Accepted: PDF, Excel, CSV or image files</small>

          <input
            type="file"
            hidden
            onChange={(e) => setDocument(e.target.files?.[0] || null)}
          />
        </label>

        <div className="sha-actions">
          <button type="submit" disabled={submitting}>
            <Send size={18} />
            {submitting ? "Submitting..." : "Submit SHA Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CountySHAReporting;