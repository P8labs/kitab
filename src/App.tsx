import { BrowserRouter, Routes, Route } from "react-router-dom";

import Onboard from "./pages/Onboard";
import GateKeeper from "./middleware/GateKeeper";
import { AppProvider } from "./state/app";
import Home from "./pages/Home";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <GateKeeper>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/onboard" element={<Onboard />} />
          </Routes>
        </GateKeeper>
      </BrowserRouter>
    </AppProvider>
  );
}
