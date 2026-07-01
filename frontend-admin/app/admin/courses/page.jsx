'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiPost } from '@/lib/api';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPost('get_all_courses').then(res => {
      if (res.status === 'success') {
        const list = res.data?.courses ?? [];
        setCourses(list);
        setFiltered(list);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(courses.filter(c =>
      !q || c.course_name?.toLowerCase().includes(q) || String(c.id).includes(q)
    ));
  }, [search, courses]);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Course Management</h1>
          <p className="page-subtitle">{filtered.length} of {courses.length} courses listed</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search by course name or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> Loading courses…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No courses found</h3>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Course ID</th>
                <th>Course Name</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td className="td-id">#{c.id}</td>
                  <td style={{ fontWeight: 500 }}>{c.course_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
