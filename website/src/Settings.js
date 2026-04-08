import React from 'react';
import Navbar from './Navbar';

const Settings = ({ user, onLogout }) => {
  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div style={styles.page}>
        <h2>Settings</h2>
        <p>Backup schedule and restore options HERE</p>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: '24px', backgroundColor: '#f4f7f6', minHeight: '100vh' }
};

export default Settings;