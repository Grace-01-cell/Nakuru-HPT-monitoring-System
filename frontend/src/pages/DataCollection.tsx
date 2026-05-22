import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Wallet,
  Percent,
  Upload,
  FileText,
} from "lucide-react";
import api from "../api/api";
import "./DataCollection.css";
function formatNumber(value: string) {
  const raw = value.replace(/,/g, "").replace(/[^\d]/g, "");

  if (!raw) return "";

  return Number(raw).toLocaleString();
}

function cleanNumber(value: string) {
  return value.replace(/,/g, "");
}
interface Facility {
  mfl_code: string;
  facility_name: string;
}

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function DataCollection() {
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [form, setForm] = useState({
    mfl_code: "",
    amount_received: "",
    funding_source: "",
    date_received: "",
    amount_allocated_to_hpt: "",
    amount_spent_on_hpt: "",
    amount_used_for_chp_kits: "",
    submitted_by: "facility_user",
  });

  const [document, setDocument] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/facilities")
      .then((res) => {
        setFacilities(res.data);
      })
      .catch((err) => console.error(err));
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const calculations = useMemo(() => {
    const amountReceived = Number(cleanNumber(form.amount_received) || 0);
    const hptAllocated = Number(cleanNumber(form.amount_allocated_to_hpt) || 0);
    const hptSpent = Number(cleanNumber(form.amount_spent_on_hpt) || 0);
    const chpKits = Number(cleanNumber(form.amount_used_for_chp_kits) || 0);

    const balance = hptAllocated - hptSpent;

    const hptPercent =
      amountReceived > 0
        ? ((hptAllocated / amountReceived) * 100).toFixed(2)
        : "0.00";

    const requiredChpAmount = hptAllocated * 0.05;

    const chpPercent =
      hptAllocated > 0
        ? ((chpKits / hptAllocated) * 100).toFixed(2)
        : "0.00";

    return {
      balance,
      hptPercent,
      requiredChpAmount,
      chpPercent,
    };
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);

      const data = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        data.append(key, value);
      });

      if (document) {
        data.append("supporting_document", document);
      }

      await api.post("/submit-record", data);

      alert("Record submitted successfully");

      setForm({
        mfl_code: "",
        amount_received: "",
        funding_source: "",
        date_received: "",
        amount_allocated_to_hpt: "",
        amount_spent_on_hpt: "",
        amount_used_for_chp_kits: "",
        submitted_by: "facility_user",
      });

      setDocument(null);
    } catch (error) {
      console.error(error);
      alert("Failed to submit record");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="collection-page">
      <div className="page-header">
        <h2>Data Collection</h2>

        <p>
          Submit facility HPT funding records and supporting documents.
        </p>
      </div>

      <div className="collection-grid">
        <form className="collection-card" onSubmit={handleSubmit}>
          <h3>Add HPT Funds Record</h3>

          <div className="section-title">
            <Building2 size={18} />
            <span>Facility Information</span>
          </div>

          <div className="form-group">
            <label>Facility</label>

            <select
              value={form.mfl_code}
              onChange={(e) =>
                updateField("mfl_code", e.target.value)
              }
              required
            >
              <option value="">Select facility</option>

              {facilities.map((facility) => (
                <option
                  key={facility.mfl_code}
                  value={facility.mfl_code}
                >
                  {facility.facility_name}
                </option>
              ))}
            </select>
          </div>

          <div className="section-title">
            <Wallet size={18} />
            <span>Financial Information</span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Amount Received</label>

              <input
                type="text"
                value={form.amount_received}
                onChange={(e) =>
                  updateField("amount_received", formatNumber(e.target.value))
                }
                placeholder="Enter amount received"
                required
              />
            </div>

            <div className="form-group">
              <label>Funding Source</label>

              <select
                value={form.funding_source}
                onChange={(e) =>
                  updateField("funding_source", e.target.value)
                }
                required
              >
                <option value="">Select funding source</option>
                <option>County Allocation</option>
                <option>FIF</option>
                <option>SHA</option>
                <option>Partner Funding</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date Received</label>

              <input
                type="date"
                value={form.date_received}
                onChange={(e) =>
                  updateField("date_received", e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Amount Allocated to HPT</label>

              <input
                type="text"
                value={form.amount_allocated_to_hpt}
                onChange={(e) =>
                  updateField(
                    "amount_allocated_to_hpt",
                    formatNumber(e.target.value)
                  )
                }
                placeholder="Enter HPT allocation"
                required
              />
            </div>

            <div className="form-group">
              <label>Amount Spent on HPT</label>

              <input
                type="text"
                value={form.amount_spent_on_hpt}
                onChange={(e) =>
                  updateField(
                    "amount_spent_on_hpt",
                    formatNumber(e.target.value)
                  )
                }
                placeholder="Enter HPT spend"
                required
              />
            </div>

            <div className="form-group">
              <label>Amount Used for CHP Kits</label>

              <input
                type="text"
                value={form.amount_used_for_chp_kits}
                onChange={(e) =>
                  updateField(
                    "amount_used_for_chp_kits",
                    formatNumber(e.target.value)
                  )
                }
                placeholder="Enter CHP Kits amount"
                required
              />
            </div>

            <div className="form-group">
              <label>Submitted By</label>

              <input
                type="text"
                value={form.submitted_by}
                onChange={(e) =>
                  updateField("submitted_by", e.target.value)
                }
              />
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-box">
              <span>Balance</span>
              <strong>{money(calculations.balance)}</strong>
            </div>

            <div className="summary-box">
              <span>HPT %</span>
              <strong>{calculations.hptPercent}%</strong>
            </div>

            <div className="summary-box">
              <span>Required CHP Kits Amount</span>
              <strong>
                {money(calculations.requiredChpAmount)}
              </strong>
            </div>

            <div className="summary-box">
              <span>CHP Kits % of HPT</span>
              <strong>{calculations.chpPercent}%</strong>
            </div>
          </div>

          <div className="section-title">
            <FileText size={18} />
            <span>Supporting Documents</span>
          </div>

          <label className="upload-box">
            <Upload size={28} />

            <span>
              {document
                ? document.name
                : "Upload supporting document"}
            </span>

            <input
              type="file"
              hidden
              onChange={(e) =>
                setDocument(e.target.files?.[0] || null)
              }
            />
          </label>

          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Record"}
          </button>
        </form>

        <div className="calculation-card">
          <h3>Live Calculation</h3>

          <div className="calc-box">
            <span>Amount Received</span>
            <strong>
              {money(Number(cleanNumber(form.amount_received) || 0))}
            </strong>
          </div>

          <div className="calc-box">
            <span>HPT Allocation %</span>
            <strong>{calculations.hptPercent}%</strong>
          </div>

          <div
            className={
              Number(calculations.hptPercent) >= 40
                ? "status-box compliant"
                : "status-box non-compliant"
            }
          >
            {Number(calculations.hptPercent) >= 40
              ? "Compliant with Required HPT %"
              : "Below Required HPT %"}
          </div>

          <div className="calc-box">
            <span>Required CHP Kits Amount</span>
            <strong>
              {money(calculations.requiredChpAmount)}
            </strong>
          </div>

          <div className="calc-box">
            <span>CHP Kits % of HPT</span>
            <strong>{calculations.chpPercent}%</strong>
          </div>

          <div
            className={
              Number(calculations.chpPercent) >= 5
                ? "status-box compliant"
                : "status-box non-compliant"
            }
          >
            {Number(calculations.chpPercent) >= 5
              ? "CHP Kits Requirement Met"
              : "Below CHP Kits Target"}
          </div>

          <p className="note-text">
            Required HPT percentage is currently set to 40%.
            5% of the HPT allocation should go to CHP Kits.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DataCollection;