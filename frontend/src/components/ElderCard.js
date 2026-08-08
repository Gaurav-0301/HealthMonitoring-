import React from 'react';

function ElderCard({ elder }) {
  const statusColor = {
    active: 'green',
    alert_triggered: 'red',
    resolved: 'orange'
  };

  return (
    <div className="elder-card" style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
      <img src={elder.photoUrl || '/default-avatar.png'} alt={elder.name} width="50" height="50" style={{ borderRadius: '50%' }} />
      <h3>{elder.name}</h3>
      <p>Age: {elder.age}</p>
      <p style={{ color: statusColor[elder.status] || 'gray' }}>
        Status: {elder.status}
      </p>
      <p>{elder.address}</p>
    </div>
  );
}

export default ElderCard;
