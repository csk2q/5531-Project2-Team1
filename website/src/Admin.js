import React from 'react';
import Navbar from './Navbar';

const Admin = ({ user, onLogout }) => {
  if (user?.role !== 'admin') {
    return <p style={{ padding: '24px' }}>Access denied.</p>;
  }

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div style={styles.page}>
        <h2>User Management</h2>
        <p>User list and account controls HERE</p>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: '24px', backgroundColor: '#f4f7f6', minHeight: '100vh' }
};

export default Admin;