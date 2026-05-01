@extends('layouts.admin')

@section('content')
<div class="header">
    <h1 class="page-title">Geofencing & Settings</h1>
</div>

<div class="dashboard-content" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
    <div class="form-card">
        <h3>Classroom Geofence Configuration</h3>
        <p class="text-muted" style="margin-bottom: 1.5rem;">Define the GPS boundaries (4 points) for each classroom.</p>
        
        <form id="geofenceForm" onsubmit="saveGeofence(event)">
            <div class="form-group">
                <label>Select Classroom</label>
                <select id="room_select" onchange="loadRoomData()"></select>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label>Point A Latitude</label>
                    <input type="number" step="any" id="lat_a" required>
                </div>
                <div class="form-group">
                    <label>Point A Longitude</label>
                    <input type="number" step="any" id="lon_a" required>
                </div>
                <!-- Points B, C, D simplified for UI, but backend takes all 4 -->
                <div class="form-group">
                    <label>Point B Latitude</label>
                    <input type="number" step="any" id="lat_b" required>
                </div>
                <div class="form-group">
                    <label>Point B Longitude</label>
                    <input type="number" step="any" id="lon_b" required>
                </div>
                <div class="form-group">
                    <label>Point C Latitude</label>
                    <input type="number" step="any" id="lat_c" required>
                </div>
                <div class="form-group">
                    <label>Point C Longitude</label>
                    <input type="number" step="any" id="lon_c" required>
                </div>
                <div class="form-group">
                    <label>Point D Latitude</label>
                    <input type="number" step="any" id="lat_d" required>
                </div>
                <div class="form-group">
                    <label>Point D Longitude</label>
                    <input type="number" step="any" id="lon_d" required>
                </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Update Geofence</button>
        </form>
    </div>

    <div class="form-card">
        <h3>System Status</h3>
        <div style="margin-top: 1.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                <span>Backend Connection</span>
                <span class="badge badge-present">Active</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                <span>Database Sync</span>
                <span class="badge badge-present">Synced</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>System Version</span>
                <span class="text-muted">v2.1.0-FOC</span>
            </div>
        </div>
        
        <div style="margin-top: 3rem;">
            <h3>Security</h3>
            <p class="text-muted">Session timeout: 120 minutes</p>
            <button class="btn btn-secondary" style="margin-top: 1rem; width: 100%;">Clear System Cache</button>
        </div>
    </div>
</div>

@push('scripts')
<script>
    let classrooms = [];

    async function loadClassrooms() {
        const res = await apiCall('get_all_classrooms');
        if (res.status === 'success') {
            classrooms = res.classrooms;
            const select = document.getElementById('room_select');
            select.innerHTML = '';
            classrooms.forEach(r => select.add(new Option(r.room_name, r.room_name)));
            loadRoomData();
        }
    }

    function loadRoomData() {
        const roomName = document.getElementById('room_select').value;
        const room = classrooms.find(r => r.room_name === roomName);
        if (room) {
            document.getElementById('lat_a').value = room.lat_a;
            document.getElementById('lon_a').value = room.lon_a;
            document.getElementById('lat_b').value = room.lat_b;
            document.getElementById('lon_b').value = room.lon_b;
            document.getElementById('lat_c').value = room.lat_c;
            document.getElementById('lon_c').value = room.lon_c;
            document.getElementById('lat_d').value = room.lat_d;
            document.getElementById('lon_d').value = room.lon_d;
        }
    }

    async function saveGeofence(e) {
        e.preventDefault();
        const data = {
            room_name: document.getElementById('room_select').value,
            lat_a: document.getElementById('lat_a').value,
            lon_a: document.getElementById('lon_a').value,
            lat_b: document.getElementById('lat_b').value,
            lon_b: document.getElementById('lon_b').value,
            lat_c: document.getElementById('lat_c').value,
            lon_c: document.getElementById('lon_c').value,
            lat_d: document.getElementById('lat_d').value,
            lon_d: document.getElementById('lon_d').value
        };

        const res = await apiCall('update_geofence', data);
        if (res.status === 'success') {
            alert("Geofence updated successfully!");
        } else {
            alert("Error: " + res.message);
        }
    }

    loadClassrooms();
</script>
@endpush
@endsection
