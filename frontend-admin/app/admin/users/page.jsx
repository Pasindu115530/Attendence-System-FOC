'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { apiPost } from '@/lib/api';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPost('get_all_users').then(res => {
      if (res.status === 'success') {
        const list = res.data?.users ?? [];
        setUsers(list);
        setFiltered(list);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(s =>
      (!q || s.full_name?.toLowerCase().includes(q) || s.user_id?.toLowerCase().includes(q) || s.nic?.toLowerCase().includes(q)) &&
      (!deptFilter || s.department_id === deptFilter)
    ));
  }, [search, deptFilter, users]);

  const depts = [...new Set(users.map(s => s.department_id).filter(Boolean))];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{filtered.length} of {users.length} users shown</p>
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
          <div className="loading-overlay"><div className="spinner" /> Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Role</th>
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
                  <td>
                    <span className={`badge ${s.role === 'Admin' ? 'badge-live' : s.role === 'Lecturer' ? 'badge-warning' : ''}`}>
                      {s.role}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.nic}</td>
                  <td><span className="badge badge-live">{s.department_id}</span></td>
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
                        onClick={() => router.push(`/admin/face-register?user_id=${s.user_id}`)}
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
