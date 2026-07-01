'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiPost, apiMultipart, BASE_URL } from '@/lib/api';

export default function ReportsPage() {
  // Filter states
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Report results state
  const [reportList, setReportList] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Medical upload state
  const [searchStudentId, setSearchStudentId] = useState('');
  const [absentRecords, setAbsentRecords] = useState([]);
  const [loadingAbsent, setLoadingAbsent] = useState(false);
  const [uploadingRecordId, setUploadingRecordId] = useState(null);

  useEffect(() => {
    async function loadFilters() {
      const [deptRes, batchRes] = await Promise.all([
        apiPost('get_departments'),
        apiPost('get_batches'),
      ]);
      if (deptRes.status === 'success') setDepartments(deptRes.data?.departments ?? []);
      if (batchRes.status === 'success') setBatches(batchRes.data?.batches ?? []);
    }
    loadFilters();

    // Check if student_id is passed in the URL to pre-load medical reports
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const studentId = params.get('student_id');
      if (studentId) {
        setSearchStudentId(studentId);
        loadAbsentRecords(studentId);
      }
    }
  }, []);

  // Fetch courses whenever department is changed
  useEffect(() => {
    setCourses([]);
    setSelectedCourse('');
    apiPost('get_courses', { dept_id: selectedDept }).then(res => {
      if (res.status === 'success') setCourses(res.data?.courses ?? []);
    });
  }, [selectedDept]);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedDept || !selectedBatch || !selectedCourse) {
      setErrorMsg('Please select Department, Batch, and Course.');
      return;
    }
    setLoadingReport(true);
    const res = await apiPost('get_filtered_report', {
      dept_id: selectedDept,
      batch: parseInt(selectedBatch),
      course_id: parseInt(selectedCourse)
    });
    setLoadingReport(false);
    if (res.status === 'success') {
      setReportList(res.data?.report ?? []);
    } else {
      setErrorMsg(res.message || 'Failed to fetch report.');
    }
  };

  const loadAbsentRecords = async (studentId) => {
    if (!studentId.trim()) return;
    setLoadingAbsent(true);
    const res = await apiPost('get_absent_records', { student_id: studentId.trim() });
    setLoadingAbsent(false);
    if (res.status === 'success') {
      setAbsentRecords(res.data?.records ?? []);
    } else {
      setAbsentRecords([]);
    }
  };

  const handleAbsentSearchSubmit = (e) => {
    e.preventDefault();
    loadAbsentRecords(searchStudentId);
  };

  const handleMedicalUpload = async (e, recordId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingRecordId(recordId);
    const formData = new FormData();
    formData.append('record_id', recordId);
    formData.append('medical_file', file);

    const res = await apiMultipart('upload_medical', formData);
    setUploadingRecordId(null);

    if (res.status === 'success') {
      alert('Medical report uploaded successfully!');
      loadAbsentRecords(searchStudentId);
    } else {
      alert(res.message || 'Upload failed.');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Medical Documents</h1>
          <p className="page-subtitle">Generate attendance statistics and verify medical submissions</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Row 1: Attendance Report Generator */}
        <div className="card">
          <div className="card-title">📊 Generate Attendance Report</div>
          
          <form onSubmit={handleGenerateReport} className="filter-row" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Department</label>
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} required>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_id}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Batch Year</label>
              <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} required>
                <option value="">Select Batch</option>
                {batches.map(b => <option key={b.batch_year} value={b.batch_year}>{b.batch_year}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Course</label>
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} required disabled={!selectedDept}>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '46px', alignSelf: 'flex-end' }}>
              Generate Report
            </button>
          </form>

          {errorMsg && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

          {/* Results Table */}
          <div className="table-container">
            {loadingReport ? (
              <div className="loading-overlay"><div className="spinner" /> Generating report…</div>
            ) : reportList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No report data generated</h3>
                <p>Select the filters above and click 'Generate Report'</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Attended Sessions</th>
                    <th>Total Sessions</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportList.map(r => (
                    <tr key={r.user_id}>
                      <td className="td-id">{r.user_id}</td>
                      <td style={{ fontWeight: 500 }}>{r.full_name}</td>
                      <td>{r.attended_count}</td>
                      <td>{r.total_sessions}</td>
                      <td style={{ fontWeight: 600, color: parseInt(r.percentage) >= 75 ? 'var(--accent)' : 'var(--danger)' }}>
                        {r.percentage}
                      </td>
                      <td>
                        <span className={`badge ${parseInt(r.percentage) >= 75 ? 'badge-live' : 'badge-warning'}`}>
                          {parseInt(r.percentage) >= 75 ? 'Eligible' : 'Low Attendance'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Row 2: Medical Certificate Management */}
        <div className="card">
          <div className="card-title">📁 Medical Certificate Upload & Verification</div>
          
          <form onSubmit={handleAbsentSearchSubmit} className="filter-row" style={{ maxWidth: '500px', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Enter Student ID (e.g. S001)"
              value={searchStudentId}
              onChange={e => setSearchStudentId(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-secondary">
              Search Absent Records
            </button>
          </form>

          <div className="table-container">
            {loadingAbsent ? (
              <div className="loading-overlay"><div className="spinner" /> Loading records…</div>
            ) : absentRecords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <h3>No attendance / absent records</h3>
                <p>Search a valid student ID to upload or verify medical reports</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Course Name</th>
                    <th>Medical Report Status</th>
                    <th>Upload File</th>
                  </tr>
                </thead>
                <tbody>
                  {absentRecords.map(rec => {
                    const hasReport = !!rec.medical_report;
                    // Format path to link: if it's absolute or relative, match backend structure.
                    // The upload path is stored in the database.
                    const filename = rec.medical_report?.split(/[\\/]/).pop();
                    const fileUrl = `${BASE_URL}/uploads/${filename}`;

                    return (
                      <tr key={rec.id}>
                        <td>{rec.date}</td>
                        <td style={{ fontWeight: 500 }}>{rec.course_name}</td>
                        <td>
                          {hasReport ? (
                            <a 
                              href={fileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent)', textDecoration: 'underline' }}
                            >
                              <span>📄 Verified Medical</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Pending Submission</span>
                          )}
                        </td>
                        <td>
                          {uploadingRecordId === rec.id ? (
                            <div className="spinner" />
                          ) : (
                            <div style={{ position: 'relative' }}>
                              <button type="button" className="btn btn-sm btn-secondary">
                                {hasReport ? 'Replace File' : 'Upload Medical'}
                              </button>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  opacity: 0,
                                  width: '100%',
                                  height: '100%',
                                  cursor: 'pointer'
                                }}
                                onChange={(e) => handleMedicalUpload(e, rec.id)}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
