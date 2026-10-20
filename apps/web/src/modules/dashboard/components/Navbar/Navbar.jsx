import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { MdOutlineMeetingRoom, MdMenu, MdClose } from 'react-icons/md';

import { FaUser, FaHeart, FaBell, FaChevronDown, FaTrophy, FaBuilding } from 'react-icons/fa';

import { IoStatsChart, IoSettings, IoLogOut } from 'react-icons/io5';

import NavbarInfo from '../../components/NavbarInfo/NavbarInfo';
import NotificationPanel from '../../../notifications/components/NotificationPanel';
import { useAuth } from '../../../../context/useAuth';

import logo from '../../../../shared/assets/EduAirControlLogo.png';

import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isAdmin: isAdminUser, isSuperAdmin, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const dropdownRef = useRef(null);
  const dropdownMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const clickedProfile = dropdownRef.current?.contains(e.target);
      const clickedDropdown = dropdownMenuRef.current?.contains(e.target);
      if (!clickedProfile && !clickedDropdown) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    if (!dropdownOpen) return undefined;

    const updateDropdownPosition = () => {
      if (!dropdownRef.current) return;

      const rect = dropdownRef.current.getBoundingClientRect();
      const position = {
        top: rect.top + 62,
        left: Math.max(8, Math.min(rect.right - 240, window.innerWidth - 248)),
      };

      setDropdownPosition((current) =>
        current.top === position.top && current.left === position.left ? current : position
      );
    };

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [dropdownOpen]);

  const userRole = (user?.role || 'USER').toLowerCase();
  const isAdmin = isAdminUser;

  const menuItems = [
    {
      icon: <FaTrophy />,
      label: 'Dashboard',
      path: '/dashboard',
    },
    {
      icon: <MdOutlineMeetingRoom />,
      label: t('nav.activity'),
      path: '/all-environments',
    },
    {
      icon: <FaHeart />,
      label: t('nav.favorites'),
      path: '/favorites',
    },
    ...(isAdmin
      ? [
          {
            icon: <FaUser />,
            label: t('nav.management'),
            path: '/management',
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            icon: <FaBuilding />,
            label: t('nav.institutions', 'Instituciones'),
            path: '/admin/institutions',
          },
        ]
      : []),
  ];

  const isProfileActive = location.pathname === '/profile' || location.pathname === '/settings';

  const go = (path) => {
    navigate(path);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <nav className="dashboard-navbar">
        {/* IZQUIERDA */}
        <div className="dashboard-navbar-left">
          <div className="dashboard-navbar-logo" onClick={() => go('/dashboard')}>
            <img src={logo} alt="EduAirControl" />
            <div className="dashboard-navbar-logo-text">
              <h2>EduAirControl</h2>
              <span>Smart Air Monitoring</span>
            </div>
          </div>
          <NavbarInfo role={userRole} />
        </div>

        {/* MENÚ DESKTOP */}
        <div className="dashboard-navbar-menu">
          {menuItems.map((item) => (
            <div
              key={item.path}
              className={`dashboard-navbar-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => go(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* DERECHA (ACCIONES) */}
        <div className="dashboard-navbar-actions">
          {/* 1. NOTIFICACIONES */}
          <div
            className="dashboard-navbar-item dashboard-notification-bell"
            onClick={() => setNotificationsOpen(true)}
          >
            <FaBell />
          </div>
          {/* 2. PERFIL (dropdown) */}
          <div ref={dropdownRef} className="dashboard-navbar-profile">
            <div
              className={`dashboard-navbar-item ${isProfileActive ? 'active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <FaUser />
              <span>{t('nav.profile')}</span>
              <FaChevronDown
                className={`dashboard-profile-chevron ${dropdownOpen ? 'open' : ''}`}
              />
            </div>

          </div>{' '}
          {/* CORREGIDO: Cierre correcto del perfil */}
          {/* 3. BOTÓN HAMBURGUESA */}
          <button
            className="dashboard-mobile-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <MdClose /> : <MdMenu />}
          </button>
        </div>
      </nav>

      {dropdownOpen &&
        createPortal(
          <div
            ref={dropdownMenuRef}
            className="dashboard-profile-dropdown"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            <div className="dashboard-profile-dropdown-item" onClick={() => go('/profile')}>
              <FaUser />
              <span>{t('nav.profile')}</span>
            </div>

            <div className="dashboard-profile-dropdown-item" onClick={() => go('/settings')}>
              <IoSettings />
              <span>{t('nav.settings')}</span>
            </div>

            <div className="dashboard-profile-dropdown-divider" />

            <div className="dashboard-profile-dropdown-item logout" onClick={handleLogout}>
              <IoLogOut />
              <span>{t('nav.logout')}</span>
            </div>
          </div>,
          document.body
        )}

      {/* MENÚ MÓVIL (SIDEBAR LATERAL) */}
      <div className={`dashboard-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="dashboard-mobile-header">Menú</div>

        {menuItems.map((item) => (
          <div key={item.path} className="dashboard-mobile-item" onClick={() => go(item.path)}>
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}

        <div className="dashboard-mobile-divider" />

        <div className="dashboard-mobile-item" onClick={() => go('/profile')}>
          <FaUser />
          <span>{t('nav.profile')}</span>
        </div>

        <div className="dashboard-mobile-item" onClick={() => go('/settings')}>
          <IoSettings />
          <span>{t('nav.settings')}</span>
        </div>

        <div className="dashboard-mobile-item logout" onClick={handleLogout}>
          <IoLogOut />
          <span>{t('nav.logout')}</span>
        </div>
      </div>

      <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}

export default Navbar;
