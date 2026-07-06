'use client';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js';
import AdminLayout from '@/components/AdminLayout';
import { apiPost } from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function DashboardPage() {
  const [lectures, setLectures] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    async function load() {
      const [dashRes, studRes, coursesRes] = await Promise.all([
        apiPost('get_admin_dashboard'),
        apiPost('get_all_students'),
        apiPost('get_all_courses'),
      ]);
      if (dashRes.status === 'success') setLectures(dashRes.data?.lectures ?? []);
      if (studRes.status === 'success') setStudentCount(studRes.data?.students?.length ?? 0);
      if (coursesRes.status === 'success') setCourseCount(coursesRes.data?.courses?.length ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  const liveLectures = lectures.filter(l => l.isLive);

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      label: 'Attendance %',
      data: [85, 92, 78, 88, 95],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.08)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointRadius: 5,
    }],
  };
  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1 } },
    scales: {
      y: { beginAtZero: false, min: 60, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', callback: v => v + '%' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
    },
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">{today}</p>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total Students', value: loading ? '…' : studentCount, icon: '🎓', bg: 'rgba(99,102,241,0.1)', change: 'Enrolled', cls: '' },
          { label: 'Live Lectures', value: loading ? '…' : liveLectures.length, icon: '📡', bg: 'rgba(16,185,129,0.1)', change: 'Running now', cls: 'positive' },
          { label: 'Active Courses', value: loading ? '…' : courseCount, icon: '📚', bg: 'rgba(245,158,11,0.1)', change: 'This semester', cls: '' },
          { label: "Today's Sessions", value: loading ? '…' : lectures.length, icon: '📅', bg: 'rgba(239,68,68,0.1)', change: 'Scheduled today', cls: '' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.cls}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div className="card-grid card-grid-2" style={{ gap: '1.5rem' }}>
        <div className="card">
          <div className="card-title">📈 Attendance Trends (This Week)</div>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="card">
          <div className="card-title">📡 Today's Lectures</div>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /> Loading...</div>
          ) : lectures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <h3>No lectures today</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lectures.map((l, i) => {
                const isLive = liveLectures.includes(l);
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: isLive ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{l.course_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {l.room_name} · {l.start_time?.substring(0,5)} – {l.end_time?.substring(0,5)}
                      </div>
                    </div>
                    <span className={`badge ${isLive ? 'badge-live badge-dot' : 'badge-warning'}`}>
                      {isLive ? 'Live' : 'Scheduled'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
