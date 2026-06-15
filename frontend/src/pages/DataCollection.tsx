import { useEffect, useState } from "react";
import {
  Building2,
  Wallet,
  
  Upload,
  FileText,
} from "lucide-react";
import api from "../api/api";
import MonthSelector from "../components/MonthSelector";
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



function DataCollection() {
  const user = JSON.parse(localStorage.getItem("hpt_user") || "{}");
  const isFacilityUser = user?.role === "facility";
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [form, setForm] = useState({
    mfl_code: "",
    amount_received: "",
    funding_source: "",
    reporting_period: "All",
    date_received: "",
    amount_allocated_to_hpt: "",
    amount_spent_on_hpt: "",
    amount_used_for_chp_kits: "",
    submitted_by: "facility_user",
    procurement_source: "",
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

  

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);

      const data = new FormData();

      
        data.append("mfl_code",isFacilityUser ? user.facility_mfl_code : form.mfl_code);
        data.append("amount_received", cleanNumber(form.amount_received));
        data.append("funding_source", form.funding_source);
        data.append("reporting_period", form.reporting_period);
        data.append("procurement_source", form.procurement_source);
        data.append("date_received", form.date_received);
        data.append(
          "amount_allocated_to_hpt",
  cleanNumber(form.amount_allocated_to_hpt)
);

data.append(
  "amount_spent_on_hpt",
  cleanNumber(form.amount_spent_on_hpt)
) ;   

data.append(
  "amount_used_for_chp_kits",
  cleanNumber(form.amount_used_for_chp_kits)
);
data.append("submitted_by", form.submitted_by);
      

      if (document) {
        data.append("supporting_document", document);
      }
      
      await api.post("/submit-record", data);

      alert("Record submitted successfully");

      setForm({
        mfl_code: "",
        amount_received: "",
        funding_source: "",
        reporting_period: "All",
        date_received: "",
        amount_allocated_to_hpt: "",
        amount_spent_on_hpt: "",
        amount_used_for_chp_kits: "",
        submitted_by: "facility_user",
        procurement_source: "",
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
            {isFacilityUser ? (
              <input
                type="text"
                value={user.facility_name || ""}
                disabled
              />
            ) : (
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
            )}
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
                <option>SHIF</option>
                <option>Facility Collection (Out of Pocket)</option>

                <option>Partner Funding</option>
              </select>
            </div>
            <div className="form-group">
             <label>Reporting Period</label>
              <MonthSelector
                value={form.reporting_period}
                onChange={(value) =>
                  updateField("reporting_period", value)
                }
              /> 
            </div>
            <div className="form-group">
              <label>Procurement Source</label>
              
              <select
                value={form.procurement_source}
                onChange={(e) =>
                  updateField("procurement_source", e.target.value)
                }
                required
              >
                <option value="">Select procurement source</option>
                <option value="KEMSA">KEMSA</option>
                <option value="MEDS">MEDS</option>
                <option value="Other">Other</option>
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

       
      </div>
    </div>
  );
}

export default DataCollection;