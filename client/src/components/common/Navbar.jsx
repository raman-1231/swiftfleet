import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/apiClient';
import {
  Truck,
  Bell,
  LogOut,
  ChevronDown,
  User,
  ShieldCheck,
  Building2,
  Bike,
  PlusCircle,
  FileCheck,
  Layers,
  Activity,
  DollarSign,
  IndianRupee,
  AlertOctagon,
  FileText,
  Menu,
  X,
  MapPin,
  Package
} from 'lucide-react';

export const Navbar = () => {
  const { user, profile, logout, isAuthenticated, isBusiness, isPartner, isAdmin, login } = useAuth();
  const { connected, connectionStatus } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Demo features gated strictly to non-production or explicit opt-in
  const enableDemo = !import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO === 'true';

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch notifications if logged in
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/notifications')
        .then((res) => {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDemoSwitch = async (email) => {
    setShowDemoMenu(false);
    try {
      await login(email, 'Password123!');
      if (email.includes('admin')) {
        navigate('/admin');
      } else if (email.includes('courier')) {
        navigate('/partner');
      } else {
        navigate('/business');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isActive = (path) => location.pathname === path;

  const renderConnectionPill = (isMobile = false) => {
    if (!isAuthenticated) return null;
    const isConn = connectionStatus === 'connected';
    const isRecon = connectionStatus === 'reconnecting';

    let dotColor = 'bg-red-400';
    let text = 'Disconnected';
    let style = 'bg-red-50 border-red-200 text-red-700';

    if (isConn) {
      dotColor = 'bg-emerald-500 animate-pulse';
      text = 'Socket Live';
      style = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    } else if (isRecon) {
      dotColor = 'bg-amber-500 animate-ping';
      text = 'Reconnecting';
      style = 'bg-amber-50 border-amber-200 text-amber-800';
    }

    return (
      <div
        title={isConn ? 'Realtime Dispatch Engine Connected' : isRecon ? 'Attempting reconnection...' : 'Disconnected from Realtime Dispatch'}
        className={`items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${style} ${isMobile ? 'inline-flex' : 'hidden sm:flex'}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span>{text}</span>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-ink-200 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-subtle group-hover:bg-brand-600 transition-colors">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-ink-950 tracking-tight leading-none">
                  Swift<span className="text-brand-500">Fleet</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-ink-500 font-semibold mt-0.5">
                  Logistics OS
                </span>
              </div>
            </Link>

            {/* Navigation Links based on Role */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {isBusiness && (
                  <>
                    <Link
                      to="/business"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive('/business') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      Operations Hub
                    </Link>
                    <Link
                      to="/business/create"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/business/create') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4 text-brand-500" />
                      Create Delivery
                    </Link>
                    <Link
                      to="/business/history"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive('/business/history') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      Order Ledger
                    </Link>
                  </>
                )}

                {isPartner && (
                  <>
                    <Link
                      to="/partner"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/partner') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <Bike className="w-4 h-4" />
                      Courier HUD
                    </Link>
                    <Link
                      to="/partner/earnings"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/partner/earnings') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <IndianRupee className="w-4 h-4" />
                      Earnings Ledger
                    </Link>
                    <Link
                      to="/partner/profile"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/partner/profile') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verification Profile
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive('/admin') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      Console Metrics
                    </Link>
                    <Link
                      to="/admin/verification"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/admin/verification') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <FileCheck className="w-4 h-4" />
                      Partner Verification
                    </Link>
                    <Link
                      to="/admin/fleet"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/admin/fleet') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      Live Fleet Map
                    </Link>
                    <Link
                      to="/admin/disputes"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/admin/disputes') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <AlertOctagon className="w-4 h-4" />
                      Disputes & Ops
                    </Link>
                    <Link
                      to="/admin/audit"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive('/admin/audit') ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Audit Trail
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Engine Status Indicator */}
            {renderConnectionPill(false)}

            {/* Placement Evaluator Persona Quick Switcher (Dev / Evaluator Only) */}
            {enableDemo && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-xs font-semibold hover:bg-brand-100 transition-colors shadow-subtle"
                >
                  <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Switch Demo Persona</span>
                  <span className="sm:hidden">Demo</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {showDemoMenu && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-elevated border border-ink-200 py-2 z-50 animate-in fade-in zoom-in-95"
                    onClick={() => setShowDemoMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-ink-100">
                      <p className="text-xs font-semibold text-ink-900">Portfolio Evaluator Switcher</p>
                      <p className="text-[11px] text-ink-500">Instantly switch between roles without typing credentials:</p>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => handleDemoSwitch('roast@artisan.demo')}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-ink-50 flex items-center gap-2.5 text-xs text-ink-800"
                      >
                        <Building2 className="w-4 h-4 text-brand-500" />
                        <div>
                          <div className="font-medium">Artisan Roast Co.</div>
                          <div className="text-[10px] text-ink-500">Merchant / Business Role</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDemoSwitch('marcus.vance@courier.demo')}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-ink-50 flex items-center gap-2.5 text-xs text-ink-800"
                      >
                        <Bike className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-medium">Marcus Vance (Approved)</div>
                          <div className="text-[10px] text-ink-500">Active Delivery Partner</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDemoSwitch('elena.rostova@courier.demo')}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-ink-50 flex items-center gap-2.5 text-xs text-ink-800"
                      >
                        <Bike className="w-4 h-4 text-brand-600" />
                        <div>
                          <div className="font-medium">Elena Rostova (Approved)</div>
                          <div className="text-[10px] text-ink-500">E-Bike Partner (Midtown East)</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDemoSwitch('devon.thorne@courier.demo')}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-ink-50 flex items-center gap-2.5 text-xs text-ink-800"
                      >
                        <Bike className="w-4 h-4 text-amber-500" />
                        <div>
                          <div className="font-medium">Devon Thorne (Pending)</div>
                          <div className="text-[10px] text-ink-500">Unverified Partner Onboarding</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDemoSwitch('admin@swiftfleet.io')}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-ink-50 flex items-center gap-2.5 text-xs text-ink-800"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <div>
                          <div className="font-medium">Sarah Lin (Ops Director)</div>
                          <div className="text-[10px] text-ink-500">Administrator Console</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Authenticated Notifications Bell */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-ink-500 hover:text-ink-800 hover:bg-ink-100 transition-colors"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-ops-danger text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-elevated border border-ink-200 py-3 z-50">
                    <div className="flex items-center justify-between px-4 pb-2 border-b border-ink-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-ink-50">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-ink-400">
                          No notifications at this time
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`p-3 text-left transition-colors ${n.read ? 'bg-white' : 'bg-blue-50/40'}`}
                          >
                            <p className="text-xs font-semibold text-ink-900">{n.title}</p>
                            <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-ink-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Menu or Auth Buttons */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-ink-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-ink-800 text-white flex items-center justify-center text-xs font-bold uppercase">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-ink-900 leading-tight">{user?.name}</p>
                    <p className="text-[11px] text-ink-500 capitalize">{user?.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-elevated border border-ink-200 py-1 z-50 animate-in fade-in"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-ink-100">
                      <p className="text-xs font-semibold text-ink-900">{user?.name}</p>
                      <p className="text-[11px] text-ink-500 truncate">{user?.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-ops-danger hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/track"
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive('/track')
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-brand-600 hover:text-brand-800 hover:bg-brand-50/70'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-brand-500" />
                  <span>Track Order</span>
                </Link>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-ink-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register-business"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-subtle"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors ml-0.5"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-ink-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-elevated animate-in slide-in-from-top-2">
          {/* Mobile Connection Pill & Active Role */}
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            {renderConnectionPill(true)}
            <span className="text-xs font-semibold text-ink-600 font-mono capitalize">
              {user ? `Role: ${user.role}` : 'Public Portal'}
            </span>
          </div>

          {/* Role Navigation Links */}
          {isAuthenticated && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-ink-400 block px-2 mb-1">
                Workspace Menu
              </span>
              {isBusiness && (
                <>
                  <Link
                    to="/business"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/business') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-brand-500" />
                    Operations Hub
                  </Link>
                  <Link
                    to="/business/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/business/create') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-brand-500" />
                    Create Delivery
                  </Link>
                  <Link
                    to="/business/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/business/history') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-brand-500" />
                    Order Ledger
                  </Link>
                </>
              )}

              {isPartner && (
                <>
                  <Link
                    to="/partner"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/partner') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <Bike className="w-4 h-4 text-brand-500" />
                    Courier HUD
                  </Link>
                  <Link
                    to="/partner/earnings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/partner/earnings') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <IndianRupee className="w-4 h-4 text-brand-500" />
                    Earnings Ledger
                  </Link>
                  <Link
                    to="/partner/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/partner/profile') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-brand-500" />
                    Verification Profile
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/admin') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-brand-500" />
                    Operations Command
                  </Link>
                  <Link
                    to="/admin/verification"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/admin/verification') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <FileCheck className="w-4 h-4 text-brand-500" />
                    Partner Verification
                  </Link>
                  <Link
                    to="/admin/fleet"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/admin/fleet') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-brand-500" />
                    Live Fleet Map
                  </Link>
                  <Link
                    to="/admin/disputes"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/admin/disputes') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <AlertOctagon className="w-4 h-4 text-brand-500" />
                    Disputes & Ops
                  </Link>
                  <Link
                    to="/admin/audit"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive('/admin/audit') ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-brand-500" />
                    Audit Trail
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Quick Demo Switcher inside Mobile Drawer (Dev Only) */}
          {enableDemo && (
            <div className="pt-2 border-t border-ink-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-ink-400 block px-2 mb-2">
                Switch Demo Persona
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => { handleDemoSwitch('roast@artisan.demo'); setMobileMenuOpen(false); }}
                  className="px-2.5 py-2 rounded-lg border border-ink-200 bg-ink-50 text-xs font-medium text-left hover:bg-brand-50 text-ink-800"
                >
                  ☕ Artisan Roast
                </button>
                <button
                  type="button"
                  onClick={() => { handleDemoSwitch('marcus.vance@courier.demo'); setMobileMenuOpen(false); }}
                  className="px-2.5 py-2 rounded-lg border border-ink-200 bg-ink-50 text-xs font-medium text-left hover:bg-brand-50 text-ink-800"
                >
                  🛵 Marcus Vance
                </button>
                <button
                  type="button"
                  onClick={() => { handleDemoSwitch('elena.rostova@courier.demo'); setMobileMenuOpen(false); }}
                  className="px-2.5 py-2 rounded-lg border border-ink-200 bg-ink-50 text-xs font-medium text-left hover:bg-brand-50 text-ink-800"
                >
                  🚴 Elena Rostova
                </button>
                <button
                  type="button"
                  onClick={() => { handleDemoSwitch('admin@swiftfleet.io'); setMobileMenuOpen(false); }}
                  className="px-2.5 py-2 rounded-lg border border-ink-200 bg-ink-50 text-xs font-medium text-left hover:bg-brand-50 text-ink-800"
                >
                  🛡️ Admin Ops
                </button>
              </div>
            </div>
          )}

          {/* Mobile User Profile or Auth */}
          <div className="pt-2 border-t border-ink-100">
            {isAuthenticated ? (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-ink-800 text-white flex items-center justify-center text-xs font-bold uppercase">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-900">{user?.name}</p>
                    <p className="text-[10px] text-ink-500 truncate max-w-[150px]">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate('/');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-ops-danger hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors border border-red-100"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <Link
                  to="/track"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    isActive('/track')
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'border-brand-200 bg-brand-50/70 text-brand-700 hover:bg-brand-100'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-brand-500" />
                  <span>Track Delivery Order</span>
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 rounded-lg border border-ink-200 text-xs font-medium text-ink-700 hover:bg-ink-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register-business"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shadow-subtle"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
