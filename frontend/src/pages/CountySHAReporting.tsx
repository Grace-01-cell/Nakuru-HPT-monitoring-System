import { useState } from "react";
import {
  Upload,
  FileText,
  Send,
} from "lucide-react";
import api from "../api/api";
import "./CountySHAReporting.css";

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

const quarters = [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
];

function formatAmountInput(value: string) {
  const digitsOnly = value.replace(/[^\d]/g, "");

  return digitsOnly.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ","
  );
}

function CountySHAReporting() {
  const user = JSON.parse(
    localStorage.getItem("hpt_user") || "{}"
  );

  const currentYear = new Date().getFullYear();

  const defaultSubmittedBy = `${
    user?.first_name || ""
  } ${user?.last_name || ""}`.trim();

  const [form, setForm] = useState({
    report_type: "",
    reporting_year: String(currentYear),
    reporting_month: "",
    reporting_quarter: "",
    value: "",
    submitted_by: defaultSubmittedBy,
    notes: "",
  });

  const [document, setDocument] =
    useState<File | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const isQuarterly =
    form.report_type ===
    "SHA Contracted Facilities";

  function updateField(
    field: string,
    value: string
  ) {
    setForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
  }

  function handleReportTypeChange(
    reportType: string
  ) {
    setForm((previousForm) => ({
      ...previousForm,
      report_type: reportType,
      reporting_month: "",
      reporting_quarter: "",
      value: "",
    }));
  }

  function handleValueChange(value: string) {
    if (isQuarterly) {
      updateField(
        "value",
        value.replace(/[^\d]/g, "")
      );

      return;
    }

    updateField(
      "value",
      formatAmountInput(value)
    );
  }

  function handleDocumentChange(
    file: File | null
  ) {
    if (!file) {
      setDocument(null);
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".xls",
      ".xlsx",
    ];

    const fileName = file.name.toLowerCase();

    const validFile = allowedExtensions.some(
      (extension) =>
        fileName.endsWith(extension)
    );

    if (!validFile) {
      alert(
        "Only PDF, XLS and XLSX files are allowed."
      );

      setDocument(null);
      return;
    }

    const maximumSize =
      10 * 1024 * 1024;

    if (file.size > maximumSize) {
      alert(
        "The supporting document must not exceed 10 MB."
      );

      setDocument(null);
      return;
    }

    setDocument(file);
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!form.report_type) {
      alert("Please select report type.");
      return;
    }

    if (
      isQuarterly &&
      !form.reporting_quarter
    ) {
      alert(
        "Please select reporting quarter."
      );

      return;
    }

    if (
      !isQuarterly &&
      !form.reporting_month
    ) {
      alert(
        "Please select reporting month."
      );

      return;
    }

    const numericValue = form.value.replace(
      /,/g,
      ""
    );

    if (
      numericValue === "" ||
      Number(numericValue) < 0
    ) {
      alert(
        isQuarterly
          ? "Please enter the number of contracted facilities."
          : "Please enter a valid amount."
      );

      return;
    }

    try {
      setSubmitting(true);

      const data = new FormData();

      data.append(
        "report_type",
        form.report_type
      );

      data.append(
        "reporting_year",
        form.reporting_year
      );

      data.append(
        "reporting_month",
        isQuarterly
          ? ""
          : form.reporting_month
      );

      data.append(
        "reporting_quarter",
        isQuarterly
          ? form.reporting_quarter
          : ""
      );

      // Remove commas before sending
      // the value to FastAPI/PostgreSQL.
      data.append(
        "value",
        numericValue || "0"
      );

      data.append(
        "submitted_by",
        form.submitted_by ||
          "SHA Coordinator"
      );

      data.append(
        "notes",
        form.notes
      );

      if (document) {
        data.append(
          "supporting_document",
          document
        );
      }

      await api.post(
        "/county-sha-reports",
        data
      );

      alert(
        "SHA report submitted successfully."
      );

      setForm({
        report_type: "",
        reporting_year: String(currentYear),
        reporting_month: "",
        reporting_quarter: "",
        value: "",
        submitted_by: defaultSubmittedBy,
        notes: "",
      });

      setDocument(null);
    } catch (error: any) {
      console.error(error);

      const message =
        error?.response?.data?.detail ||
        "Failed to submit SHA report.";

      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sha-page">
      <div className="sha-header">
        <h2>County SHA Reporting</h2>

        <p>
          Submit county-level SHA reports
          for claims, reimbursements,
          rejections and contracted
          facilities.
        </p>
      </div>

      <form
        className="sha-card"
        onSubmit={handleSubmit}
      >
        <div className="sha-section-title">
          <FileText size={18} />
          <span>Report Details</span>
        </div>

        <div className="sha-grid">
          <div className="sha-form-group">
            <label>Report Type</label>

            <select
              value={form.report_type}
              onChange={(event) =>
                handleReportTypeChange(
                  event.target.value
                )
              }
              required
            >
              <option value="">
                Select report type
              </option>

              {reportTypes.map(
                (reportType) => (
                  <option
                    key={reportType}
                    value={reportType}
                  >
                    {reportType}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="sha-form-group">
            <label>Reporting Year</label>

            <select
              value={form.reporting_year}
              onChange={(event) =>
                updateField(
                  "reporting_year",
                  event.target.value
                )
              }
              required
            >
              {Array.from(
                {
                  length:
                    currentYear - 2026 + 6,
                },
                (_, index) =>
                  2026 + index
              ).map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}
            </select>
          </div>

          {isQuarterly ? (
            <div className="sha-form-group">
              <label>
                Reporting Quarter
              </label>

              <select
                value={
                  form.reporting_quarter
                }
                onChange={(event) =>
                  updateField(
                    "reporting_quarter",
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select quarter
                </option>

                {quarters.map(
                  (quarter) => (
                    <option
                      key={quarter}
                      value={quarter}
                    >
                      {quarter}
                    </option>
                  )
                )}
              </select>
            </div>
          ) : (
            <div className="sha-form-group">
              <label>
                Reporting Month
              </label>

              <select
                value={
                  form.reporting_month
                }
                onChange={(event) =>
                  updateField(
                    "reporting_month",
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select month
                </option>

                {months.map((month) => (
                  <option
                    key={month}
                    value={month}
                  >
                    {month}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sha-form-group">
            <label>
              {isQuarterly
                ? "Number of Contracted Facilities"
                : "Amount (KES)"}
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={form.value}
              onChange={(event) =>
                handleValueChange(
                  event.target.value
                )
              }
              placeholder={
                isQuarterly
                  ? "Enter number of facilities"
                  : "e.g. 12,000,000"
              }
              required
            />
          </div>

          <div className="sha-form-group">
            <label>Submitted By</label>

            <input
              type="text"
              value={form.submitted_by}
              onChange={(event) =>
                updateField(
                  "submitted_by",
                  event.target.value
                )
              }
              placeholder="SHA Coordinator"
              required
            />
          </div>
        </div>

        <div className="sha-form-group full">
          <label>Notes</label>

          <textarea
            value={form.notes}
            onChange={(event) =>
              updateField(
                "notes",
                event.target.value
              )
            }
            placeholder="Optional notes about this report"
          />
        </div>

        <div className="sha-section-title">
          <Upload size={18} />
          <span>Upload Report</span>
        </div>

        <label className="sha-upload-box">
          <Upload size={30} />

          <span>
            {document
              ? document.name
              : "Choose report document"}
          </span>

          <small>
            Accepted: PDF, XLS or XLSX.
            Maximum size: 10 MB.
          </small>

          <input
            type="file"
            hidden
            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) =>
              handleDocumentChange(
                event.target.files?.[0] ||
                  null
              )
            }
          />
        </label>

        <div className="sha-actions">
          <button
            type="submit"
            disabled={submitting}
          >
            <Send size={18} />

            {submitting
              ? "Submitting..."
              : "Submit SHA Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CountySHAReporting;