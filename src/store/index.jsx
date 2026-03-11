import { AuthProvider, useAuth } from "./auth/AuthContext";
import { CartProvider, useCart } from "./cart/CartContext";
import { FavoritesProvider, useFavorites } from "./favorites/FavoritesContext";
import { DataProvider, useData } from "./data/DataContext";

const StoreProvider = ({ children }) => (
  <AuthProvider>
    <DataProvider>
      <CartProvider>
        <FavoritesProvider>
          {children}
        </FavoritesProvider>
      </CartProvider>
    </DataProvider>
  </AuthProvider>
);

export { StoreProvider, useAuth, useCart, useFavorites, useData };
