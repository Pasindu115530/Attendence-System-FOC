@extends('layouts.admin')

@section('content')
<div class="header">
    <h1 class="page-title">Weekly Timetable</h1>
    <button class="btn btn-primary" onclick="toggleAddForm()">
        <i class="fas fa-calendar-plus"></i> Add Entry
    </button>
</div>

<div id="add-form-container" class="form-card" style="display: none; margin-bottom: 2rem;">
    <h3>Add Timetable Entry</h3>
    <form id="timetableForm" onsubmit="saveTimetable(event)" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
        <div class="form-group">
            <label>Course</label>
            <select id="course_id" required></select>
        </div>
        <div class="form-group">
            <label>Classroom</label>
            <select id="classroom_id" required></select>
        </div>
        <div class="form-group">
            <label>Day of Week</label>
            <select id="day_of_week" required>
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
                <option>Saturday</option>
                <option>Sunday</option>
            </select>
        </div>
        <div class="form-group">
            <label>Department</label>
            <input type="text" id="dept_id" placeholder="e.g. CS" required>
        </div>
        <div class="form-group">
            <label>Start Time</label>
            <input type="time" id="start_time" required>
        </div>
        <div class="form-group">
            <label>End Time</label>
            <input type="time" id="end_time" required>
        </div>
        <div style="grid-column: span 2; display: flex; gap: 1rem; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" onclick="toggleAddForm()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Entry</button>
        </div>
    </form>
</div>

<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Day</th>
                <th>Time</th>
                <th>Course</th>
                <th>Room</th>
                <th>Dept</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="timetable-list">
            <!-- Dynamic content -->
        </tbody>
    </table>
</div>

@push('scripts')
<script>
    async function init() {
        await loadTimetable();
        await loadDropdowns();
    }

    async function loadTimetable() {
        const res = await apiCall('get_admin_dashboard'); // Reusing this to get today's or all? 
        // Actually Backend/index.php case 'get_admin_dashboard' only returns TODAY'S.
        // Let's assume we want all or we just show today for now.
        if (res.status === 'success') {
            const tbody = document.getElementById('timetable-list');
            tbody.innerHTML = '';
            res.lectures.forEach(l => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${l.day_of_week}</td>
                    <td>${l.start_time} - ${l.end_time}</td>
                    <td>${l.course_name}</td>
                    <td>${l.room_name}</td>
                    <td>${l.dept_id}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteEntry('${l.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    async function loadDropdowns() {
        const courses = await apiCall('get_all_courses');
        const rooms = await apiCall('get_all_classrooms');

        if (courses.status === 'success') {
            const select = document.getElementById('course_id');
            courses.courses.forEach(c => {
                const opt = new Option(c.course_name, c.id);
                select.add(opt);
            });
        }

        if (rooms.status === 'success') {
            const select = document.getElementById('classroom_id');
            rooms.classrooms.forEach(r => {
                const opt = new Option(r.room_name, r.id);
                select.add(opt);
            });
        }
    }

    function toggleAddForm() {
        const container = document.getElementById('add-form-container');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }

    async function saveTimetable(e) {
        e.preventDefault();
        const data = {
            course_id: document.getElementById('course_id').value,
            classroom_id: document.getElementById('classroom_id').value,
            day_of_week: document.getElementById('day_of_week').value,
            start_time: document.getElementById('start_time').value,
            end_time: document.getElementById('end_time').value,
            dept_id: document.getElementById('dept_id').value
        };

        const res = await apiCall('add_timetable', data);
        if (res.status === 'success') {
            alert("Timetable entry added!");
            toggleAddForm();
            loadTimetable();
        } else {
            alert("Error: " + res.message);
        }
    }

    init();
</script>
@endpush
@endsection
