  import { Routes, Route } from "react-router-dom";
  import MainLayout from "../layouts/MainLayout";
  import Home from "../pages/Home/Home";
  import Catalog from "../pages/Catalog/Catalog";
  import Product from "../pages/Product/Product";
  import Sell from "../pages/Sell/Sell";
  import Profile from "../pages/Profile/Profile";
  import Login from "../pages/Auth/Login";
  import Register from "../pages/Auth/Register";
  import NotFound from "../pages/NotFound";
  import Favorites from "../pages/Favorites/Favorites";
  import Cart from "../pages/Cart/Cart";
  import Admin from "../pages/Admin/Admin";
  import About from "../pages/Info/About";
  import Help from "../pages/Info/Help";
  import Terms from "../pages/Info/Terms";
  import Privacy from "../pages/Info/Privacy";
  import CookiePolicy from "../pages/Info/CookiePolicy";
  import Security from "../pages/Info/Security";


  const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/product/:id" element={<Product />} />
      <Route path="/sell" element={<Sell />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/about" element={<About />} />
      <Route path="/help" element={<Help />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/security" element={<Security />} />
    </Route>

    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="*" element={<NotFound />} />
  </Routes>

  );

  export default AppRoutes;
