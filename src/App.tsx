import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Onboard from "./pages/Onboard";
import GateKeeper from "./middleware/GateKeeper";
import { AppProvider } from "./state/app";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <GateKeeper>
          <Routes>
            <Route path="/" element={<Onboard />} />
            <Route path="/onboard" element={<Onboard />} />
          </Routes>
        </GateKeeper>
      </BrowserRouter>
    </AppProvider>
  );
}
