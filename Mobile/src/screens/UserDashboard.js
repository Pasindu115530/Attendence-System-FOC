import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  TextInput,
  Dimensions,
  Platform,
  ImageBackground,
  Image,
  Modal,
  KeyboardAvoidingView
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post, upload } from '../api';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function UserDashboard({ route, navigation }) {
  const { user_id, user } = route.params || { user_id: 'TEST001' };

  // Dashboard & Navigation state
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'settings', 'search', 'menu'
  const [currentTime, setCurrentTime] = useState(new Date());

  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [userData, setUserData] = useState(user || { user_id, full_name: '', dept_id: 'Computing' });

  // Face Registration State
  const [isFaceRegisterMode, setIsFaceRegisterMode] = useState(false);
  const [registeringFace, setRegisteringFace] = useState(false);
  const cameraRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await post('/change_password', {
        user_id,
        old_password: oldPassword.trim(),
        new_password: newPassword.trim(),
      });
      if (res.status === 'success') {
        Alert.alert("Success", "Password changed successfully!");
        setIsPasswordModalOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert("Error", res.message || "Failed to change password");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Real-time ticking clock loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchUserData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      const res = await post('/get_dashboard', { user_id });
      if (res.status === 'success') setLecture(res.data.lecture);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const res = await post('/get_user_by_id', { user_id });
      if (res.status === 'success') {
        setUserData(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAttendance = async () => {
    setMarking(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert("Permission denied");

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      const res = await post('/mark_attendance', {
        user_id,
        course_id: lecture.course_id,
        timetable_id: lecture.id,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (res.status === 'success') {
        Alert.alert(
          res.data.attendance_status === 'Present' ? "Success" : "Out of Range",
          res.data.message
        );
        fetchDashboard();
      } else {
        Alert.alert("Failed", res.message || "Could not mark attendance");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Do you want to exit ?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, Logout", onPress: () => navigation.replace('Login', { autoFaceLogin: false }), style: 'destructive' }
    ]);
  };

  const handleOpenFaceRegister = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setIsFaceRegisterMode(true);
    } else {
      Alert.alert("Permission Denied", "Camera permission is required to register your face.");
    }
  };

  const captureAndRegisterFace = async () => {
    if (registeringFace) return;
    setRegisteringFace(true);
    try {
      if (!cameraRef.current) {
        setRegisteringFace(false);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

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
      formData.append('index_number', user_id);

      const res = await upload('/register-face', formData);

      if (res.status === 'success') {
        Alert.alert("Success", "Face registered successfully!");
        setIsFaceRegisterMode(false);
      } else {
        Alert.alert("Registration Failed", res.message || "Failed to register face. Make sure only one clear face is visible.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred while registering your face.");
    } finally {
      setRegisteringFace(false);
    }
  };

  const getGreeting = () => {
    const hrs = currentTime.getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007A68" />
        <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '500' }}>Loading your schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={activeTab === 'home' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Top Header Bar for non-home tabs */}
      {activeTab !== 'home' && (
        <View style={styles.topHeaderBar}>
          <TouchableOpacity
            style={styles.topAvatarCircle}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={24} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topCloseSquare}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="close" size={18} color="#1e293b" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          activeTab === 'home' && { paddingTop: 0 } // span edge-to-edge
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%' }}>

          {activeTab === 'home' && (
            <View style={{ width: '100%' }}>
              {/* Home Curved Header Block with Solid Green Field and Full-Opacity Right Image */}
              <View style={styles.headerContainer}>
                {/* Right side cover image at full opacity */}
                <Image
                  source={require('../../assets/cover-img.png')}
                  style={styles.headerRightImage}
                />

                {/* Horizontal Gradient Overlay (Fades out to reveal image on the right) */}
                <LinearGradient
                  colors={['#004d40', 'rgba(0, 77, 64, 0.9)', 'rgba(0, 77, 64, 0.2)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.headerSplitOverlay}
                >
                  {/* Embedded Top Row for Avatar & Logout */}
                  <View style={styles.headerTopBar}>
                    <TouchableOpacity
                      style={styles.headerAvatarCircle}
                      onPress={() => setActiveTab('settings')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.headerAvatarInner}>
                        <MaterialCommunityIcons name="account" size={22} color="#004D40" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.headerCloseSquare}
                      onPress={handleLogout}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Greeting & Name */}
                  <View style={styles.headerWelcomeSection}>
                    <Text style={styles.headerGreetingText}>{getGreeting()}</Text>
                    <Text style={styles.headerStudentNameText}>{userData.full_name || user_id}</Text>
                  </View>

                  {/* Digital Clock */}
                  <View style={styles.headerClockSection}>
                    <Text style={styles.headerClockText}>
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                    </Text>
                    <Text style={styles.headerDateText}>
                      {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Today's Schedule Card / Banners */}
              <View style={styles.homeContentPadding}>
                <Text style={styles.tabSectionTitle}>Today's Schedule</Text>

                {lecture ? (
                  <View style={[styles.lectureCard, lecture.isLive && styles.lectureCardLive]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.badge, lecture.isLive ? styles.badgeLive : styles.badgeUpcoming]}>
                        <View style={[styles.badgeDot, { backgroundColor: lecture.isLive ? '#007A68' : '#d97706' }]} />
                        <Text style={[styles.badgeText, { color: lecture.isLive ? '#004D40' : '#92400e' }]}>
                          {lecture.isLive ? 'LIVE NOW' : 'UPCOMING'}
                        </Text>
                      </View>
                      <Text style={styles.cardTime}>{lecture.start_time?.substring(0, 5)} - {lecture.end_time?.substring(0, 5)}</Text>
                    </View>

                    <Text style={styles.cardCourseName}>{lecture.course_name}</Text>

                    <View style={styles.cardInfoRow}>
                      <View style={styles.cardPill}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#007A68" />
                        <Text style={styles.cardPillText}>{lecture.room_name}</Text>
                      </View>
                    </View>

                    {lecture.isLive && (
                      lecture.hasMarked ? (
                        <View style={styles.markedBtn}>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                          <Text style={styles.markedBtnText}>Attendance Marked</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.markBtn}
                          onPress={handleMarkAttendance}
                          disabled={marking}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#029A84', '#004D40']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.markBtnGradient}
                          >
                            {marking ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="map-marker-radius" size={20} color="#fff" />
                                <Text style={styles.markBtnText}>Mark Attendance</Text>
                              </>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyStateCard}>
                    <View style={styles.emptyIconCircle}>
                      <MaterialCommunityIcons name="calendar-blank" size={36} color="#a0aec0" />
                    </View>
                    <Text style={styles.emptyTitle}>No Lectures Scheduled</Text>
                    <Text style={styles.emptySubtitle}>You're all caught up for today.</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'settings' && (
            <View style={[styles.profileContainer, { paddingHorizontal: 24 }]}>
              {/* Profile Image card matching mockup */}
              <View style={styles.profileImageContainer}>
                <View style={styles.largeProfileCircle}>
                  <MaterialCommunityIcons name="account" size={72} color="#cbd5e1" />
                </View>
                <Text style={styles.profilePhotoLabel}>Profile Photo</Text>
              </View>

              {/* Display fields matching mockup */}
              <View style={styles.profileForm}>
                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Name</Text>
                  <Text style={styles.profileFieldValue}>{userData.full_name || user_id}</Text>
                </View>

                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Username / ID</Text>
                  <Text style={styles.profileFieldValue}>{user_id}</Text>
                </View>

                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Department</Text>
                  <Text style={styles.profileFieldValue}>{userData.dept_id || 'Computing'}</Text>
                </View>

                <View style={styles.profileField}>
                  <Text style={styles.profileFieldLabel}>Batch</Text>
                  <Text style={styles.profileFieldValue}>{userData.batch_year ? `${userData.batch_year} Batch` : 'N/A'}</Text>
                </View>
              </View>

              {/* Buttons matching mockup */}
              <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: '#007A68', marginBottom: 16 }]}
                onPress={handleOpenFaceRegister}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="face-recognition" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={[styles.logoutBtnText, { color: '#fff' }]}>Register Face ID</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: '#029A84', marginBottom: 16 }]}
                onPress={() => setIsPasswordModalOpen(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="lock-reset" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={[styles.logoutBtnText, { color: '#fff' }]}>Change Password</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>




            </View>
          )}

          {activeTab === 'search' && (
            <View style={{ width: '100%', paddingHorizontal: 24 }}>
              <Text style={styles.tabSectionTitle}>Search & Reports</Text>
              <View style={styles.searchInputWrapper}>
                <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchBar}
                  placeholder="Search classes or dates..."
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Stub for reports/attendance log */}
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="file-chart-outline" size={36} color="#a0aec0" />
                </View>
                <Text style={styles.emptyTitle}>No search results</Text>
                <Text style={styles.emptySubtitle}>Start typing to search your attendance logs.</Text>
              </View>
            </View>
          )}

          {activeTab === 'menu' && (
            <View style={{ width: '100%', paddingHorizontal: 24 }}>
              <Text style={styles.tabSectionTitle}>Today's Actions</Text>

              {/* Upload Medical Report quick action card */}
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('AbsentUploader', { studentId: user_id })}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: '#fff8e1' }]}>
                  <MaterialCommunityIcons name="medical-bag" size={26} color="#ffb300" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.menuCardTitle}>Upload Medical Report</Text>
                  <Text style={styles.menuCardDesc}>Submit medical certificates for absences</Text>
                </View>
                <View style={styles.menuChevron}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#ffb300" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => Alert.alert("Support", "FOC Attendance System v1.0. Contact office for support.")}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: '#e6f4f2' }]}>
                  <MaterialCommunityIcons name="help-circle-outline" size={26} color="#007A68" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.menuCardTitle}>Help & Support</Text>
                  <Text style={styles.menuCardDesc}>FOC system guidelines and contact details</Text>
                </View>
                <View style={styles.menuChevron}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#007A68" />
                </View>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Face Registration Overlay */}
      {isFaceRegisterMode && (
        <View style={styles.faceOverlayContainer}>
          <View style={styles.faceOverlayHeader}>
            <TouchableOpacity onPress={() => setIsFaceRegisterMode(false)} style={styles.closeOverlayBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.faceOverlayTitle}>Register Face</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.faceCameraContainer}>
            <View style={styles.cameraWrapper}>
              <CameraView
                ref={cameraRef}
                style={styles.cameraView}
                facing="front"
              />
            </View>
            <Text style={styles.faceInstructionText}>
              Position your face clearly within the frame
            </Text>

            <TouchableOpacity
              style={styles.captureBtn}
              onPress={captureAndRegisterFace}
              disabled={registeringFace}
            >
              {registeringFace ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <MaterialCommunityIcons name="camera" size={28} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Change Password Modal */}
      <Modal
        visible={isPasswordModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)} style={styles.modalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Current Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter current password"
                    placeholderTextColor="#94a3b8"
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>New Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#94a3b8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>

                {changingPassword ? (
                  <ActivityIndicator size="large" color="#007A68" style={{ marginVertical: 20 }} />
                ) : (
                  <TouchableOpacity style={styles.submitBtn} onPress={handleChangePassword}>
                    <LinearGradient
                      colors={['#029A84', '#004D40']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitBtnGradient}
                    >
                      <Text style={styles.submitBtnText}>Update Password</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AI Chatbot FAB */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('ChatScreen')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#00BFA5', '#007A68']}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="robot-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Custom Bottom Curved Tab Bar matching attached mockup */}
      <View style={styles.navBarContainer}>
        <View style={styles.navBar}>

          {/* Tab 1: Home */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.8}
          >
            {activeTab === 'home' ? (
              <View style={styles.activeIndicatorContainer}>
                <View style={styles.activeProtrusion} />
                <View style={styles.activeCircle}>
                  <MaterialCommunityIcons name="home" size={24} color="#007A68" />
                </View>
              </View>
            ) : (
              <MaterialCommunityIcons name="home-outline" size={24} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Tab 2: Settings */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            {activeTab === 'settings' ? (
              <View style={styles.activeIndicatorContainer}>
                <View style={styles.activeProtrusion} />
                <View style={styles.activeCircle}>
                  <MaterialCommunityIcons name="cog" size={24} color="#007A68" />
                </View>
              </View>
            ) : (
              <MaterialCommunityIcons name="cog-outline" size={24} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Tab 3: Search */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('search')}
            activeOpacity={0.8}
          >
            {activeTab === 'search' ? (
              <View style={styles.activeIndicatorContainer}>
                <View style={styles.activeProtrusion} />
                <View style={styles.activeCircle}>
                  <MaterialCommunityIcons name="magnify" size={24} color="#007A68" />
                </View>
              </View>
            ) : (
              <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Tab 4: Menu */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('menu')}
            activeOpacity={0.8}
          >
            {activeTab === 'menu' ? (
              <View style={styles.activeIndicatorContainer}>
                <View style={styles.activeProtrusion} />
                <View style={styles.activeCircle}>
                  <MaterialCommunityIcons name="apps" size={24} color="#007A68" />
                </View>
              </View>
            ) : (
              <MaterialCommunityIcons name="apps" size={24} color="#fff" />
            )}
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },

  // Top Header Row for non-home tabs
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 12,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  topAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCloseSquare: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingGrow: 1,
    paddingBottom: 120, // Extra padding to scroll past the absolute bottom nav bar
    alignItems: 'center',
    width: '100%',
  },

  // Curved Header Block matching mockup with Solid Green Field and Full-Opacity Right Image
  headerContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#004D40', // Solid brand green field background
    borderBottomLeftRadius: 60, // Curved bottom left
    overflow: 'hidden',
    position: 'relative',
  },
  headerRightImage: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    top: 30,
    width: '55%',
    height: '100%',
    resizeMode: 'contain',
    opacity: 1.0, // Full opacity as requested!
  },
  headerSplitOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 45 : 30,
    paddingBottom: 25,
    justifyContent: 'space-between',
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#e6f4f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCloseSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWelcomeSection: {
    marginTop: 10,
  },
  headerGreetingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a7f3d0', // Emerald-tinted mint green
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerStudentNameText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerClockSection: {
    alignItems: 'flex-start',
  },
  headerClockText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 2,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  homeContentPadding: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  tabSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.2,
  },

  // Lectures Card styles
  lectureCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 24,
    width: '100%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  lectureCardLive: {
    borderColor: '#00BFA5',
    backgroundColor: '#e6f4f2',
    shadowColor: '#00BFA5',
    shadowOpacity: 0.08,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeLive: {
    backgroundColor: 'rgba(0, 180, 150, 0.15)',
  },
  badgeUpcoming: {
    backgroundColor: '#fef3c7',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  cardCourseName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    lineHeight: 28,
  },
  cardInfoRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  cardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardPillText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  markBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
  },
  markBtnGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    marginLeft: 8,
  },
  markedBtn: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markedBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    marginLeft: 8,
  },

  // Empty state card
  emptyStateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Profile Settings screen styles matching mockup
  profileContainer: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 10,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  largeProfileCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profilePhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  profileForm: {
    width: '100%',
    marginBottom: 24,
  },
  profileField: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
  },
  profileFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  profileFieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  logoutBtn: {
    backgroundColor: '#e2e8f0',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoutBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 15,
  },

  // Search tab styles
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },

  // Quick Tools styles
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  menuIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  menuCardDesc: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  menuChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Custom Bottom Curved Tab Bar matching mockup
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
    backgroundColor: '#004D40', // Rich dark teal matching the theme
    borderRadius: 24,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  navItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicatorContainer: {
    position: 'absolute',
    top: -24, // Protrude upwards
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
  },
  activeProtrusion: {
    position: 'absolute',
    width: 68,
    height: 38,
    backgroundColor: '#004D40', // Matches the tab bar color
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    top: 10, // Sits under the circle to blend
  },
  activeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 3,
    borderColor: '#029A84', // Matches primary teal
  },

  // AI Chatbot FAB
  fabButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 100,
    shadowColor: '#00BFA5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Face Registration Overlay Styles
  faceOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 999,
  },
  faceOverlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeOverlayBtn: {
    padding: 5,
  },
  faceOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  faceCameraContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  cameraWrapper: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    borderRadius: (Dimensions.get('window').width * 0.8) / 2,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#00BFA5',
    marginBottom: 30,
  },
  cameraView: {
    flex: 1,
  },
  faceInstructionText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 50,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007A68',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007A68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
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
  }
});