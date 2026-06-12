import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Lock, Mail, UserPlus, Users, Building2, LogIn } from "lucide-react";
import "./Login.css";

function Login() {
  const [role, setRole] = useState("facility");
  const navigate = useNavigate();

  function handleDemoLogin() {
    if (role === "facility") {
      navigate("/data-collection");
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="login-page">
      <div className="login-overlay">
        <header className="login-header">
          <img src="/assets/nakuru-logo.png" alt="Nakuru County Logo" className="county-logo" />
          <h1>NAKURU HPT</h1>
          <h2>MONITORING SYSTEM</h2>
          <p>Healthy People, Prosperous County</p>
        </header>

        <main className="login-content">
          <section className="login-card">
            <h3>Welcome Back!</h3>
            <p className="subtitle">Sign in to continue to your account</p>

            <div className="input-group">
              <Mail size={22} />
              <input type="text" placeholder="Email or username" />
            </div>

            <div className="input-group">
              <Lock size={22} />
              <input type="password" placeholder="Password" />
              <Eye size={22} className="right-icon" />
            </div>

            <div className="input-group">
              <Users size={22} />
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="facility">Facility User</option>
                <option value="county">County / National User</option>
              </select>
            </div>

            <button className="sign-in-btn" onClick={handleDemoLogin}>
              <LogIn size={24} />
              Sign In
            </button>

            <div className="divider" />

            <p className="small-text">Don’t have an account?</p>

            <button
              className="create-account-btn"
              onClick={() => alert("Demo version: account creation will be enabled later.")}
            >
              <UserPlus size={22} />
              Create Account
            </button>

            <button
              className="forgot-btn"
              onClick={() => alert("Demo version: password reset will be enabled later.")}
            >
              Forgot your password?
            </button>
          </section>

          <aside className="info-card">
            <h3>Who can use this system?</h3>

            <div className="info-item">
              <Building2 size={34} />
              <div>
                <h4>Facility Users</h4>
                <p>Health facility staff can collect, enter and manage HPT service data.</p>
              </div>
            </div>

            <div className="info-item">
              <Users size={34} />
              <div>
                <h4>County / National Users</h4>
                <p>County and national teams can view reports, dashboards and analytics.</p>
              </div>
            </div>

            <div className="green-note">
              Together, we monitor today for a healthier tomorrow.
            </div>
          </aside>
        </main>

        <footer>
          Secure • Confidential • Reliable <br />
          © 2025 Nakuru County Health Department. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default Login;