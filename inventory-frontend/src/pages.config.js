/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import InvoiceDetails from './pages/InvoiceDetails';
import Invoices from './pages/Invoices';
import Products from './pages/Products';
import ReceiveStock from './pages/ReceiveStock';
import Reports from './pages/Reports';
import ShopStock from './pages/ShopStock';
import Shops from './pages/Shops';
import StockMovements from './pages/StockMovements';
import UploadInvoice from './pages/UploadInvoice';
import Marketplace from './pages/Marketplace';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import ManageOrders from './pages/ManageOrders';
import __Layout from './Layout.jsx';
import Registration from './pages/Registration';
import Login from './pages/Login';


export const PAGES = {
    "Landing": Landing,
    "Login": Login,
    "Registration": Registration,
    "Dashboard": Dashboard,
    "InvoiceDetails": InvoiceDetails,
    "Invoices": Invoices,
    "Products": Products,
    "ReceiveStock": ReceiveStock,
    "Reports": Reports,
    "ShopStock": ShopStock,
    "Shops": Shops,
    "StockMovements": StockMovements,
    "UploadInvoice": UploadInvoice,
    "Marketplace": Marketplace,
    "ProductDetail": ProductDetail,
    "Cart": Cart,
    "Checkout": Checkout,
    "OrderConfirmation": OrderConfirmation,
    "MyOrders": MyOrders,
    "OrderDetail": OrderDetail,
    "ManageOrders": ManageOrders,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};