import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Lock, Mail, UserPlus, User, Building2, MapPin } from "lucide-react";
import api from "../api/api";
import "./Login.css";

type Facility = {
  mfl_code: string;
  facility_name: string;
  subcounty_name: string;
};

function Register() {
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "facility",
    county: "Nakuru",
    subcounty_name: "",
    facility_mfl_code: "",
  });

  useEffect(() => {
    api.get("/facilities").then((res) => {
      setFacilities(res.data || []);
    });
  }, []);

  const subcounties = Array.from(
    new Set(facilities.map((f) => f.subcounty_name).filter(Boolean))
  );

  const filteredFacilities = facilities.filter(
    (f) => f.subcounty_name === form.subcounty_name
  );
  const selectedFacility = facilities.find(
  (f) => f.mfl_code === form.facility_mfl_code
);

  async function handleRegister() {
   
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      role: form.role,
      facility_mfl_code:
        form.role === "facility" ? form.facility_mfl_code : null,
      facility_name:
        form.role === "facility" ? selectedFacility?.facility_name || "" : null,
      subcounty_name:
        form.role === "facility" ? form.subcounty_name : form.county,
    };

    const res = await api.post("/auth/register", payload);

    if (!res.data.success) {
      alert(res.data.message || "Registration failed");
      return;
    }

 
    const message =
    form.role === "facility"
      ? "Account created successfully. You can now login."
      : "Account created. Please wait for administrator approval.";
    alert(message);
    navigate("/");
  }


  return (
    <div className="login-page">
      <div className="login-overlay">
        <main className="login-content">
          <section className="login-card">
            <h3>Create Account</h3>
            <p className="subtitle">Register for Nakuru HPT Monitoring System</p>

            <div className="input-group">
              <User size={22} />
              <input
                type="text"
                placeholder="First Name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>

            <div className="input-group">
              <User size={22} />
              <input
                type="text"
                placeholder="Last Name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>

            <div className="input-group">
              <Mail size={22} />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="input-group">
              <Lock size={22} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Eye
                size={22}
                className="right-icon"
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer" }}
              />
            </div>

            <div className="input-group">
              <Building2 size={22} />
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                    subcounty_name: "",
                    facility_mfl_code: "",
                  })
                }
              >
                <option value="facility">Facility User</option>
                <option value="county">County / Sub County User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {form.role === "facility" && (
              <>
                <div className="input-group">
                  <MapPin size={22} />
                  <select
                    value={form.subcounty_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        subcounty_name: e.target.value,
                        facility_mfl_code: "",
                      })
                    }
                  >
                    <option value="">Select Subcounty</option>
                    {subcounties.map((subcounty) => (
                      <option key={subcounty} value={subcounty}>
                        {subcounty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <Building2 size={22} />
                  <select
                    value={form.facility_mfl_code}
                    onChange={(e) =>
                      setForm({ ...form, facility_mfl_code: e.target.value })
                    }
                  >
                    <option value="">Select Facility</option>
                    {filteredFacilities.map((facility) => (
                      <option key={facility.mfl_code} value={facility.mfl_code}>{facility.facility_name} - {facility.mfl_code}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedFacility && (
                  <div className="input-group">
                    <Building2 size={22} />
                    <input
                      type="text"
                      value={`MFL Code: ${selectedFacility.mfl_code}`}
                      readOnly
                    />

                    
                  </div>
                )}
              </>
            )}

            {form.role === "county" && (
              <div className="input-group">
                <MapPin size={22} />
                <select
                  value={form.county}
                  onChange={(e) => setForm({ ...form, county: e.target.value })}
                >
                  <option value="Nairobi">Nairobi</option>
                  <option value="Nakuru">Nakuru</option>
                  <option value="Kakamega">Kakamega</option>
                  <option value="Trans Nzoia">Trans Nzoia</option>
                  <option value="Isiolo">Isiolo</option>
                </select>
              </div>
            )}

            <button className="sign-in-btn" onClick={handleRegister}>
              <UserPlus size={24} />
              Create Account
            </button>

            <button className="forgot-btn" onClick={() => navigate("/")}>
              Back to Login
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Register;