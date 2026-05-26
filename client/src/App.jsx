import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import Landing from "./pages/Landing";
import PetInfo from "./pages/PetInfo";
import PersonalInfo from "./pages/PersonalInfo";
import SelectPlan from "./pages/SelectPlan";
import Success from "./pages/Success";

import { trackVisitorOnce } from "./utils/visitorTracker";

function App() {
  useEffect(() => {
    trackVisitorOnce();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/quote" element={<PetInfo />} />
      <Route path="/select-plan" element={<SelectPlan />} />
      <Route path="/personal-info" element={<PersonalInfo />} />
      <Route path="/success" element={<Success />} />

      <Route path="/checkout" element={<Navigate to="/success" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;