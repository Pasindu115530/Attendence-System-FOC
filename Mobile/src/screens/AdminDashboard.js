import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post, upload, uploadFile } from '../api';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get('window');

export default function AdminDashboard({ navigation }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lecture detail modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [detailStudents, setDetailStudents] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Login request states
  const [loginRequests, setLoginRequests] = useState([]);
  const [currentActionsView, setCurrentActionsView] = useState('menu'); // 'menu' or 'requests'
  const [pendingApprovalRequestId, setPendingApprovalRequestId] = useState(null);

  // Tab State: 'home', 'search', 'settings'
  const [activeTab, setActiveTab] = useState('home');

  // Add Student states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStudentId, setFormStudentId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formRegNo, setFormRegNo] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formBatchYear, setFormBatchYear] = useState('');

  // Add Lecturer states
  const [isLecturerModalOpen, setIsLecturerModalOpen] = useState(false);
  const [formLecturerId, setFormLecturerId] = useState('');
  const [formLecturerName, setFormLecturerName] = useState('');
  const [formLecturerEmail, setFormLecturerEmail] = useState('');
  const [formLecturerNic, setFormLecturerNic] = useState('');
  const [formLecturerRegNo, setFormLecturerRegNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [confirmConfig, setConfirmConfig] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ visible: true, title, message, onConfirm });
  };

  // Custom Logout Confirmation Modal State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Academic Reports Tab states
  const [reportFilters, setReportFilters] = useState({ dept_id: '', batch: '', course_id: '' });
  const [reportResults, setReportResults] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportBatches, setReportBatches] = useState([]);
  const [reportCourses, setReportCourses] = useState([]);
  const [reportCourseSearchQuery, setReportCourseSearchQuery] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Tab Bar animated value
  const tabNames = ['home', 'actions', 'search', 'settings'];
  const getIndexFromTab = (tab) => tabNames.indexOf(tab);
  const animatedTabValue = useRef(new Animated.Value(getIndexFromTab('home'))).current;

  // Face Camera States
  const [isFaceOverlayOpen, setIsFaceOverlayOpen] = useState(false);
  const [overlayMode, setOverlayMode] = useState(''); // 'register' or 'reset'
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  const handleOpenFaceRegister = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setOverlayMode('register');
      setIsFaceOverlayOpen(true);
    } else {
      showAlert("Permission Denied", "Camera permission is required.", 'error');
    }
  };

  const handleOpenFaceReset = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setOverlayMode('reset');
      setIsFaceOverlayOpen(true);
    } else {
      showAlert("Permission Denied", "Camera permission is required.", 'error');
    }
  };

  const captureFace = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (!cameraRef.current) {
        setIsProcessing(false);
        return;
      }
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.1 });
      const localUri = photo.uri;
      const filename = localUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      formData.append('image', {
        uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
        name: filename || 'capture.jpg',
        type,
      });

      if (overlayMode === 'register') {
        const res = await upload('/register-face', formData);
        if (res.status === 'success') {
          setIsFaceOverlayOpen(false);
          showAlert("Success", "Admin Face registered successfully!", 'success');
        } else {
          showAlert("Failed", res.message || "Failed to register face.", 'error');
        }
      } else if (overlayMode === 'reset') {
        const faceRes = await upload('/verify-face', formData);
        if (faceRes.status === "success" && faceRes.data?.role === 'Admin') {
          setIsFaceOverlayOpen(false);
          showConfirm(
            "Reset Semester Data",
            "Identity verified! Are you absolutely sure you want to permanently delete ALL batch subject assignments, timetables, and student attendance records?",
            async () => {
              try {
                const res = await post('/reset_semester', {});
                if (res.status === 'success') {
                  fetchAdminData();
                  showAlert("Success", "Semester data has been wiped.", 'success');
                } else {
                  showAlert("Error", res.message || "Failed to reset", 'error');
                }
              } catch (err) {
                showAlert("Error", "Could not connect to the server.", 'error');
              }
            }
          );
        } else {
          showAlert("Verification Failed", "Could not verify your identity as an Admin.", 'error');
        }
      }
    } catch (error) {
      console.error(error);
      showAlert("Error", "An error occurred with the camera.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await post('/get_departments', {});
      if (res.status === 'success') {
        setDepartments(res.data.departments || []);
        if (res.data.departments?.length > 0 && !formDeptId) {
          setFormDeptId(res.data.departments[0].id.toString());
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchReportOptions = async () => {
    try {
      const batchRes = await post('/get_batches', {});
      if (batchRes.status === 'success') {
        setReportBatches(batchRes.data.batches || []);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchReportCourses = async (deptId) => {
    try {
      const res = await post('/get_courses', { dept_id: deptId });
      if (res.status === 'success') {
        setReportCourses(res.data.courses || []);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchFilteredReport = async () => {
    if (!reportFilters.dept_id || !reportFilters.course_id || !reportFilters.batch) {
      showAlert("Error", "Please select Department, Batch and Course", 'error');
      return;
    }
    setReportLoading(true);
    setReportResults([]);
    try {
      const res = await post('/get_filtered_report', reportFilters);
      if (res.status === 'success') {
        setReportResults(res.data.report || []);
        if (res.data.report?.length === 0) {
          showAlert("Notice", "No records found for the selected filters.", 'error');
        }
      } else {
        showAlert("Notice", res.message || "No records found", 'error');
      }
    } catch (e) {
      showAlert("Error", "Failed to fetch report.", 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const handleUploadExcel = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true
      });
      if (res.canceled) return;
      const file = res.assets[0];
      
      setUploadingExcel(true);
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        name: file.name,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const uploadRes = await upload('/upload_students', formData);
      if (uploadRes.status === 'success') {
        setIsModalOpen(false);
        fetchAdminData();
        showAlert("Success", uploadRes.message, 'success');
      } else {
        showAlert("Error", uploadRes.message || "Failed to upload file", 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "An error occurred during file upload", 'error');
    } finally {
      setUploadingExcel(false);
    }
  };

  const generateStudentId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormStudentId(`S${randomNum}`);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormNic(result);
  };

  const closeAddStudentModal = () => {
    setIsModalOpen(false);
    setFormStudentId('');
    setFormFullName('');
    setFormEmail('');
    setFormNic('');
    setFormRegNo('');
    setFormDeptId('');
    setFormBatchYear('');
    setPendingApprovalRequestId(null);
  };

  const closeAddLecturerModal = () => {
    setIsLecturerModalOpen(false);
    setFormLecturerId('');
    setFormLecturerName('');
    setFormLecturerEmail('');
    setFormLecturerNic('');
    setFormLecturerRegNo('');
    setPendingApprovalRequestId(null);
  };

  const handleAddLecturer = async () => {
    if (!formLecturerId.trim() || !formLecturerName.trim() || !formLecturerEmail.trim() || !formLecturerNic.trim() || !formLecturerRegNo.trim()) {
      showAlert("Error", "All fields (Lecturer ID, Name, Email, NIC, and Registration Number) are required", 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await post('/add_lecturer', {
        user_id: formLecturerId.trim(),
        full_name: formLecturerName.trim(),
        email: formLecturerEmail.trim(),
        nic: formLecturerNic.trim(),
        registration_number: formLecturerRegNo.trim()
      });

      if (res.status === 'success') {
        const approvedReqId = pendingApprovalRequestId;
        
        setIsLecturerModalOpen(false);
        setFormLecturerId('');
        setFormLecturerName('');
        setFormLecturerEmail('');
        setFormLecturerNic('');
        setFormLecturerRegNo('');
        setPendingApprovalRequestId(null);
        
        if (approvedReqId) {
          await handleRespondRequest(approvedReqId, 'Approved');
        } else {
          showAlert("Success", "Lecturer added successfully!", 'success');
        }
        fetchAdminData();
      } else {
        showAlert("Error", res.message || "Failed to add lecturer", 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert("Error", "Could not connect to the server.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStudent = async () => {
    if (!formStudentId.trim() || !formFullName.trim() || !formEmail.trim() || !formNic.trim() || !formRegNo.trim() || !formDeptId.trim() || !formBatchYear.trim()) {
      showAlert("Error", "All fields (Student ID, Full Name, Email, Registration Number, NIC, Department, and Batch Year) are required", 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await post('/add_student', {
        user_id: formStudentId.trim(),
        full_name: formFullName.trim(),
        email: formEmail.trim(),
        nic: formNic.trim(),
        registration_number: formRegNo.trim(),
        dept_id: formDeptId.trim(),
        batch_year: formBatchYear.trim() ? parseInt(formBatchYear.trim()) : null
      });

      if (res.status === 'success') {
        const approvedReqId = pendingApprovalRequestId;
        
        setIsModalOpen(false);
        setFormStudentId('');
        setFormFullName('');
        setFormEmail('');
        setFormNic('');
        setFormRegNo('');
        setFormDeptId('');
        setFormBatchYear('');
        setPendingApprovalRequestId(null);
        
        if (approvedReqId) {
          await handleRespondRequest(approvedReqId, 'Approved');
        } else {
          showAlert("Success", "Student added successfully!", 'success');
        }
        fetchAdminData();
      } else {
        showAlert("Error", res.message || "Failed to add student", 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert("Error", "Could not connect to the server.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLectureDetail = async (timetableId) => {
    setDetailLoading(true);
    setIsDetailModalOpen(true);
    setSelectedLecture(null);
    setDetailStudents([]);
    try {
      const res = await post('/get_lecture_attendance_detail', { timetable_id: timetableId });
      if (res.status === 'success') {
        setSelectedLecture(res.data.lecture);
        setDetailStudents(res.data.students);
      } else {
        showAlert("Error", res.message || "Failed to load details", 'error');
        setIsDetailModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Could not connect to the server.", 'error');
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchAdminData = useCallback(async () => {
    try {
      const [dashboardRes, requestsRes] = await Promise.all([
        post('/get_admin_dashboard', {}),
        post('/get_login_requests', {})
      ]);

      if (dashboardRes.status === 'success') {
        setLectures(dashboardRes.data.lectures);
      } else {
        setLectures([]);
      }

      if (requestsRes.status === 'success') {
        setLoginRequests(requestsRes.data.requests || []);
      } else {
        setLoginRequests([]);
      }
    } catch (error) {
      console.error("Fetch Error: ", error);
      showAlert("Error", "Could not connect to the server.", 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRespondRequest = async (requestId, action) => {
    try {
      const res = await post('/respond_login_request', { id: requestId, action: action });
      if (res.status === 'success') {
        showAlert("Success", `Request has been ${action.toLowerCase()} successfully!`, 'success');
        // Refresh requests list
        const requestsRes = await post('/get_login_requests', {});
        if (requestsRes.status === 'success') {
          setLoginRequests(requestsRes.data.requests || []);
        }
      } else {
        showAlert("Error", res.message || "Failed to update request", 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Could not connect to the server.", 'error');
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchDepartments();
    fetchReportOptions();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fetchAdminData]);

  useEffect(() => {
    Animated.spring(animatedTabValue, {
      toValue: getIndexFromTab(activeTab),
      useNativeDriver: true,
      bounciness: 6,
      speed: 10,
    }).start();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <MaterialCommunityIcons name="school-outline" size={48} color="#35A7C4" />
        </View>
        <Text style={{ marginTop: 16, color: '#7C8BA1', fontFamily: 'Outfit-SemiBold', fontSize: 15 }}>Loading Schedule...</Text>
      </View>
    );
  }

  const liveLectures = lectures.filter(l => l.isLive);

  const filteredCourses = reportCourses.filter(c => 
    c.course_name.toLowerCase().includes(reportCourseSearchQuery.toLowerCase())
  );

  // Interpolation for sliding bottom active indicator
  const navBarWidth = width - 40;
  const stepWidth = navBarWidth / 4;
  const translateX = animatedTabValue.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [
      0 * stepWidth + (stepWidth - 68) / 2,
      1 * stepWidth + (stepWidth - 68) / 2,
      2 * stepWidth + (stepWidth - 68) / 2,
      3 * stepWidth + (stepWidth - 68) / 2,
    ],
  });

  const circleScale = animatedTabValue.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    outputRange: [1, 0.82, 1, 0.82, 1, 0.82, 1],
  });

  const circleTranslateY = animatedTabValue.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    outputRange: [0, 12, 0, 12, 0, 12, 0],
  });

  const makeIconStyle = (index) => {
    const opacity = animatedTabValue.interpolate({
      inputRange: [index - 0.5, index, index + 0.5],
      outputRange: [1, 0, 1],
      extrapolate: 'clamp',
    });
    const scale = animatedTabValue.interpolate({
      inputRange: [index - 0.5, index, index + 0.5],
      outputRange: [1, 0.01, 1],
      extrapolate: 'clamp',
    });
    return {
      opacity,
      transform: [{ scale }],
    };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Header Container */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#F3F7FD', '#E5EDF9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.headerSplitOverlay}
        >
          {/* Top Bar (Badge and Notification) */}
          <View style={styles.headerTopBar}>
            <View>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>
                  {activeTab === 'home' ? 'Admin Panel' :
                   activeTab === 'actions' ? 'Quick Actions' :
                   activeTab === 'search' ? 'Academic Reports' : 'Admin Settings'}
                </Text>
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>FOC</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>Faculty of Computing</Text>
            </View>
            {activeTab === 'home' && (
              <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
                <MaterialCommunityIcons name="bell-outline" size={22} color="#35A7C4" />
                {liveLectures.length > 0 && <View style={styles.notifBadge} />}
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Bar (Only on Home) */}
          {activeTab === 'home' && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{lectures.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#35A7C4' }]}>{liveLectures.length}</Text>
                <Text style={styles.statLabel}>Live Now</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{Math.max(0, lectures.length - liveLectures.length)}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'home' ? (
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#35A7C4"
              colors={['#35A7C4']}
            />
          ) : null
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%' }}>
          
          {/* HOME TAB VIEW */}
          {activeTab === 'home' && (
            <>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              
              {lectures.length > 0 ? (
                lectures.map((item, index) => {
                  const isLive = liveLectures.includes(item);
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.lecCard, isLive && styles.lecCardLive]}
                      onPress={() => handleOpenLectureDetail(item.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.cardHeader}>
                        <View style={[styles.badge, { backgroundColor: isLive ? 'rgba(53, 167, 196, 0.12)' : '#ECF0F3' }]}>
                          <View style={[styles.dot, { backgroundColor: isLive ? '#35A7C4' : '#7C8BA1' }]} />
                          <Text style={[styles.badgeText, { color: isLive ? '#35A7C4' : '#7C8BA1' }]}>
                            {isLive ? 'LIVE' : 'SCHEDULED'}
                          </Text>
                        </View>
                        <Text style={styles.timeText}>
                          {item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}
                        </Text>
                      </View>
                      <Text style={styles.courseName}>{item.course_name}</Text>
                      <View style={styles.infoRow}>
                        <View style={styles.infoPill}>
                          <MaterialCommunityIcons name="map-marker-radius" size={14} color="#35A7C4" style={{ marginRight: 4 }} />
                          <Text style={styles.infoText}>{item.room_name}</Text>
                        </View>
                        {item.department_names ? (
                          <View style={styles.infoPill}>
                            <MaterialCommunityIcons name="domain" size={14} color="#35A7C4" style={{ marginRight: 4 }} />
                            <Text style={styles.infoText}>{item.department_names}</Text>
                          </View>
                        ) : null}
                        {item.batch_years ? (
                          <View style={styles.infoPill}>
                            <MaterialCommunityIcons name="account-group" size={14} color="#35A7C4" style={{ marginRight: 4 }} />
                            <Text style={styles.infoText}>Year {item.batch_years}</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBg}>
                    <MaterialCommunityIcons name="calendar-blank" size={48} color="#7C8BA1" />
                  </View>
                  <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
                </View>
              )}
            </>
          )}

          {/* ACTIONS TAB VIEW */}
          {activeTab === 'actions' && (
            <>
              {currentActionsView === 'menu' ? (
                <>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  
                  {/* Create Student */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => setIsModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="account-plus-outline" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Create Student</Text>
                      <Text style={styles.actionDesc}>Register a new student with login credentials</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Create Lecturer */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => setIsLecturerModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="account-tie-outline" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Create Lecturer</Text>
                      <Text style={styles.actionDesc}>Register a new lecturer with email credentials</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Assign Subjects */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('AssignSubjects')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="book-open-page-variant-outline" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Assign Subjects</Text>
                      <Text style={styles.actionDesc}>Assign subjects to batches per semester</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Assign Lecturers */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('AssignLecturers')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="human-male-board" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Assign Lecturers</Text>
                      <Text style={styles.actionDesc}>Assign subjects taught by lecturers</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* View Assignments */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('ViewAssignedSubjects')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="format-list-bulleted" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>View Assignments</Text>
                      <Text style={styles.actionDesc}>See all subjects assigned to batches</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Create Lecture */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('ManageTimetable')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="calendar-plus" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Create Lecture</Text>
                      <Text style={styles.actionDesc}>Schedule a new class session or lecture time</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Manage Timetable */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('ManageTimetable')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="calendar-clock" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Manage Timetable</Text>
                      <Text style={styles.actionDesc}>Assign classes and set lecture times</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Generate Timetable */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => {
                      showConfirm(
                        "Generate Timetable",
                        "This will DELETE the current timetable and automatically schedule all assigned subjects for the semester. Are you sure?",
                        async () => {
                          try {
                            const res = await post('/auto_schedule_timetable', {});
                            if (res.status === 'success') {
                              fetchAdminData();
                              showAlert('Success', res.message || 'Timetable generated successfully!', 'success');
                            } else {
                              showAlert('Error', res.message || 'Failed to generate timetable', 'error');
                            }
                          } catch(e) {
                            showAlert('Error', 'An error occurred while generating timetable', 'error');
                          }
                        }
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="magic-staff" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Generate Timetable</Text>
                      <Text style={styles.actionDesc}>Auto-schedule classes to avoid clashes</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Set Class Location */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('AddClassLocation')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="map-marker-path" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Set Class Location</Text>
                      <Text style={styles.actionDesc}>Define boundary points for geofencing</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>

                  {/* Admin Requests */}
                  <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => setCurrentActionsView('requests')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="clipboard-text-play-outline" size={26} color="#35A7C4" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.actionTitle}>Admin Requests</Text>
                      <Text style={styles.actionDesc}>Manage login & account requests (Done/Pending)</Text>
                    </View>
                    <View style={styles.chevronBg}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                /* FULL PAGE ADMIN REQUESTS VIEW */
                <>
                  <View style={styles.fullPageHeader}>
                    <TouchableOpacity 
                      style={styles.backBtn}
                      onPress={() => setCurrentActionsView('menu')}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="chevron-left" size={28} color="#35A7C4" />
                      <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.fullPageTitle}>Admin Requests</Text>
                    <View style={{ width: 60 }} />
                  </View>

                  <Text style={[styles.subtitleText, { marginBottom: 16 }]}>
                    Verify and process student/lecturer registration requests. Approving a student automatically passes their details to the Create Student registration flow.
                  </Text>

                  {loginRequests.length > 0 ? (
                    loginRequests.map((item, index) => {
                      const isDone = item.status === 'Done' || item.status === 'Approved' || item.status === 'Dismissed';
                      return (
                        <View key={`full_req_${item.id}`} style={[styles.requestCard, isDone && { opacity: 0.75, backgroundColor: '#E5EDF9' }]}>
                          <View style={styles.requestHeader}>
                            <View style={styles.requestUserGroup}>
                              <View style={[styles.requestRoleBadge, isDone && { backgroundColor: 'rgba(124, 139, 161, 0.12)' }]}>
                                <Text style={[styles.requestRoleText, isDone && { color: '#7C8BA1' }]}>{item.role.toUpperCase()}</Text>
                              </View>
                              <Text style={[styles.requestName, isDone && { textDecorationLine: 'line-through', color: '#7C8BA1' }]} numberOfLines={1}>{item.name}</Text>
                            </View>
                            <Text style={styles.requestDate}>{item.created_at?.substring(0, 10)}</Text>
                          </View>
                          
                          {/* Structured Details Grid */}
                          <View style={styles.requestDetailsGrid}>
                            <View style={styles.reqDetailItem}>
                              <Text style={styles.reqDetailLabel}>Email:</Text>
                              <Text style={[styles.reqDetailValue, isDone && { color: '#7C8BA1' }]}>{item.email}</Text>
                            </View>
                            {item.index_number ? (
                              <View style={styles.reqDetailItem}>
                                <Text style={styles.reqDetailLabel}>Index Number:</Text>
                                <Text style={[styles.reqDetailValue, isDone && { color: '#7C8BA1' }]}>{item.index_number}</Text>
                              </View>
                            ) : null}
                            {item.registration_number ? (
                              <View style={styles.reqDetailItem}>
                                <Text style={styles.reqDetailLabel}>Registration No:</Text>
                                <Text style={[styles.reqDetailValue, isDone && { color: '#7C8BA1' }]}>{item.registration_number}</Text>
                              </View>
                            ) : null}
                            {item.nic ? (
                              <View style={styles.reqDetailItem}>
                                <Text style={styles.reqDetailLabel}>NIC Number:</Text>
                                <Text style={[styles.reqDetailValue, isDone && { color: '#7C8BA1' }]}>{item.nic}</Text>
                              </View>
                            ) : null}
                            {item.role === 'Student' && item.department_name ? (
                              <View style={styles.reqDetailItem}>
                                <Text style={styles.reqDetailLabel}>Department:</Text>
                                <Text style={[styles.reqDetailValue, isDone && { color: '#7C8BA1' }]}>{item.department_name}</Text>
                              </View>
                            ) : null}
                            {item.role === 'Student' && item.batch_year ? (
                              <View style={styles.reqDetailItem}>
                                <Text style={styles.reqDetailLabel}>Batch Year:</Text>
                                <Text style={[styles.reqDetailValue, isDone && { color: '#7C8BA1' }]}>Batch {item.batch_year}</Text>
                              </View>
                            ) : null}
                          </View>

                          <View style={styles.requestMessageContainer}>
                            <Text style={styles.requestMessage}>{item.message}</Text>
                          </View>

                          <View style={styles.requestActionsRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 'auto' }}>
                              <View style={[styles.statusDot, { backgroundColor: isDone ? '#10B981' : '#F59E0B' }]} />
                              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 12, color: isDone ? '#10B981' : '#F59E0B', marginLeft: 4 }}>
                                {item.status}
                              </Text>
                            </View>

                            <TouchableOpacity 
                              style={[styles.requestBtn, styles.requestBtnDismiss, { marginRight: 8 }]}
                              onPress={() => handleRespondRequest(item.id, 'Dismissed')}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="close-circle-outline" size={16} color="#E11D48" style={{ marginRight: 4 }} />
                              <Text style={styles.requestBtnTextDismiss}>Dismiss</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[
                                styles.requestBtn, 
                                isDone ? styles.requestBtnPending : styles.requestBtnApprove
                              ]}
                              onPress={() => {
                                if (isDone) {
                                  handleRespondRequest(item.id, 'Pending');
                                } else {
                                  if (item.role === 'Student') {
                                    setFormFullName(item.name);
                                    setFormEmail(item.email || '');
                                    if (item.index_number) setFormStudentId(item.index_number);
                                    if (item.registration_number) setFormRegNo(item.registration_number);
                                    if (item.nic) setFormNic(item.nic);
                                    if (item.department_id) setFormDeptId(item.department_id.toString());
                                    if (item.batch_year) setFormBatchYear(item.batch_year.toString());
                                    setPendingApprovalRequestId(item.id);
                                    setIsModalOpen(true);
                                  } else {
                                    setFormLecturerName(item.name);
                                    setFormLecturerEmail(item.email || '');
                                    if (item.index_number) setFormLecturerId(item.index_number);
                                    if (item.nic) setFormLecturerNic(item.nic);
                                    setFormLecturerRegNo(item.registration_number || item.index_number || '');
                                    setPendingApprovalRequestId(item.id);
                                    setIsLecturerModalOpen(true);
                                  }
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons 
                                name={isDone ? "undo-variant" : "check-circle-outline"} 
                                size={16} 
                                color={isDone ? "#7C8BA1" : "#10B981"} 
                                style={{ marginRight: 4 }} 
                              />
                              <Text style={isDone ? styles.requestBtnTextPending : styles.requestBtnTextApprove}>
                                {isDone ? 'Mark Pending' : 'Approve'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconBg}>
                        <MaterialCommunityIcons name="check-decagram-outline" size={48} color="#7C8BA1" />
                      </View>
                      <Text style={styles.emptyText}>No requests found.</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* SEARCH/REPORTS TAB VIEW */}
          {activeTab === 'search' && (
            <View style={{ paddingHorizontal: 4 }}>
              {/* Reports Filter Card */}
              <View style={styles.formCard}>
                <View style={styles.filterHeader}>
                  <MaterialCommunityIcons name="filter-variant" size={20} color="#35A7C4" />
                  <Text style={styles.filterHeaderText}>Report Filters</Text>
                </View>

                {/* Department Selector */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Department</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                    {departments.map((item, index) => (
                      <TouchableOpacity 
                        key={item.id ? item.id.toString() : `dept_${index}`}
                        style={[styles.chip, reportFilters.dept_id === item.id && styles.chipSelected]}
                        onPress={() => {
                          setReportFilters({...reportFilters, dept_id: item.id, course_id: ''});
                          setReportCourseSearchQuery('');
                          fetchReportCourses(item.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, reportFilters.dept_id === item.id && styles.chipTextSelected]}>
                          {item.name || `Dept ${item.id}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Batch Selector */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Batch</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                    {reportBatches.map((item, index) => (
                      <TouchableOpacity 
                        key={item.batch_year ? item.batch_year.toString() : `batch_${index}`}
                        style={[styles.chip, reportFilters.batch === item.batch_year && styles.chipSelected]}
                        onPress={() => setReportFilters({...reportFilters, batch: item.batch_year})}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, reportFilters.batch === item.batch_year && styles.chipTextSelected]}>
                          {item.batch_year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Course Selector with Search */}
                <Text style={styles.label}>Select Course</Text>
                {reportCourses.length > 0 && (
                  <View style={styles.courseSearchContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#7C8BA1" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.courseSearchInput}
                      placeholder="Search course..."
                      placeholderTextColor="#7C8BA1"
                      value={reportCourseSearchQuery}
                      onChangeText={setReportCourseSearchQuery}
                    />
                  </View>
                )}
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                  {filteredCourses.length > 0 ? filteredCourses.map((item, index) => (
                    <TouchableOpacity 
                      key={item.course_id ? item.course_id.toString() : `course_${index}`}
                      style={[styles.chip, reportFilters.course_id === item.course_id && styles.chipSelected]}
                      onPress={() => setReportFilters({...reportFilters, course_id: item.course_id})}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, reportFilters.course_id === item.course_id && styles.chipTextSelected]}>
                        {item.course_name}
                      </Text>
                    </TouchableOpacity>
                  )) : (
                    <Text style={styles.hintText}>
                      {reportCourses.length > 0 ? "No courses matching query" : "Select Department to load courses"}
                    </Text>
                  )}
                </ScrollView>

                <View style={styles.submitBtnShadowContainer}>
                  <TouchableOpacity 
                    style={styles.submitBtn} 
                    onPress={fetchFilteredReport}
                    disabled={reportLoading}
                    activeOpacity={0.8}
                  >
                    {reportLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="file-chart-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.submitBtnText}>Generate Report</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Results List */}
              {reportResults.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>Students List</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{reportResults.length} Students</Text>
                    </View>
                  </View>
                  
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, { flex: 2, textAlign: 'left' }]}>Student Info</Text>
                    <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Status</Text>
                    <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Attendance</Text>
                  </View>

                  {reportResults.map((item, index) => (
                    <View key={item.user_id} style={styles.tableRow}>
                      <View style={styles.studentInfo}>
                        <View style={styles.idBadge}>
                          <Text style={styles.idBadgeText}>{item.user_id.substring(0, 2)}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.cellText}>{item.user_id}</Text>
                          <Text style={styles.subCellText}>{item.full_name}</Text>
                        </View>
                      </View>
                      <View style={styles.statusCol}>
                        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(53, 167, 196, 0.12)' : 'rgba(225, 29, 72, 0.12)' }]}>
                          <Text style={[styles.statusText, { color: item.status === 'Active' ? '#35A7C4' : '#E11D48' }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.percentageCol}>
                        <Text style={styles.percentageText}>{item.percentage}</Text>
                        <Text style={styles.percentageLabel}>Attendance</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {reportResults.length === 0 && !reportLoading && (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBg}>
                    <MaterialCommunityIcons name="file-search-outline" size={48} color="#7C8BA1" />
                  </View>
                  <Text style={styles.emptyTextTitle}>No Report Data</Text>
                  <Text style={styles.emptyTextSub}>Select filters above and click generate to view the report.</Text>
                </View>
              )}
            </View>
          )}

          {/* SETTINGS TAB VIEW */}
          {activeTab === 'settings' && (
            <View style={{ paddingHorizontal: 4 }}>
              <View style={styles.profileImageContainer}>
                <View style={styles.largeProfileCircle}>
                  <MaterialCommunityIcons name="account" size={72} color="#7C8BA1" />
                </View>
                <Text style={styles.profilePhotoLabel}>Administrator Settings</Text>
              </View>

              {/* Admin profile fields */}
              <View style={styles.profileForm}>
                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Role</Text>
                  <Text style={styles.profileFieldValue}>System Administrator</Text>
                </View>
                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Faculty</Text>
                  <Text style={styles.profileFieldValue}>Faculty of Computing (FOC)</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Security & Operations</Text>

              {/* Register Admin Face */}
              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={handleOpenFaceRegister}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="face-recognition" size={26} color="#35A7C4" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.actionTitle}>Register Admin Face</Text>
                  <Text style={styles.actionDesc}>Register your face for admin actions</Text>
                </View>
                <View style={styles.chevronBg}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                </View>
              </TouchableOpacity>

              {/* Reset Semester (Warning Action) */}
              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={handleOpenFaceReset}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, styles.warningIconCircle]}>
                  <MaterialCommunityIcons name="delete-alert-outline" size={26} color="#E11D48" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.actionTitle}>Reset Semester</Text>
                  <Text style={styles.actionDesc}>Requires facial verification (Destructive)</Text>
                </View>
                <View style={styles.chevronBg}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#E11D48" />
                </View>
              </TouchableOpacity>

              {/* Logout Action Button wrapper */}
              <View style={styles.logoutBtnContainer}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="logout" size={20} color="#E11D48" />
                  <Text style={styles.logoutText}>Logout from System</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Custom Logout Confirmation Modal */}
      <Modal
        visible={isLogoutModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsLogoutModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.logoutModalContent]}>
            <View style={styles.logoutIconWrapper}>
              <View style={styles.logoutIconOutline}>
                <View style={styles.logoutIconInner}>
                  <MaterialCommunityIcons name="logout-variant" size={32} color="#E11D48" />
                </View>
              </View>
            </View>
            
            <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            <Text style={styles.logoutModalMessage}>Do you want to log out of the Admin panel?</Text>
            
            <View style={styles.logoutActionRow}>
              <TouchableOpacity 
                style={styles.logoutCancelBtn} 
                onPress={() => setIsLogoutModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <View style={styles.logoutConfirmBtnShadow}>
                <TouchableOpacity 
                  style={styles.logoutConfirmBtn} 
                  onPress={() => {
                    setIsLogoutModalOpen(false);
                    navigation.replace('Login', { autoFaceLogin: false });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.logoutConfirmBtnText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Student Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddStudentModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalKeyboardContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Student</Text>
                <TouchableOpacity onPress={closeAddStudentModal} style={styles.modalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#7C8BA1" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Student Index Number *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. FC221000"
                      placeholderTextColor="#7C8BA1"
                      value={formStudentId}
                      onChangeText={setFormStudentId}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Amal Perera"
                      placeholderTextColor="#7C8BA1"
                      value={formFullName}
                      onChangeText={setFormFullName}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Student Email Address *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. student@gmail.com"
                      placeholderTextColor="#7C8BA1"
                      value={formEmail}
                      onChangeText={setFormEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Student Registration Number *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. FC115000"
                      placeholderTextColor="#7C8BA1"
                      value={formRegNo}
                      onChangeText={setFormRegNo}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>NIC (Password for Login) *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 200123456789"
                      placeholderTextColor="#7C8BA1"
                      value={formNic}
                      onChangeText={setFormNic}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Department</Text>
                  <View style={styles.pickerContainer}>
                    <MaterialCommunityIcons name="office-building" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <Picker
                      selectedValue={formDeptId}
                      onValueChange={(itemValue) => setFormDeptId(itemValue)}
                      style={{ flex: 1, color: '#2C3A4E' }}
                    >
                      <Picker.Item label="Select Department..." value="" />
                      {departments.map(dept => (
                        <Picker.Item key={dept.id} label={dept.name} value={dept.id.toString()} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Batch Year *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="calendar-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 2024"
                      placeholderTextColor="#7C8BA1"
                      value={formBatchYear}
                      onChangeText={setFormBatchYear}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {submitting || uploadingExcel ? (
                  <ActivityIndicator size="large" color="#35A7C4" style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    <View style={styles.submitBtnShadowContainer}>
                      <TouchableOpacity style={styles.submitBtn} onPress={handleAddStudent}>
                        <Text style={styles.submitBtnText}>Create Student</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.excelBtnShadowContainer}>
                      <TouchableOpacity 
                        style={styles.excelBtn} 
                        onPress={handleUploadExcel}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="microsoft-excel" size={20} color="#10B981" style={{ marginRight: 8 }} />
                        <Text style={styles.excelBtnText}>Bulk Upload via Excel</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Create Lecturer Modal */}
      <Modal
        visible={isLecturerModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddLecturerModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalKeyboardContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Lecturer</Text>
                <TouchableOpacity onPress={closeAddLecturerModal} style={styles.modalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#7C8BA1" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Lecturer ID *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. LEC001"
                      placeholderTextColor="#7C8BA1"
                      value={formLecturerId}
                      onChangeText={setFormLecturerId}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Dr. John Doe"
                      placeholderTextColor="#7C8BA1"
                      value={formLecturerName}
                      onChangeText={setFormLecturerName}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Lecturer Registration Number *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. REG-LEC001"
                      placeholderTextColor="#7C8BA1"
                      value={formLecturerRegNo}
                      onChangeText={setFormLecturerRegNo}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Lecturer Email Address *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. lecturer@gmail.com"
                      placeholderTextColor="#7C8BA1"
                      value={formLecturerEmail}
                      onChangeText={setFormLecturerEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>NIC (Password for Login) *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 198012345678"
                      placeholderTextColor="#7C8BA1"
                      value={formLecturerNic}
                      onChangeText={setFormLecturerNic}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleAddLecturer}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Lecturer Account</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Face Overlay Modal */}
      {isFaceOverlayOpen && (
        <View style={styles.faceOverlayContainer}>
          <View style={styles.faceOverlayHeader}>
            <TouchableOpacity onPress={() => setIsFaceOverlayOpen(false)} style={styles.closeOverlayBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={24} color="#7C8BA1" />
            </TouchableOpacity>
            <Text style={styles.faceOverlayTitle}>
              {overlayMode === 'register' ? 'Register Face' : 'Verify Identity'}
            </Text>
          </View>

          <View style={styles.faceCameraContainer}>
            <CameraView 
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="front"
            />
            
            <View style={styles.faceInstructionBox}>
              <MaterialCommunityIcons name="face-recognition" size={32} color="#35A7C4" />
              <Text style={styles.faceInstructionText}>
                {overlayMode === 'register' ? 'Position your face clearly within the frame' : 'Verifying Admin Identity'}
              </Text>
            </View>

            <View style={styles.captureBtnContainer}>
              <TouchableOpacity 
                style={[styles.captureBtn, isProcessing && styles.captureBtnDisabled]} 
                onPress={captureFace}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialCommunityIcons name="camera-iris" size={32} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* AI Assistant FAB */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AdminAIChat')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#35A7C4', '#2CA0C4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="robot-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Sliding Navigation Bar matching UserDashboard */}
      <View style={styles.navBarContainer}>
        <View style={styles.navBar}>
          
          {/* Sliding Circle Indicator */}
          <Animated.View
            style={[
              styles.activeIndicatorContainer,
              {
                transform: [
                  { translateX },
                  { translateY: circleTranslateY },
                  { scale: circleScale },
                ],
              },
            ]}
          >
            <View style={styles.activeProtrusion} />
            <View style={styles.activeCircle}>
              <MaterialCommunityIcons
                name={
                  activeTab === 'home' ? 'home' :
                  activeTab === 'actions' ? 'flash' :
                  activeTab === 'search' ? 'file-chart' : 'cog'
                }
                size={26}
                color="#fff"
              />
            </View>
          </Animated.View>

          {/* Tab 1: Home */}
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('home')}
            activeOpacity={0.8}
          >
            <Animated.View style={makeIconStyle(0)}>
              <MaterialCommunityIcons name="home-outline" size={24} color="#7C8BA1" />
            </Animated.View>
          </TouchableOpacity>

          {/* Tab 2: Actions */}
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('actions')}
            activeOpacity={0.8}
          >
            <Animated.View style={makeIconStyle(1)}>
              <MaterialCommunityIcons name="flash-outline" size={24} color="#7C8BA1" />
            </Animated.View>
          </TouchableOpacity>

          {/* Tab 3: Search / Reports */}
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('search')}
            activeOpacity={0.8}
          >
            <Animated.View style={makeIconStyle(2)}>
              <MaterialCommunityIcons name="file-chart-outline" size={24} color="#7C8BA1" />
            </Animated.View>
          </TouchableOpacity>

          {/* Tab 4: Settings */}
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <Animated.View style={makeIconStyle(3)}>
              <MaterialCommunityIcons name="cog-outline" size={24} color="#7C8BA1" />
            </Animated.View>
          </TouchableOpacity>

        </View>
      </View>

      {/* Custom Styled Alert Modal Popup */}
      <Modal
        visible={alertConfig.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.customAlertContent]}>
            <View style={styles.alertIconWrapper}>
              <View style={[styles.alertIconOutline, alertConfig.type === 'error' ? styles.alertIconOutlineError : styles.alertIconOutlineSuccess]}>
                <View style={[styles.alertIconInner, alertConfig.type === 'error' ? styles.alertIconInnerError : styles.alertIconInnerSuccess]}>
                  <MaterialCommunityIcons 
                    name={alertConfig.type === 'error' ? "alert-circle" : "check-circle"} 
                    size={36} 
                    color={alertConfig.type === 'error' ? "#E11D48" : "#10B981"} 
                  />
                </View>
              </View>
            </View>
            
            <Text style={styles.alertModalTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertModalMessage}>{alertConfig.message}</Text>
            
            <TouchableOpacity 
              style={[styles.alertOkBtn, alertConfig.type === 'error' ? styles.alertOkBtnError : styles.alertOkBtnSuccess]} 
              onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
              activeOpacity={0.8}
            >
              <Text style={styles.alertOkBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Styled Confirmation Modal Popup */}
      <Modal
        visible={confirmConfig.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.customAlertContent]}>
            <View style={styles.alertIconWrapper}>
              <View style={[styles.alertIconOutline, styles.alertIconOutlineError]}>
                <View style={styles.alertIconInner}>
                  <MaterialCommunityIcons 
                    name="alert-circle" 
                    size={36} 
                    color="#E11D48" 
                  />
                </View>
              </View>
            </View>
            
            <Text style={styles.alertModalTitle}>{confirmConfig.title}</Text>
            <Text style={styles.alertModalMessage}>{confirmConfig.message}</Text>
            
            <View style={styles.confirmActionRow}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setConfirmConfig(prev => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <View style={styles.confirmBtnShadow}>
                <TouchableOpacity 
                  style={styles.confirmBtn} 
                  onPress={() => {
                    setConfirmConfig(prev => ({ ...prev, visible: false }));
                    confirmConfig.onConfirm();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lecture Attendance Detail Modal */}
      <Modal
        visible={isDetailModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedLecture ? selectedLecture.subject_name : 'Loading...'}
                </Text>
                <Text style={{ fontFamily: 'Outfit-Medium', color: '#7C8BA1', fontSize: 13, marginTop: 2 }}>
                  {selectedLecture ? `${selectedLecture.subject_code} • ${selectedLecture.room_name}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsDetailModalOpen(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#7C8BA1" />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator size="large" color="#35A7C4" style={{ marginVertical: 40 }} />
            ) : (
              <>
                {/* Date & Time Header */}
                <View style={styles.detailTimeHeader}>
                  <View style={styles.detailTimeItem}>
                    <MaterialCommunityIcons name="calendar-outline" size={16} color="#35A7C4" style={{ marginRight: 6 }} />
                    <Text style={styles.detailTimeText}>{selectedLecture?.date}</Text>
                  </View>
                  <View style={[styles.detailTimeItem, { marginLeft: 16 }]}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#35A7C4" style={{ marginRight: 6 }} />
                    <Text style={styles.detailTimeText}>
                      {selectedLecture ? `${selectedLecture.start_time?.substring(0, 5)} - ${selectedLecture.end_time?.substring(0, 5)}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Attendance Summary Stats */}
                {detailStudents.length > 0 && (
                  <View style={styles.summaryStatsRow}>
                    <View style={[styles.summaryStatBox, { borderColor: '#E5EDF9' }]}>
                      <Text style={[styles.summaryStatVal, { color: '#2C3A4E' }]}>{detailStudents.length}</Text>
                      <Text style={styles.summaryStatLbl}>Total Enrolled</Text>
                    </View>
                    <View style={[styles.summaryStatBox, { borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                      <Text style={[styles.summaryStatVal, { color: '#10B981' }]}>
                        {detailStudents.filter(s => s.attendance_status === 'Present').length}
                      </Text>
                      <Text style={styles.summaryStatLbl}>Present</Text>
                    </View>
                    <View style={[styles.summaryStatBox, { borderColor: 'rgba(225, 29, 72, 0.2)' }]}>
                      <Text style={[styles.summaryStatVal, { color: '#E11D48' }]}>
                        {detailStudents.filter(s => s.attendance_status === 'Absent').length}
                      </Text>
                      <Text style={styles.summaryStatLbl}>Absent</Text>
                    </View>
                  </View>
                )}

                {/* Students List */}
                <ScrollView 
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  {detailStudents.length > 0 ? (
                    detailStudents.map((item, index) => {
                      const isPresent = item.attendance_status === 'Present';
                      return (
                        <View key={index} style={styles.studentDetailRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentDetailName}>{item.student_name}</Text>
                            <Text style={styles.studentDetailId}>{item.index_number} • {item.registration_number}</Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: isPresent ? 'rgba(16, 185, 129, 0.12)' : 'rgba(225, 29, 72, 0.12)' }]}>
                            <View style={[styles.dot, { backgroundColor: isPresent ? '#10B981' : '#E11D48' }]} />
                            <Text style={[styles.badgeText, { color: isPresent ? '#10B981' : '#E11D48' }]}>
                              {item.attendance_status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={{ alignItems: 'center', marginVertical: 30 }}>
                      <MaterialCommunityIcons name="account-off-outline" size={40} color="#7C8BA1" />
                      <Text style={{ fontFamily: 'Outfit-Medium', color: '#7C8BA1', marginTop: 10, fontSize: 14 }}>
                        No students enrolled or assigned.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF0F3',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  headerContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#ECF0F3',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  headerSplitOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#2C3A4E',
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: '#35A7C4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  headerBadgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    fontSize: 14,
    marginTop: 4,
  },
  notifBtn: { 
    backgroundColor: '#ECF0F3',
    padding: 10, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
    borderWidth: 1.5,
    borderColor: '#ECF0F3',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ECF0F3',
    borderRadius: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#2C3A4E',
  },
  statLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: '#7C8BA1',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(124, 139, 161, 0.2)',
  },
  
  scrollContent: {
    padding: 20,
  },
  
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
    marginBottom: 14,
    marginLeft: 4,
  },
  
  lecCard: { 
    backgroundColor: '#ECF0F3', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 3,
  },
  lecCardLive: {
    borderColor: '#35A7C4',
    backgroundColor: '#E5EDF9',
    shadowColor: '#288BA3',
    shadowOpacity: 0.2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
  },
  timeText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: '#7C8BA1',
  },
  courseName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: '#2C3A4E',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    fontSize: 12,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: {
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    marginTop: 4,
    fontSize: 15,
  },

  actionCard: { 
    flexDirection: 'row', 
    backgroundColor: '#ECF0F3', 
    padding: 18, 
    borderRadius: 24, 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  warningIconCircle: {
    backgroundColor: '#ECF0F3',
    shadowColor: '#E11D48',
    shadowOpacity: 0.25,
  },
  chevronBg: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 1,
  },
  actionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2C3A4E',
  },
  actionDesc: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: '#7C8BA1',
    marginTop: 2,
  },

  logoutBtnContainer: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECF0F3',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutBtn: { 
    width: '100%',
    height: '100%',
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#ECF0F3',
  },
  logoutText: {
    fontFamily: 'Outfit-Bold',
    color: '#E11D48',
    fontSize: 15,
    marginLeft: 8,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalKeyboardContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ECF0F3',
    borderRadius: 28,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2C3A4E',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingBottom: 10,
  },
  formGroup: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabel: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#7C8BA1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  pickerContainer: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    fontFamily: 'Outfit-Medium',
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#2C3A4E',
  },
  submitBtnShadowContainer: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    marginVertical: 10,
    backgroundColor: '#ECF0F3',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#35A7C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  excelBtnShadowContainer: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#ECF0F3',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  excelBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#ECF0F3',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  excelBtnText: {
    fontFamily: 'Outfit-Bold',
    color: '#10B981',
    fontSize: 15,
  },

  // Face Overlay Styles
  faceOverlayContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#ECF0F3',
    zIndex: 9999,
  },
  faceOverlayHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255,255,255,0.4)',
  },
  closeOverlayBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#ECF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 2,
  },
  faceOverlayTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2C3A4E',
  },
  faceCameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  faceInstructionBox: {
    position: 'absolute',
    top: 40, left: 20, right: 20,
    backgroundColor: '#ECF0F3',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#A3B1C6', shadowOpacity: 0.7, shadowRadius: 10, elevation: 5,
  },
  faceInstructionText: {
    fontFamily: 'Outfit-SemiBold',
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    color: '#2C3A4E',
  },
  captureBtnContainer: {
    position: 'absolute',
    bottom: 50, left: 0, right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: '#35A7C4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  captureBtnDisabled: {
    backgroundColor: '#7C8BA1',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 999,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Custom Logout Modal Styles
  logoutModalContent: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: 320,
    borderRadius: 28,
  },
  logoutIconWrapper: {
    marginBottom: 20,
  },
  logoutIconOutline: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logoutIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 20,
  },
  logoutActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutCancelBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#7C8BA1',
  },
  logoutConfirmBtnShadow: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    marginLeft: 10,
    backgroundColor: '#ECF0F3',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  logoutConfirmBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutConfirmBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },

  // Bottom Navigation Bar matching UserDashboard
  navBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 70,
    zIndex: 99,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  navItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicatorContainer: {
    position: 'absolute',
    left: 0,
    top: -24,
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
  },
  activeProtrusion: {
    position: 'absolute',
    width: 68,
    height: 38,
    backgroundColor: '#ECF0F3',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    top: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#35A7C4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  // Settings specific profiles
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  largeProfileCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
  profilePhotoLabel: {
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    fontSize: 16,
    marginTop: 10,
  },
  profileForm: {
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  profileField: {
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 12,
  },
  profileFieldLabel: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: '#7C8BA1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  profileFieldValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2C3A4E',
  },

  // Reports table styles
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  resultsTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
  },
  countBadge: {
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 1,
  },
  countText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#35A7C4',
  },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  headerCell: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: '#7C8BA1',
    textTransform: 'uppercase',
  },
  tableRow: { 
    flexDirection: 'row', 
    backgroundColor: '#ECF0F3', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 2, 
    alignItems: 'center',
  },
  studentInfo: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  idBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 1,
  },
  idBadgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#35A7C4',
  },
  cellText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2C3A4E',
  },
  subCellText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#7C8BA1',
    marginTop: 2,
  },
  statusCol: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
  },
  percentageCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  percentageText: {
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    fontSize: 16,
  },
  percentageLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 10,
    color: '#7C8BA1',
  },
  emptyTextTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
  },
  emptyTextSub: {
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    color: '#7C8BA1',
    marginTop: 8,
    lineHeight: 20,
  },

  // Reports selector details
  label: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#7C8BA1',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selector: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 14, 
    backgroundColor: '#ECF0F3', 
    marginRight: 10, 
    borderWidth: 1.5, 
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#35A7C4',
    borderColor: '#35A7C4',
    shadowColor: '#288BA3',
  },
  chipText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: '#7C8BA1',
  },
  chipTextSelected: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
  hintText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#7C8BA1',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ECF0F3',
    borderRadius: 28,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  customAlertContent: {
    alignItems: 'center',
    padding: 24,
    maxWidth: 300,
    borderRadius: 24,
  },
  alertIconWrapper: {
    marginBottom: 16,
  },
  alertIconOutline: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  alertIconOutlineError: {
    borderColor: '#FFEBEF',
    backgroundColor: '#FFEBEF',
  },
  alertIconOutlineSuccess: {
    borderColor: '#ECFDF5',
    backgroundColor: '#ECFDF5',
  },
  alertIconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  alertModalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertModalMessage: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  alertOkBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  alertOkBtnError: {
    backgroundColor: '#E11D48',
    shadowColor: '#E11D48',
  },
  alertOkBtnSuccess: {
    backgroundColor: '#35A7C4',
    shadowColor: '#35A7C4',
  },
  alertOkBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
  },
  confirmActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#7C8BA1',
  },
  confirmBtnShadow: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    shadowColor: '#FFEBEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#35A7C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
  detailTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  detailTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTimeText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: '#2C3A4E',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: '#ECF0F3',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryStatVal: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  summaryStatLbl: {
    fontFamily: 'Outfit-Medium',
    fontSize: 10,
    color: '#7C8BA1',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  studentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 1,
  },
  studentDetailName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#2C3A4E',
  },
  studentDetailId: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: '#7C8BA1',
    marginTop: 2,
  },
  requestCard: {
    backgroundColor: '#ECF0F3',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestUserGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestRoleBadge: {
    backgroundColor: 'rgba(53, 167, 196, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  requestRoleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10,
    color: '#35A7C4',
  },
  requestName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2C3A4E',
    flex: 1,
  },
  requestDate: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: '#7C8BA1',
  },
  requestEmail: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: '#7C8BA1',
    marginBottom: 2,
  },
  requestUserId: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
    color: '#35A7C4',
    marginBottom: 6,
  },
  requestMessageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 10,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  requestMessage: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  requestActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ECF0F3',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 1,
  },
  requestBtnDismiss: {
    borderColor: 'rgba(225, 29, 72, 0.3)',
  },
  requestBtnApprove: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  requestBtnTextDismiss: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#E11D48',
  },
  requestBtnTextApprove: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#10B981',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  requestBtnPending: {
    borderColor: 'rgba(124, 139, 161, 0.3)',
  },
  requestBtnDone: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  requestBtnTextPending: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#7C8BA1',
  },
  requestBtnTextDone: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#10B981',
  },
  reqMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  reqMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1.5,
    elevation: 1,
  },
  reqMetaText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: '#35A7C4',
  },
  requestDetailsGrid: {
    marginVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  reqDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  reqDetailLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: '#7C8BA1',
    flex: 1,
  },
  reqDetailValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#2C3A4E',
    flex: 2,
    textAlign: 'right',
  },
  fullPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  backBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#35A7C4',
    marginLeft: 2,
  },
  fullPageTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
  },
  subtitleText: {
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    fontSize: 13,
    lineHeight: 18,
  },
});