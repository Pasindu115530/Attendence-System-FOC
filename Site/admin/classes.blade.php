@extends('layouts.admin')

@section('content')
<div class="header">
    <h1 class="page-title">Course Management</h1>
    <button class="btn btn-primary" onclick="alert('Add Course feature: Please use the Backend/index.php API.')">
        <i class="fas fa-plus"></i> Add New Course
    </button>
</div>

<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Course ID</th>
                <th>Course Name</th>
                <th>Description</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="course-list">
            <!-- Dynamic content -->
        </tbody>
    </table>
</div>

@push('scripts')
<script>
    async function loadCourses() {
        const res = await apiCall('get_all_courses');
        if (res.status === 'success') {
            const tbody = document.getElementById('course-list');
            tbody.innerHTML = '';
            res.courses.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${c.id}</strong></td>
                    <td>${c.course_name}</td>
                    <td>${c.description || 'N/A'}</td>
                    <td>
                        <button class="btn btn-secondary"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    loadCourses();
</script>
@endpush
@endsection
