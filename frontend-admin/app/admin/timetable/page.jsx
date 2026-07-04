'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiPost } from '@/lib/api';

export default function TimetablePage() {
  const [timetable, setTimetable] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [courseId, setCourseId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTimetable = async () => {
    setLoading(true);
    const res = await apiPost('get_all_timetable');
    if (res.status === 'success') {
      setTimetable(res.data?.timetable ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function loadData() {
      await fetchTimetable();
      const [coursesRes, classroomsRes] = await Promise.all([
        apiPost('get_all_courses'),
        apiPost('get_all_classrooms')
      ]);
      if (coursesRes.status === 'success') setCourses(coursesRes.data?.courses ?? []);
      if (classroomsRes.status === 'success') setClassrooms(classroomsRes.data?.classrooms ?? []);
    }
    loadData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!courseId || !classroomId || !dayOfWeek || !startTime || !endTime) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    const res = await apiPost('add_timetable', {
      course_id: parseInt(courseId),
      classroom_id: parseInt(classroomId),
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime
    });
    setSubmitting(false);

    if (res.status === 'success') {
      setSuccessMsg('Timetable slot added successfully!');
      // Reset form (except dept and day to make batch additions easier)
      setStartTime('');
      setEndTime('');
      setCourseId('');
      setClassroomId('');
      fetchTimetable();
    } else {
      setError(res.message || 'Failed to add timetable slot.');
    }
  };

  const handleDelete = async (slotId) => {
    if (!confirm('Are you sure you want to delete this slot?')) return;
    const res = await apiPost('delete_timetable', { slot_id: slotId });
    if (res.status === 'success') {
      fetchTimetable();
    } else {
      alert(res.message || 'Failed to delete slot.');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable Management</h1>
          <p className="page-subtitle">Schedule lectures and assign classrooms</p>
        </div>
      </div>

      <div className="card-grid card-grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Side: Add Entry Form */}
        <div className="card">
          <div className="card-title">📅 Add Timetable Slot</div>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}

          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Course</label>
              <select value={courseId} onChange={e => setCourseId(e.target.value)} required>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Classroom</label>
              <select value={classroomId} onChange={e => setClassroomId(e.target.value)} required>
                <option value="">Select Classroom</option>
                {classrooms.map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
              </select>
            </div>

            <div className="card-grid card-grid-2" style={{ gap: '1rem', padding: 0 }}>
              <div className="form-group" style={{ visibility: 'hidden' }}>
                <label>Department</label>
                <input type="text" />
              </div>

              <div className="form-group">
                <label>Day of Week</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} required>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card-grid card-grid-2" style={{ gap: '1rem', padding: 0 }}>
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? <><span className="spinner" /> Saving...</> : '+ Save Slot'}
            </button>
          </form>
        </div>

        {/* Right Side: Timetable List */}
        <div className="card">
          <div className="card-title">🗓️ Scheduled Slots</div>
          <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {loading ? (
              <div className="loading-overlay"><div className="spinner" /> Loading timetable…</div>
            ) : timetable.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3>No slots scheduled</h3>
                <p>Add a slot on the left to get started</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Day/Time</th>
                    <th>Course & Venue</th>
                    <th>Dept</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {timetable.map(slot => (
                    <tr key={slot.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{slot.day_of_week}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{slot.course_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>📍 {slot.room_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-live">{slot.department_id}</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary btn-icon"
                          style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                          title="Delete"
                          onClick={() => handleDelete(slot.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
