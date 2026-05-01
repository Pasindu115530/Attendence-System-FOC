@extends('layouts.admin')

@section('content')
<div class="header">
    <h1 class="page-title">Attendance Reports</h1>
    <button class="btn btn-primary" onclick="window.print()">
        <i class="fas fa-print"></i> Export PDF
    </button>
</div>

<div class="form-card" style="margin-bottom: 2rem;">
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
        <div class="form-group">
            <label>Department</label>
            <select id="deptSelect" onchange="loadCourses()"></select>
        </div>
        <div class="form-group">
            <label>Batch</label>
            <select id="batchSelect"></select>
        </div>
        <div class="form-group">
            <label>Course</label>
            <select id="courseSelect"></select>
        </div>
        <div class="form-group" style="display: flex; align-items: flex-end;">
            <button class="btn btn-primary" style="width: 100%" onclick="generateReport()">Generate Report</button>
        </div>
    </div>
</div>

<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Sessions</th>
                <th>Attended</th>
                <th>Percentage</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody id="report-results">
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    Select filters and click "Generate Report"
                </td>
            </tr>
        </tbody>
    </table>
</div>

@push('scripts')
<script>
    async function loadFilters() {
        const depts = await apiCall('get_departments');
        const batches = await apiCall('get_batches');

        if (depts.status === 'success') {
            const select = document.getElementById('deptSelect');
            depts.departments.forEach(d => select.add(new Option(d.dept_id, d.dept_id)));
            loadCourses(); // Initial load
        }

        if (batches.status === 'success') {
            const select = document.getElementById('batchSelect');
            batches.batches.forEach(b => select.add(new Option(b.batch_year, b.batch_year)));
        }
    }

    async function loadCourses() {
        const dept_id = document.getElementById('deptSelect').value;
        const res = await apiCall('get_courses', { dept_id });
        if (res.status === 'success') {
            const select = document.getElementById('courseSelect');
            select.innerHTML = '';
            res.courses.forEach(c => select.add(new Option(c.course_name, c.id)));
        }
    }

    async function generateReport() {
        const data = {
            dept_id: document.getElementById('deptSelect').value,
            batch: document.getElementById('batchSelect').value,
            course_id: document.getElementById('courseSelect').value
        };

        const res = await apiCall('get_filtered_report', data);
        if (res.status === 'success') {
            const tbody = document.getElementById('report-results');
            tbody.innerHTML = '';
            
            res.report.forEach(row => {
                const tr = document.createElement('tr');
                const percent = parseFloat(row.percentage);
                const statusClass = percent >= 75 ? 'badge-present' : 'badge-absent';
                
                tr.innerHTML = `
                    <td>${row.user_id}</td>
                    <td>${row.full_name}</td>
                    <td>${row.total_sessions}</td>
                    <td>${row.attended_count}</td>
                    <td><strong>${row.percentage}</strong></td>
                    <td><span class="badge ${statusClass}">${percent >= 75 ? 'Eligible' : 'Low Attendance'}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    loadFilters();
</script>
@endpush
@endsection
