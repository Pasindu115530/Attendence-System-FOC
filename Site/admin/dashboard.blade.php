@extends('layouts.admin')

@section('content')
<div class="header">
    <h1 class="page-title">Dashboard Overview</h1>
    <div class="user-profile">
        <span id="current-date"></span>
    </div>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-label">Total Students</div>
        <div class="stat-value" id="total-students">0</div>
        <div class="stat-change positive">+12% from last month</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Attendance Rate</div>
        <div class="stat-value" id="attendance-rate">0%</div>
        <div class="stat-change positive">Today's Avg</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Active Courses</div>
        <div class="stat-value" id="total-courses">0</div>
        <div class="stat-change">Currently Running</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Flagged Records</div>
        <div class="stat-value" id="flagged-records">0</div>
        <div class="stat-change negative">Low attendance</div>
    </div>
</div>

<div class="dashboard-content" style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
    <div class="chart-container form-card">
        <h3>Attendance Trends</h3>
        <canvas id="attendanceChart" height="200"></canvas>
    </div>
    
    <div class="recent-activity form-card">
        <h3>Live Lectures</h3>
        <div id="live-lectures-list" style="margin-top: 1.5rem;">
            <!-- Dynamic content -->
            <p class="text-muted">Loading live status...</p>
        </div>
    </div>
</div>

@push('scripts')
<script>
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    async function loadDashboardData() {
        const res = await apiCall('get_admin_dashboard');
        if (res.status === 'success') {
            const list = document.getElementById('live-lectures-list');
            list.innerHTML = '';
            
            if (res.lectures && res.lectures.length > 0) {
                res.lectures.forEach(lec => {
                    const item = document.createElement('div');
                    item.className = 'nav-link';
                    item.style.marginBottom = '1rem';
                    item.innerHTML = `
                        <div style="flex: 1">
                            <div style="font-weight: 600">${lec.course_name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted)">${lec.room_name} | ${lec.start_time} - ${lec.end_time}</div>
                        </div>
                        <span class="badge badge-present">Live</span>
                    `;
                    list.appendChild(item);
                });
                document.getElementById('total-courses').textContent = res.lectures.length;
            } else {
                list.innerHTML = '<p class="text-muted">No lectures scheduled for today.</p>';
            }
        }

        // Fetch students count
        const studentsRes = await apiCall('get_all_students');
        if (studentsRes.status === 'success') {
            document.getElementById('total-students').textContent = studentsRes.students.length;
        }
    }

    // Initialize Chart
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                label: 'Attendance %',
                data: [85, 92, 78, 88, 95],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    loadDashboardData();
</script>
@endpush
@endsection
