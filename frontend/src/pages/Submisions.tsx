import { useEffect, useMemo, useState } from "react";
import { Search, FileText } from "lucide-react";
import api from "../api/api";
import "./Submissions.css";
import MonthSelector from "../components/MonthSelector";
import MultiCheckboxFilter from "../components/MultiCheckboxFilter";

function getMonthYear(dateString: string) {
  if (!dateString) return "";

  const value = String(dateString).trim();

  let date: Date;

  if (value.includes("/")) {
    const [day, month, year] = value.split("/");
    date = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) return "";

  return date
    .toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    })
    .replace(" ", "-");
}
interface Submission {
  mfl_code: string;
  facility_name: string;
  subcounty_name: string;
  ward_name: string;
  reporting_month: string;
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
  "FIF",
  "SHIF",
  "Facility Collection (Out of Pocket)",
  "Partner Funding",
];
function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

function Submissions() {
  const [records, setRecords] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedSubcounty, setSelectedSubcounty] = useState<string[]>(["All"]);
  const [selectedMonth, setSelectedMonth] = useState<string[]>(["All"]);
  const [selectedFundingSource, setSelectedFundingSource] = useState<string[]>(["All"]);
  useEffect(() => {
    api
      .get("/records")
      .then((res) => {
        setRecords(res.data);
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
      ),
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        record.facility_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        record.subcounty_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        record.submitted_by
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesSubcounty =
        selectedSubcounty.includes("All") ||
          
        selectedSubcounty.includes(record.subcounty_name);

      const matchesMonth =
        selectedMonth.includes("All") ||
        selectedMonth.includes(record.reporting_period);
          

      const matchesFundingSource =
        selectedFundingSource.includes("All") ||
        selectedFundingSource.includes(record.funding_source);

      return matchesSearch && matchesSubcounty && matchesMonth && matchesFundingSource;
    });
  }, [records, search, selectedSubcounty, selectedMonth, selectedFundingSource]);

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

  if (loading) {
    return <div className="dashboard-loading">Loading submissions...</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <h2>Submissions</h2>
        <p>Track submitted HPT and CHP Kits compliance records.</p>
      </div>

      <div className="dashboard-filters">
  <MultiCheckboxFilter
    label="Subcounty"
    options={subcounties.filter((item) => item !== "All")}
    selected={selectedSubcounty}
    onChange={setSelectedSubcounty}
  />

  <MultiCheckboxFilter
    label="Reporting Period"
    options={["Jan-2026", "Feb-2026", "Mar-2026", "Apr-2026", "May-2026"]}
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

      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <p>Total Submissions</p>
            <h3>{totalSubmissions}</h3>
            <span>Filtered records</span>
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p>HPT Compliant</p>
            <h3>{compliantFacilities}</h3>
            <span>Facilities meeting 40%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p>HPT Non-Compliant</p>
            <h3>{nonCompliantFacilities}</h3>
            <span>Facilities below 40%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p>With Documents</p>
            <h3>{totalDocuments}</h3>
            <span>Uploaded supporting files</span>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search by facility, subcounty, or submitted by..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Facility</th>
                <th>Subcounty</th>
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
              {filteredRecords.map((record, index) => (
                <tr key={index}>
                  <td>
                    <div className="facility-cell">
                      <strong>{record.facility_name}</strong>

                      <span>
                        {record.subcounty_name} • {record.ward_name}
                      </span>
                    </div>
                  </td>

                  <td>{record.subcounty_name || "—"}</td>

                  <td>{record.funding_source}</td>

                  <td>{record.procurement_source || "—"}</td>

                  <td>{record.date_received}</td>

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

                  <td>{record.submitted_by}</td>

                  <td>
                    {record.supporting_document ? (
                      <button className="view-doc-btn">
                        <FileText size={14} />
                        View
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Submissions;