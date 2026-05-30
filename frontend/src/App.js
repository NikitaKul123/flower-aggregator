import { useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import AppRoutes from './components/AppRoutes';
import MobileBottomNav from './components/MobileBottomNav';
import PushNavigationListener from './components/PushNavigationListener';
import { shouldShowMobileBottomNav } from './utils/mobileNav';

function isChatRoute(pathname) {
  return /\/chat$/.test(pathname);
}

function AppShell() {
  const { pathname } = useLocation();
  const { user } = useContext(AuthContext);
  const chatPage = isChatRoute(pathname);
  const showBottomNav = shouldShowMobileBottomNav(pathname, user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    document.documentElement.classList.toggle('chat-no-scroll', chatPage);
    return () => document.documentElement.classList.remove('chat-no-scroll');
  }, [chatPage]);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  const shellClass = chatPage
    ? 'h-dvh max-h-dvh w-full overflow-hidden grid grid-rows-[auto_1fr] bg-slate-50'
    : `min-h-screen bg-slate-50 ${showBottomNav ? 'pb-mobile-nav' : ''}`;

  return (
    <div className={shellClass}>
      <PushNavigationListener />
      <Navbar
        mobileCompact={showBottomNav}
        drawerOpen={drawerOpen}
        onDrawerOpen={openDrawer}
        onDrawerClose={closeDrawer}
      />
      <main className={chatPage ? 'min-h-0 overflow-hidden' : 'mobile-main'}>
        <AppRoutes />
      </main>
      {!chatPage && (
        <MobileBottomNav onOpenMore={openDrawer} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppShell />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
