import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import getCurrentUser from "./utils/getCurrentUser";
import InterviewPage from "./pages/InterviewPage";
import History from "./pages/History";
import Step3Report from "./components/Step3Report";
import Pricing from "./pages/Pricing";

export const ServerURL = "http://localhost:8000";

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    getCurrentUser(dispatch);
  }, [dispatch]);
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/interview" element={<InterviewPage />} />
      <Route path="/history" element={<History />} />
      <Route path="/history/:interviewId" element={<Step3Report />} />
      <Route path="/pricing" element={<Pricing />} />
    </Routes>
  );
};

export default App;
