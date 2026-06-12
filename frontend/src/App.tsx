import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import DataCollection from "./pages/DataCollection";
import MainLayout from "./components/layout/MainLayout";
import Submissions from "./pages/Submissions";
import FacilityTrends from "./pages/FacilityTrends";
import Register from "./pages/Register";

import CountyDashboard from "./pages/CountyDashboard";
<Route path="/dashboard" element={<CountyDashboard />} />
function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>This page will be built next.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<CountyDashboard />} />
          <Route
            path="/data-collection"
            element={<DataCollection />}
          />
          <Route path="/submissions" element={<Submissions />} />
          
          <Route path="/users" element={<Placeholder title="Users" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
          <Route path="/facilities" element={<FacilityTrends />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;