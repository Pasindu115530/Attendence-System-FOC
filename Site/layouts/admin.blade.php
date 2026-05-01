<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Attendance System</title>
    <link rel="stylesheet" href="../css/admin_layout.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <nav class="sidebar">
        <div class="logo">
            <div class="logo-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <span>FOC Admin</span>
        </div>
        
        <ul class="nav-links">
            <li class="nav-item">
                <a href="dashboard.blade.php" class="nav-link {{ request()->is('admin/dashboard*') ? 'active' : '' }}">
                    <i class="fas fa-th-large"></i>
                    <span>Dashboard</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="students.blade.php" class="nav-link {{ request()->is('admin/students*') ? 'active' : '' }}">
                    <i class="fas fa-user-graduate"></i>
                    <span>Students</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="classes.blade.php" class="nav-link {{ request()->is('admin/classes*') ? 'active' : '' }}">
                    <i class="fas fa-book"></i>
                    <span>Courses</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="timetable.blade.php" class="nav-link {{ request()->is('admin/timetable*') ? 'active' : '' }}">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Timetable</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="reports.blade.php" class="nav-link {{ request()->is('admin/reports*') ? 'active' : '' }}">
                    <i class="fas fa-chart-line"></i>
                    <span>Reports</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="settings.blade.php" class="nav-link {{ request()->is('admin/settings*') ? 'active' : '' }}">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </a>
            </li>
        </ul>

        <div class="nav-footer">
            <a href="../logout.php" class="nav-link">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </a>
        </div>
    </nav>

    <main class="main-content">
        @yield('content')
    </main>

    <script>
        // Global logic for fetching data
        const API_URL = '../../Backend/index.php';

        async function apiCall(action, data = {}) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, ...data })
                });
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
                return { status: 'error', message: 'Network error' };
            }
        }
    </script>
    @stack('scripts')
</body>
</html>
