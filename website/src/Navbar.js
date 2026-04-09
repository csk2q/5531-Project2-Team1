import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  const navLink = (label, path) => (
    <span
      onClick={() => navigate(path)}
      style={{
        ...styles.link,
        borderBottom: location.pathname === path ? '2px solid #3498db' : '2px solid transparent',
        color: location.pathname === path ? '#2c3e50' : '#7f8c8d',
      }}
    >
      {label}
    </span>
  );

  return (
    <nav style={styles.navbar}>
      <span style={styles.brand}>NAS Control Center</span>
      <div style={styles.links}>
        {navLink('Files', '/dashboard')}
        {navLink('Monitoring', '/monitoring')}
        {navLink('Settings', '/settings')}
        {user?.role === 'admin' && navLink('User Mgmt', '/admin')}
      </div>
      <div style={{ position: 'relative' }}>
        <div
          style={styles.avatar}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        {showDropdown && (
          <div style={styles.dropdown}>
            <p style={styles.dropdownName}>{user?.name}</p>
            <p style={styles.dropdownRole}>{user?.role}</p>
            <hr />
            <button onClick={onLogout} style={styles.dropdownLogout}>Log out</button>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: { display: 'flex', alignItems: 'center', padding: '0 24px', height: '52px',
    background: 'white', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 100 },
  brand: { fontWeight: '700', fontSize: '16px', color: '#2c3e50', marginRight: 'auto' },
  links: { display: 'flex', gap: '4px', marginRight: '16px' },
  link: { padding: '0 12px', height: '52px', display: 'flex', alignItems: 'center',
    cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all .15s' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#3498db',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  dropdown: { position: 'absolute', right: 0, top: '40px', background: 'white',
    border: '1px solid #ddd', borderRadius: '8px', padding: '12px', minWidth: '150px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 200 },
  dropdownName: { margin: '0 0 2px', fontWeight: 'bold', fontSize: '14px' },
  dropdownRole: { margin: '0 0 8px', fontSize: '12px', color: '#7f8c8d' },
  dropdownLogout: { width: '100%', padding: '7px', background: 'none', border: '1px solid #ddd',
    borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
};

export default Navbar;