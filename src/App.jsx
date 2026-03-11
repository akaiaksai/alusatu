import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";

const THEME_KEY = "alu-satu-theme";

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return <AppRoutes />;
}

export default App;
