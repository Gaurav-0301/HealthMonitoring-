import React, { useEffect, useState } from 'react';
import api from '../services/api';
import ElderCard from '../components/ElderCard';

function Dashboard() {
  const [elders, setElders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElders();
  }, []);

  const fetchElders = async () => {
    try {
      const res = await api.get('/elder-profile');
      setElders(res.data);
    } catch (err) {
      console.log('couldnt load elders', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>loading...</p>;

  return (
    <div className="dashboard">
      <h2>Your Family Dashboard</h2>
      {elders.length === 0 && <p>no elder profiles added yet, add one to get started</p>}
      {elders.map((elder) => (
        <ElderCard key={elder._id} elder={elder} />
      ))}
    </div>
  );
}

export default Dashboard;
