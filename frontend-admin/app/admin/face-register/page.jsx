'use client';
import { useEffect, useState, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { apiPost, apiMultipart } from '@/lib/api';

export default function FaceRegisterPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);

  // Mode: 'upload' or 'camera'
  const [mode, setMode] = useState('camera');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Camera Refs and State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);

  // Form submitting state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Fetch students list
    apiPost('get_all_students').then(res => {
      if (res.status === 'success') {
        const list = res.data?.students ?? [];
        setStudents(list);

        // Check if student_id is passed in the URL query string
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const studentId = params.get('student_id');
          if (studentId && list.some(s => s.user_id === studentId)) {
            setSelectedStudentId(studentId);
          }
        }
      }
      setLoading(false);
    });

    return () => {
      stopCamera();
    };
  }, []);

  // Watch for mode changes to handle camera stream
  useEffect(() => {
    if (mode === 'camera' && selectedStudentId) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [mode, selectedStudentId]);

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check camera permissions or upload an image instead.');
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(blob => {
      setCapturedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const resetCapture = () => {
    setCapturedBlob(null);
    setPreviewUrl(null);
    if (mode === 'camera') {
      startCamera();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedStudentId) {
      setError('Please select a student.');
      return;
    }

    let fileToSend = null;
    if (mode === 'camera') {
      if (!capturedBlob) {
        setError('Please capture a photo first.');
        return;
      }
      fileToSend = new File([capturedBlob], 'capture.jpg', { type: 'image/jpeg' });
    } else {
      if (!imageFile) {
        setError('Please choose an image file to upload.');
        return;
      }
      fileToSend = imageFile;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('user_id', selectedStudentId);
    formData.append('image', fileToSend);

    const res = await apiMultipart('register-face', formData);
    setSubmitting(false);

    if (res.status === 'success') {
      setSuccessMsg(`Face registered successfully for student ${selectedStudentId}!`);
      // Reset
      setImageFile(null);
      setCapturedBlob(null);
      setPreviewUrl(null);
      if (mode === 'camera') {
        startCamera();
      }
    } else {
      setError(res.message || 'Face registration failed. Please ensure exactly one clear face is visible in the photo.');
    }
  };

  const selectedStudent = students.find(s => s.user_id === selectedStudentId);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Face Registration</h1>
          <p className="page-subtitle">Register student face signatures into the AWS Rekognition collection</p>
        </div>
      </div>

      <div className="card-grid card-grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Card: Select Student & Method */}
        <div className="card">
          <div className="card-title">👤 Select Student & Input Method</div>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Student</label>
            {loading ? (
              <select disabled><option>Loading students list...</option></select>
            ) : (
              <select 
                value={selectedStudentId} 
                onChange={e => {
                  setSelectedStudentId(e.target.value);
                  setPreviewUrl(null);
                  setCapturedBlob(null);
                  setImageFile(null);
                }}
              >
                <option value="">Select a student...</option>
                {students.map(s => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name} ({s.user_id}) - {s.dept_id}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedStudentId && selectedStudent && (
            <div className="card" style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full Name</span>
                <span style={{ fontWeight: 600 }}>{selectedStudent.full_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>NIC</span>
                <span style={{ fontFamily: 'monospace' }}>{selectedStudent.nic}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Department</span>
                <span className="badge badge-live">{selectedStudent.dept_id}</span>
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Capture Method</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                type="button"
                className={`btn btn-block ${mode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setMode('camera'); setPreviewUrl(null); setCapturedBlob(null); }}
                disabled={!selectedStudentId}
              >
                📷 Live Webcam
              </button>
              <button 
                type="button"
                className={`btn btn-block ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setMode('upload'); setPreviewUrl(null); setCapturedBlob(null); }}
                disabled={!selectedStudentId}
              >
                📁 Upload Photo
              </button>
            </div>
          </div>

          {selectedStudentId && (
            <button 
              onClick={handleSubmit} 
              className="btn btn-primary btn-block" 
              style={{ padding: '1rem' }}
              disabled={submitting || (mode === 'camera' && !capturedBlob) || (mode === 'upload' && !imageFile)}
            >
              {submitting ? <><span className="spinner" /> Uploading & Processing...</> : '🛡️ Complete Face Registration'}
            </button>
          )}
        </div>

        {/* Right Card: Camera Preview or Upload Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px' }}>
          <div className="card-title" style={{ width: '100%' }}>🖼️ Photo Preview & Verification</div>
          
          {error && <div className="alert alert-error" style={{ width: '100%', marginBottom: '1rem' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ width: '100%', marginBottom: '1rem' }}>{successMsg}</div>}

          {!selectedStudentId ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <h3>Select a student</h3>
              <p>Please select a student on the left to start face registration</p>
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              {mode === 'camera' && (
                <div style={{ position: 'relative', width: '100%', maxWidth: '480px', aspectRatio: '4/3', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {/* Camera view */}
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: previewUrl ? 'none' : 'block' }}
                  />
                  {/* Captured Static Preview */}
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Captured Face Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}

                  {!previewUrl && cameraActive && (
                    <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)' }}>
                      <button type="button" className="btn btn-primary" onClick={capturePhoto} style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}>
                        📸 Capture Photo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === 'upload' && (
                <div style={{ width: '100%', maxWidth: '480px' }}>
                  {previewUrl ? (
                    <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img 
                        src={previewUrl} 
                        alt="Uploaded Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div 
                      style={{ 
                        border: '2px dashed var(--border)', 
                        borderRadius: 'var(--radius-md)', 
                        padding: '3rem 1.5rem', 
                        textAlign: 'center', 
                        background: 'rgba(255,255,255,0.01)', 
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      onClick={() => document.getElementById('fileInput').click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          setImageFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📁</div>
                      <h4>Drag & drop student photo here</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>or click to browse from files (JPEG, PNG allowed)</p>
                      <input 
                        type="file" 
                        id="fileInput" 
                        accept="image/jpeg, image/png" 
                        style={{ display: 'none' }} 
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </div>
              )}

              {previewUrl && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetCapture}>
                  🔄 Take/Upload Another
                </button>
              )}
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>
    </AdminLayout>
  );
}
