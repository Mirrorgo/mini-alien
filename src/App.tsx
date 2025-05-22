import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import View from "./pages/view";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/view" element={<View />} />
        {/* 其他路由 */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
