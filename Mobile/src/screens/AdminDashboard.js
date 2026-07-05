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
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post, upload, uploadFile } from '../api';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';

export default function AdminDashboard({ navigation }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Student states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStudentId, setFormStudentId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formRegNo, setFormRegNo] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formBatchYear, setFormBatchYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
      Alert.alert("Permission Denied", "Camera permission is required.");
    }
  };

  const handleOpenFaceReset = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setOverlayMode('reset');
      setIsFaceOverlayOpen(true);
    } else {
      Alert.alert("Permission Denied", "Camera permission is required.");
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
          Alert.alert("Success", "Admin Face registered successfully!");
          setIsFaceOverlayOpen(false);
        } else {
          Alert.alert("Failed", res.message || "Failed to register face.");
        }
      } else if (overlayMode === 'reset') {
        const faceRes = await upload('/verify-face', formData);
        if (faceRes.status === "success" && faceRes.data?.role === 'Admin') {
          setIsFaceOverlayOpen(false);
          Alert.alert(
            "Reset Semester Data",
            "Identity verified! Are you absolutely sure you want to permanently delete ALL batch subject assignments, timetables, and student attendance records?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Yes, Reset Everything", 
                style: "destructive",
                onPress: async () => {
                  try {
                    const res = await post('/reset_semester', {});
                    if (res.status === 'success') {
                      Alert.alert("Success", "Semester data has been wiped.");
                      fetchAdminData();
                    } else {
                      Alert.alert("Error", res.message || "Failed to reset");
                    }
                  } catch (err) {
                    Alert.alert("Error", "Could not connect to the server.");
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert("Verification Failed", "Could not verify your identity as an Admin.");
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred with the camera.");
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
        Alert.alert("Success", uploadRes.message);
        setIsModalOpen(false);
        fetchAdminData();
      } else {
        Alert.alert("Error", uploadRes.message || "Failed to upload file");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred during file upload");
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

  const handleAddStudent = async () => {
    if (!formStudentId.trim() || !formFullName.trim() || !formNic.trim() || !formRegNo.trim() || !formDeptId.trim() || !formBatchYear.trim()) {
      Alert.alert("Error", "All fields (Student ID, Full Name, Registration Number, NIC, Department, and Batch Year) are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await post('/add_student', {
        user_id: formStudentId.trim(),
        full_name: formFullName.trim(),
        nic: formNic.trim(),
        registration_number: formRegNo.trim(),
        dept_id: formDeptId.trim(),
        batch_year: formBatchYear.trim() ? parseInt(formBatchYear.trim()) : null
      });

      if (res.status === 'success') {
        Alert.alert("Success", "Student added successfully!");
        setIsModalOpen(false);
        setFormStudentId('');
        setFormFullName('');
        setFormNic('');
        setFormRegNo('');
        setFormDeptId('');
        setFormBatchYear('');
        fetchAdminData();
      } else {
        Alert.alert("Error", res.message || "Failed to add student");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAdminData = useCallback(async () => {
    try {
      // POST /get_admin_dashboard  →  { status, data: { lectures: [...] } }
      const data = await post('/get_admin_dashboard', {});

      if (data.status === 'success') {
        setLectures(data.data.lectures);
      } else {
        setLectures([]);
      }
    } catch (error) {
      console.error("Fetch Error: ", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    fetchDepartments();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fetchAdminData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, Logout", onPress: () => navigation.replace('Login', { autoFaceLogin: false }), style: 'destructive' }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <MaterialCommunityIcons name="school-outline" size={48} color="#007A68" />
        </View>
        <Text style={{marginTop: 16, color: '#64748b', fontWeight: '600', fontSize: 15}}>Loading Schedule...</Text>
      </View>
    );
  }

  const liveLectures = lectures.filter(l => {
    const now = new Date();
    const start = new Date(`2000-01-01T${l.start_time}`);
    const end = new Date(`2000-01-01T${l.end_time}`);
    return now >= start && now <= end;
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Header */}
      <LinearGradient
        colors={['#029A84', '#007A68', '#004D40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerWave1} pointerEvents="none" />
        <View style={styles.headerWave2} pointerEvents="none" />

        <View style={styles.headerTop}>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Admin Panel</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>FOC</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Faculty of Computing</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
            {liveLectures.length > 0 && <View style={styles.notifBadge} />}
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{lectures.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#5eead4' }]}>{liveLectures.length}</Text>
            <Text style={styles.statLabel}>Live Now</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{Math.max(0, lectures.length - liveLectures.length)}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#029A84"
            colors={['#029A84']}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          
          {lectures.length > 0 ? (
            lectures.map((item, index) => {
              const isLive = liveLectures.includes(item);
              return (
                <View key={index} style={[styles.lecCard, isLive && styles.lecCardLive]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: isLive ? '#d1fae5' : '#f1f5f9' }]}>
                      <View style={[styles.dot, { backgroundColor: isLive ? '#10b981' : '#94a3b8' }]} />
                      <Text style={[styles.badgeText, { color: isLive ? '#065f46' : '#64748b' }]}>
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
                      <MaterialCommunityIcons name="map-marker-radius" size={14} color="#007A68" />
                      <Text style={styles.infoText}>{item.room_name}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
            </View>
        )}

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e6f4f2' }]}>
              <MaterialCommunityIcons name="account-plus-outline" size={26} color="#007A68" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Create Student</Text>
              <Text style={styles.actionDesc}>Register a new student with login credentials</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#e6f4f2' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#007A68" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('AttendanceReports')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e6f4f2' }]}>
              <MaterialCommunityIcons name="file-chart-outline" size={26} color="#007A68" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Attendance Reports</Text>
              <Text style={styles.actionDesc}>View student attendance statistics by course</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#e6f4f2' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#007A68" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('AssignSubjects')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e0e7ff' }]}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={26} color="#4f46e5" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Assign Subjects</Text>
              <Text style={styles.actionDesc}>Assign subjects to batches per semester</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#e0e7ff' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#4f46e5" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('ViewAssignedSubjects')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
              <MaterialCommunityIcons name="format-list-bulleted" size={26} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>View Assignments</Text>
              <Text style={styles.actionDesc}>See all subjects assigned to batches</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#d1fae5' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#059669" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('ManageTimetable')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={26} color="#d97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Manage Timetable</Text>
              <Text style={styles.actionDesc}>Assign classes and set lecture times</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#d97706" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { marginBottom: 12 }]} 
            onPress={() => navigation.navigate('AddClassLocation')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fff1f2' }]}>
              <MaterialCommunityIcons name="map-marker-path" size={26} color="#e11d48" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Set Class Location</Text>
              <Text style={styles.actionDesc}>Define boundary points for geofencing</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#fff1f2' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#e11d48" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={handleOpenFaceReset}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
              <MaterialCommunityIcons name="delete-alert-outline" size={26} color="#ef4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Reset Semester</Text>
              <Text style={styles.actionDesc}>Requires facial verification</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#fef2f2' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#ef4444" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { marginBottom: 12 }]} 
            onPress={handleOpenFaceRegister}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e2e8f0' }]}>
              <MaterialCommunityIcons name="face-recognition" size={26} color="#475569" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Register Admin Face</Text>
              <Text style={styles.actionDesc}>Register your face for admin actions</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#e2e8f0' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout from System</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>

      {/* Create Student Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalKeyboardContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Student</Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Student Index Number (Username for Login) *</Text>
                  <View style={styles.rowInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="e.g. FC221000"
                      placeholderTextColor="#94a3b8"
                      value={formStudentId}
                      onChangeText={setFormStudentId}
                      autoCapitalize="none"
                    />
                    
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Amal Perera"
                    placeholderTextColor="#94a3b8"
                    value={formFullName}
                    onChangeText={setFormFullName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Student Registration Number *</Text>
                  <View style={styles.rowInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="e.g. FC115000"
                      placeholderTextColor="#94a3b8"
                      value={formRegNo}
                      onChangeText={setFormRegNo}
                      autoCapitalize="none"
                    />
                    
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>NIC (Password for Login) *</Text>
                  <View style={styles.rowInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="e.g. 200123456789"
                      placeholderTextColor="#94a3b8"
                      value={formNic}
                      onChangeText={setFormNic}
                      autoCapitalize="none"
                    />
                    
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Department</Text>
                  <View style={[styles.input, { paddingVertical: 0 }]}>
                    <Picker
                      selectedValue={formDeptId}
                      onValueChange={(itemValue) => setFormDeptId(itemValue)}
                      style={{ width: '100%', height: 50, color: '#1e293b' }}
                    >
                      <Picker.Item label="Select Department..." value="" />
                      {departments.map(dept => (
                        <Picker.Item key={dept.id} label={dept.name} value={dept.id.toString()} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Batch Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2024"
                    placeholderTextColor="#94a3b8"
                    value={formBatchYear}
                    onChangeText={setFormBatchYear}
                    keyboardType="numeric"
                  />
                </View>

                {submitting || uploadingExcel ? (
                  <ActivityIndicator size="large" color="#007A68" style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAddStudent}>
                      <LinearGradient
                        colors={['#029A84', '#004D40']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitBtnGradient}
                      >
                        <Text style={styles.submitBtnText}>Create Student</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.submitBtn, { marginTop: 12, elevation: 1 }]} 
                      onPress={handleUploadExcel}
                    >
                      <View style={[styles.submitBtnGradient, { backgroundColor: '#f1f5f9' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="microsoft-excel" size={20} color="#0284c7" style={{ marginRight: 8 }} />
                          <Text style={[styles.submitBtnText, { color: '#0284c7' }]}>Bulk Upload via Excel</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Face Overlay Modal */}
      {isFaceOverlayOpen && (
        <View style={styles.faceOverlayContainer}>
          <View style={styles.faceOverlayHeader}>
            <TouchableOpacity onPress={() => setIsFaceOverlayOpen(false)} style={styles.closeOverlayBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748b" />
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
              <MaterialCommunityIcons name="face-recognition" size={32} color="#007A68" />
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
          colors={['#7e22ce', '#9333ea', '#a855f7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="robot-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
  },
  header: { 
    paddingTop: 65, 
    paddingBottom: 28, 
    paddingHorizontal: 24, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  headerWave1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    top: -80,
    right: -80,
  },
  headerWave2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -20,
    left: -40,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 3 },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerBadge: {
    backgroundColor: '#5eead4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#004D40',
  },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4, fontWeight: '500' },
  notifBtn: { 
    backgroundColor: 'rgba(255,255,255,0.12)', 
    padding: 12, 
    borderRadius: 16,
    position: 'relative',
    zIndex: 3,
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#029A84'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 3,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  
  scrollContent: { padding: 20 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 14, marginLeft: 4 },
  
  lecCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  lecCardLive: {
    borderColor: '#00BFA5',
    backgroundColor: '#e6f4f2',
    shadowColor: '#00BFA5',
    shadowOpacity: 0.1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  courseName: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  infoRow: { flexDirection: 'row' },
  infoPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10
  },
  infoText: { color: '#475569', fontSize: 12, marginLeft: 5, fontWeight: '500' },

  emptyContainer: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  emptyText: { color: '#94a3b8', marginTop: 4, fontSize: 15, fontWeight: '500' },

  actionCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    elevation: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  iconCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  chevronBg: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  actionDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '500' },

  logoutBtn: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 20
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15, marginLeft: 8 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  rowInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generatorBtn: {
    marginLeft: 10,
    backgroundColor: '#e6f4f2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 180, 150, 0.2)',
  },
  generatorBtnText: {
    color: '#007A68',
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtn: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
  },
  submitBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  // Face Overlay Styles
  faceOverlayContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    zIndex: 9999,
  },
  faceOverlayHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeOverlayBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  faceOverlayTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  faceCameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  faceInstructionBox: {
    position: 'absolute',
    top: 40, left: 20, right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  faceInstructionText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  captureBtnContainer: {
    position: 'absolute',
    bottom: 50, left: 0, right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: '#007A68',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  }
});