@extends('layouts.admin')

@section('content')
<div class="header">
    <h1 class="page-title">Student Management</h1>
    <button class="btn btn-primary" onclick="openAddModal()">
        <i class="fas fa-plus"></i> Add New Student
    </button>
</div>

<div class="form-card" style="margin-bottom: 2rem;">
    <div style="display: flex; gap: 1rem;">
        <input type="text" id="studentSearch" placeholder="Search by name, ID or NIC..." onkeyup="filterStudents()">
        <select id="deptFilter" onchange="filterStudents()">
            <option value="">All Departments</option>
            <option value="CS">Computer Science</option>
            <option value="IT">Information Technology</option>
            <option value="SE">Software Engineering</option>
        </select>
    </div>
</div>

<div class="table-container">
    <table id="studentsTable">
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
        <tbody id="student-list">
            <!-- Dynamic students -->
        </tbody>
    </table>
</div>

@push('scripts')
<script>
    let students = [];

    async function loadStudents() {
        const res = await apiCall('get_all_students');
        if (res.status === 'success') {
            students = res.students;
            renderStudents(students);
        }
    }

    function renderStudents(data) {
        const tbody = document.getElementById('student-list');
        tbody.innerHTML = '';
        
        data.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.user_id}</strong></td>
                <td>${s.full_name}</td>
                <td>${s.nic}</td>
                <td>${s.dept_id}</td>
                <td>${s.batch_year}</td>
                <td>
                    <button class="btn btn-secondary" onclick="viewAttendance('${s.user_id}')" title="View Attendance">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteStudent('${s.user_id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function filterStudents() {
        const query = document.getElementById('studentSearch').value.toLowerCase();
        const dept = document.getElementById('deptFilter').value;
        
        const filtered = students.filter(s => {
            const matchesQuery = s.full_name.toLowerCase().includes(query) || 
                               s.user_id.toLowerCase().includes(query) ||
                               s.nic.toLowerCase().includes(query);
            const matchesDept = !dept || s.dept_id === dept;
            return matchesQuery && matchesDept;
        });
        
        renderStudents(filtered);
    }

    function openAddModal() {
        alert("Add Student feature: Please use the Backend/index.php 'add_student' action. (UI implementation for modal pending)");
    }

    loadStudents();
</script>
@endpush
@endsection
