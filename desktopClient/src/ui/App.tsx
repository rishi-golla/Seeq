import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainWindowLayer from "./pages/mainWindow/mainWindowLayer";
import PopupLayer from "./pages/popUp/PopupLayer";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="main" element={<MainWindowLayer/>} />
        <Route path="popup" element={<PopupLayer/>} />
      </Routes>
    </Router>
  )
}

export default App
