import React from 'react';
import Navbar from './Navbar';

const Monitoring = ({ user, onLogout }) => {
  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div style={styles.page}>
        <h2>System Monitoring</h2>
        <p>CPU and disk usage HERE</p>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: '24px', backgroundColor: '#f4f7f6', minHeight: '100vh' }
};

export default Monitoring;