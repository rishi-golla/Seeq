import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainWindowLayer from "./pages/mainWindow/mainWindowLayer";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="main" element={<MainWindowLayer/>} />
      </Routes>
    </Router>
  )
}

export default App
