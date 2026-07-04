'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiPost } from '@/lib/api';

export default function SettingsPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Geofence form state
  const [selectedRoomName, setSelectedRoomName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [seatCount, setSeatCount] = useState(0);
  const [isNewRoom, setIsNewRoom] = useState(false);

  const [latA, setLatA] = useState('');
  const [lonA, setLonA] = useState('');
  const [latB, setLatB] = useState('');
  const [lonB, setLonB] = useState('');
  const [latC, setLatC] = useState('');
  const [lonC, setLonC] = useState('');
  const [latD, setLatD] = useState('');
  const [lonD, setLonD] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchClassrooms = async () => {
    setLoading(true);
    const res = await apiPost('get_all_classrooms');
    if (res.status === 'success') {
      const rooms = res.data?.classrooms ?? [];
      setClassrooms(rooms);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleRoomSelect = (roomName) => {
    setSelectedRoomName(roomName);
    setIsNewRoom(false);
    setNewRoomName('');
    const room = classrooms.find(r => r.room_name === roomName);
    if (room) {
      setLatA(room.lat_a ?? '');
      setLonA(room.lon_a ?? '');
      setLatB(room.lat_b ?? '');
      setLonB(room.lon_b ?? '');
      setLatC(room.lat_c ?? '');
      setLonC(room.lon_c ?? '');
      setLatD(room.lat_d ?? '');
      setLonD(room.lon_d ?? '');
      setSeatCount(room.seat_count ?? 0);
    }
  };

  const handleNewRoomSetup = () => {
    setIsNewRoom(true);
    setSelectedRoomName('');
    setNewRoomName('');
    setLatA('');
    setLonA('');
    setLatB('');
    setLonB('');
    setLatC('');
    setLonC('');
    setLatD('');
    setLonD('');
    setSeatCount(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const targetRoomName = isNewRoom ? newRoomName.trim() : selectedRoomName;
    if (!targetRoomName) {
      setError('Please specify a classroom name.');
      return;
    }

    if (
      latA === '' || lonA === '' ||
      latB === '' || lonB === '' ||
      latC === '' || lonC === '' ||
      latD === '' || lonD === ''
    ) {
      setError('All 8 geofence coordinate fields are required.');
      return;
    }

    setSubmitting(true);
    const res = await apiPost('update_geofence', {
      room_name: targetRoomName,
      seat_count: parseInt(seatCount) || 0,
      lat_a: parseFloat(latA),
      lon_a: parseFloat(lonA),
      lat_b: parseFloat(latB),
      lon_b: parseFloat(lonB),
      lat_c: parseFloat(latC),
      lon_c: parseFloat(lonC),
      lat_d: parseFloat(latD),
      lon_d: parseFloat(lonD)
    });
    setSubmitting(false);

    if (res.status === 'success') {
      setSuccessMsg(`Geofence for ${targetRoomName} updated successfully!`);
      fetchClassrooms();
      if (isNewRoom) {
        setIsNewRoom(false);
        setSelectedRoomName(targetRoomName);
      }
    } else {
      setError(res.message || 'Failed to update geofence.');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Geofence Settings</h1>
          <p className="page-subtitle">Configure 4-point polygon boundaries for classroom validation</p>
        </div>
      </div>

      <div className="card-grid card-grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Card: Classroom List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="card-title" style={{ margin: 0 }}>🏫 Classrooms</div>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleNewRoomSetup}>
              + Add Room
            </button>
          </div>

          <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {loading ? (
              <div className="loading-overlay"><div className="spinner" /> Loading classrooms…</div>
            ) : classrooms.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏫</div>
                <h3>No classrooms found</h3>
                <p>Click '+ Add Room' to create one</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Classroom Name</th>
                    <th>Seats</th>
                    <th>Geofence Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map(room => {
                    const hasGeofence = room.lat_a !== null && room.lon_a !== null;
                    return (
                      <tr key={room.id} style={{ background: selectedRoomName === room.room_name ? 'var(--surface-hover)' : 'transparent' }}>
                        <td style={{ fontWeight: 600 }}>{room.room_name}</td>
                        <td>{room.seat_count}</td>
                        <td>
                          <span className={`badge ${hasGeofence ? 'badge-live' : 'badge-warning'}`}>
                            {hasGeofence ? 'Active Geofence' : 'No Geofence'}
                          </span>
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleRoomSelect(room.room_name)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Card: Geofence Editor */}
        <div className="card">
          <div className="card-title">📐 Geofence Boundary Editor</div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}

          {!selectedRoomName && !isNewRoom ? (
            <div className="empty-state">
              <div className="empty-state-icon">📐</div>
              <h3>Select a classroom</h3>
              <p>Select a classroom on the left, or click '+ Add Room' to begin editing its boundaries.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Classroom Name</label>
                  {isNewRoom ? (
                    <input
                      type="text"
                      placeholder="e.g. Lab 01"
                      value={newRoomName}
                      onChange={e => setNewRoomName(e.target.value)}
                      required
                    />
                  ) : (
                    <input type="text" value={selectedRoomName} disabled style={{ background: 'var(--surface-2)' }} />
                  )}
                </div>

                <div className="form-group">
                  <label>Seat Count</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={seatCount}
                    onChange={e => setSeatCount(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Coordinates Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', fontSize: '0.9rem' }}>
                  Polygon Coordinates (4 Corners)
                </h4>
                
                {/* Point A */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Corner A Latitude</label>
                    <input type="number" step="any" placeholder="e.g. 6.90123" value={latA} onChange={e => setLatA(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Corner A Longitude</label>
                    <input type="number" step="any" placeholder="e.g. 79.86123" value={lonA} onChange={e => setLonA(e.target.value)} required />
                  </div>
                </div>

                {/* Point B */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Corner B Latitude</label>
                    <input type="number" step="any" placeholder="e.g. 6.90150" value={latB} onChange={e => setLatB(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Corner B Longitude</label>
                    <input type="number" step="any" placeholder="e.g. 79.86123" value={lonB} onChange={e => setLonB(e.target.value)} required />
                  </div>
                </div>

                {/* Point C */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Corner C Latitude</label>
                    <input type="number" step="any" placeholder="e.g. 6.90150" value={latC} onChange={e => setLatC(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Corner C Longitude</label>
                    <input type="number" step="any" placeholder="e.g. 79.86150" value={lonC} onChange={e => setLonC(e.target.value)} required />
                  </div>
                </div>

                {/* Point D */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Corner D Latitude</label>
                    <input type="number" step="any" placeholder="e.g. 6.90123" value={latD} onChange={e => setLatD(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Corner D Longitude</label>
                    <input type="number" step="any" placeholder="e.g. 79.86150" value={lonD} onChange={e => setLonD(e.target.value)} required />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Saving coordinates...</> : '💾 Save Geofence Coordinates'}
              </button>
            </form>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
