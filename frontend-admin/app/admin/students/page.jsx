'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { apiPost } from '@/lib/api';

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPost('get_all_students').then(res => {
      if (res.status === 'success') {
        const list = res.data?.students ?? [];
        setStudents(list);
        setFiltered(list);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(students.filter(s =>
      (!q || s.full_name?.toLowerCase().includes(q) || s.user_id?.toLowerCase().includes(q) || s.nic?.toLowerCase().includes(q)) &&
      (!deptFilter || s.dept_id === deptFilter)
    ));
  }, [search, deptFilter, students]);

  const depts = [...new Set(students.map(s => s.dept_id).filter(Boolean))];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="page-subtitle">{filtered.length} of {students.length} students shown</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search by name, ID or NIC…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎓</div>
            <h3>No students found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>NIC</th>
                <th>Department</th>
                <th>Batch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.user_id}>
                  <td className="td-id">{s.user_id}</td>
                  <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.nic}</td>
                  <td><span className="badge badge-live">{s.dept_id}</span></td>
                  <td>{s.batch_year}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-sm btn-secondary btn-icon"
                        title="View Reports"
                        onClick={() => router.push(`/admin/reports?student_id=${s.user_id}`)}
                      >📊</button>
                      <button
                        className="btn btn-sm btn-primary btn-icon"
                        title="Register Face"
                        onClick={() => router.push(`/admin/face-register?student_id=${s.user_id}`)}
                      >🛡️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
