import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import logoSvg from '../../assets/logo.svg';

const Navbar = () => {
  const { user, company, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'grid_view' },
    { name: 'Marketplace', path: '/marketplace', icon: 'swap_horizontal_circle' },
    { name: 'Inventory', path: '/inventory', icon: 'warehouse' },
    { name: 'Orders & Tracking', path: '/orders', icon: 'local_shipping' },
    { name: 'Trade History', path: '/trades', icon: 'history_edu' },
    { name: 'Material Catalog', path: '/materials', icon: 'inventory_2' },
    { name: 'Company Profile', path: '/profile', icon: 'domain' },
  ];

  // Helper for user initials
  const getInitials = (name) => {
    if (!name) return 'SC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 45, 37, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 998,
          }}
        />
      )}

      {/* ── Fixed Sidebar (aside) ─────────────────────────────────── */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: '#142D25',
          borderRight: '1px solid rgba(225, 230, 223, 0.12)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`scrappy-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >
        {/* Top: Brand & Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Logo & Wordmark Header */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Link
              to="/dashboard"
              style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <img
                src={logoSvg}
                alt="Scrappy"
                style={{ width: '36px', height: '36px', borderRadius: '8px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    color: '#FAFBF7',
                    fontSize: '20px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  scrappy
                </span>
                <span
                  style={{
                    color: '#7B958B',
                    fontSize: '9px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: '4px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  Turn surplus into opportunity
                </span>
              </div>
            </Link>

            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-close-btn"
              style={{
                display: 'none',
                color: '#FAFBF7',
                padding: '4px',
                borderRadius: '6px',
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Nav Links Section */}
          <div style={{ padding: '24px 16px 16px' }}>
            <span
              style={{
                display: 'block',
                padding: '0 12px 10px',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#7B958B',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Industrial Operations
            </span>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? '#B8E36A' : 'transparent',
                      color: isActive ? '#252D29' : '#E9E9E0',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#E9E9E0';
                      }
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '20px',
                        color: isActive ? '#252D29' : '#7B958B',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom: Cluster Alerts & Account Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Cluster Alerts pill */}
          <NotificationCenter inSidebar={true} />

          {/* User Profile & Sign Out Bar */}
          {isAuthenticated ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(184, 227, 106, 0.15)',
                    border: '1px solid rgba(184, 227, 106, 0.3)',
                    color: '#B8E36A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(user?.full_name)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span
                    style={{
                      color: '#FAFBF7',
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      lineHeight: 1.2,
                    }}
                  >
                    {user?.full_name || 'Enterprise User'}
                  </span>
                  <span
                    style={{
                      color: '#7B958B',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      marginTop: '2px',
                    }}
                  >
                    {company?.name || 'Verified Plant'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  color: '#7B958B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#7B958B';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                  logout
                </span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                to="/login"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FAFBF7',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: '#B8E36A',
                  color: '#252D29',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* ── Fixed Top Header Bar (header) ─────────────────────────── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '64px',
          backgroundColor: 'rgba(245, 245, 236, 0.94)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #E1E6DF',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          transition: 'left 0.25s ease',
        }}
        className="scrappy-top-header"
      >
        {/* Left: Mobile hamburger & Cluster Console breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="mobile-hamburger-btn"
            style={{
              display: 'none',
              padding: '6px',
              borderRadius: '6px',
              color: '#252D29',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              menu
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#142D25' }}>
              corporate_fare
            </span>
            <span style={{ fontWeight: 700, color: '#252D29' }}>Cluster Console</span>
            <span style={{ color: '#E1E6DF' }}>/</span>
            <span style={{ color: '#68756D', fontWeight: 500 }}>Western Industrial Hub</span>
          </div>

          <div
            className="header-cluster-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: '#EEEEE5',
              border: '1px solid #E1E6DF',
              fontSize: '11px',
              fontWeight: 600,
              color: '#252D29',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#142D25',
              }}
            />
            <span>MSME Cluster: Active</span>
          </div>
        </div>

        {/* Right: Search & Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            className="header-search-box"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                fontSize: '18px',
                color: '#68756D',
                pointerEvents: 'none',
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search scrap lots, grades, trades..."
              style={{
                padding: '6px 14px 6px 34px',
                width: '260px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E1E6DF',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#252D29',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  navigate(`/marketplace?search=${encodeURIComponent(e.target.value)}`);
                }
              }}
            />
          </div>

          <Link
            to="/profile"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#142D25',
              color: '#FAFBF7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            title="My Profile"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              person
            </span>
          </Link>
        </div>
      </header>
    </>
  );
};

export default Navbar;
