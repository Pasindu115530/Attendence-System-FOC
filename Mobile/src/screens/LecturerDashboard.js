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

export default function LecturerDashboard({ route, navigation }) {
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

  // Animated Tab values & functions
  const tabNames = ['home', 'settings', 'search', 'menu'];
  const getIndexFromTab = (tab) => tabNames.indexOf(tab);
  const animatedTabValue = useRef(new Animated.Value(getIndexFromTab(tabNames.includes(route.params?.activeTab) ? route.params.activeTab : 'home'))).current;

  // Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Logout Confirmation Modal State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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
      Animated.spring(animatedTabValue, {
        toValue: getIndexFromTab(activeTab),
        useNativeDriver: true,
        bounciness: 6,
        speed: 10,
      }),
    ]).start();
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      const res = await post('/get_lecturer_dashboard', { index_number: user_id });
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

  const handleMarkAttendance = () => {
    // Lecturers don't mark their own attendance via this button, they view stats.
    // This is intentionally stubbed.
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
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
        <ActivityIndicator size="large" color="#35A7C4" />
        <Text style={{ marginTop: 12, color: '#7C8BA1', fontFamily: 'Outfit-Medium' }}>Loading your schedule...</Text>
      </View>
    );
  }

  const navBarWidth = Dimensions.get('window').width - 40;
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
      
      {/* Top Header Bar for non-home tabs */}
      {activeTab !== 'home' && (
        <View style={styles.topHeaderBar}>
          <TouchableOpacity 
            style={styles.topAvatarCircle} 
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={24} color="#7C8BA1" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.topCloseSquare} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="close" size={18} color="#2C3A4E" />
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
                  colors={['#F3F7FD', 'rgba(243, 247, 253, 0.95)', 'rgba(243, 247, 253, 0.3)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.7, y: 0 }}
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
                        <MaterialCommunityIcons name="account" size={22} color="#35A7C4" />
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.headerCloseSquare} 
                      onPress={handleLogout}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#35A7C4" />
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
                        <View style={[styles.badgeDot, { backgroundColor: lecture.isLive ? '#35A7C4' : '#d97706' }]} />
                        <Text style={[styles.badgeText, { color: lecture.isLive ? '#35A7C4' : '#92400e' }]}>
                          {lecture.isLive ? 'LIVE NOW' : 'UPCOMING'}
                        </Text>
                      </View>
                      <Text style={styles.cardTime}>{lecture.start_time?.substring(0, 5)} - {lecture.end_time?.substring(0, 5)}</Text>
                    </View>

                    <Text style={styles.cardCourseName}>{lecture.course_name}</Text>
                    
                    <View style={styles.cardInfoRow}>
                      <View style={styles.cardPill}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#35A7C4" />
                        <Text style={styles.cardPillText}>{lecture.room_name}</Text>
                      </View>
                    </View>

                    {lecture.isLive && (
                      <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                          <Text style={styles.statNumber}>{lecture.attendance_stats?.total_marked || 0}</Text>
                          <Text style={styles.statLabel}>Marked</Text>
                        </View>
                        <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}>
                          <Text style={styles.statNumber}>{lecture.attendance_stats?.total_present || 0}</Text>
                          <Text style={styles.statLabel}>Present</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statNumber}>{lecture.attendance_stats?.total_absent || 0}</Text>
                          <Text style={styles.statLabel}>Absent</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyStateCard}>
                    <View style={styles.emptyIconCircle}>
                      <MaterialCommunityIcons name="calendar-blank" size={36} color="#7C8BA1" />
                    </View>
                    <Text style={styles.emptyTitle}>No Lectures Scheduled</Text>
                    <Text style={styles.emptySubtitle}>You're all caught up for today.</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'settings' && (
            <View style={[styles.profileContainer, { paddingHorizontal: 20 }]}>
              {/* Profile Image card matching mockup */}
              <View style={styles.profileImageContainer}>
                <View style={styles.largeProfileCircle}>
                  <MaterialCommunityIcons name="account" size={72} color="#7C8BA1" />
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
                style={styles.logoutBtn} 
                onPress={handleOpenFaceRegister} 
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="face-recognition" size={20} color="#35A7C4" style={{ marginRight: 8 }} />
                <Text style={[styles.logoutBtnText, { color: '#35A7C4' }]}>Register Face ID</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.logoutBtn} 
                onPress={() => setIsPasswordModalOpen(true)} 
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="lock-reset" size={20} color="#35A7C4" style={{ marginRight: 8 }} />
                <Text style={[styles.logoutBtnText, { color: '#35A7C4' }]}>Change Password</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                <MaterialCommunityIcons name="logout" size={20} color="#E11D48" style={{ marginRight: 8 }} />
                <Text style={[styles.logoutBtnText, { color: '#E11D48' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'search' && (
            <View style={{ width: '100%', paddingHorizontal: 20 }}>
              <Text style={styles.tabSectionTitle}>Search & Reports</Text>
              
              <View style={styles.searchInputWrapper}>
                <MaterialCommunityIcons name="magnify" size={22} color="#7C8BA1" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchBar}
                  placeholder="Search classes or dates..."
                  placeholderTextColor="#7C8BA1"
                />
              </View>

              {/* Stub for reports/attendance log */}
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="file-chart-outline" size={36} color="#7C8BA1" />
                </View>
                <Text style={styles.emptyTitle}>No search results</Text>
                <Text style={styles.emptySubtitle}>Start typing to search your attendance logs.</Text>
              </View>
            </View>
          )}

          {activeTab === 'menu' && (
            <View style={{ width: '100%', paddingHorizontal: 20 }}>
              <Text style={styles.tabSectionTitle}>Today's Actions</Text>

              <TouchableOpacity 
                style={styles.quickActionCard} 
                onPress={() => navigation.navigate('LecturerTimetable', { user_id })}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: '#E6F4F2' }]}>
                  <MaterialCommunityIcons name="calendar-clock" size={26} color="#35A7C4" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.menuCardTitle}>My Timetable</Text>
                  <Text style={styles.menuCardDesc}>View your weekly lecture schedule</Text>
                </View>
                <View style={styles.menuChevron}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#35A7C4" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickActionCard} 
                onPress={() => navigation.navigate('LecturerReport', { user_id })}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: '#FFF8E1' }]}>
                  <MaterialCommunityIcons name="file-chart" size={26} color="#FFB300" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.menuCardTitle}>Attendance Reports</Text>
                  <Text style={styles.menuCardDesc}>View student attendance for your subjects</Text>
                </View>
                <View style={styles.menuChevron}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#FFB300" />
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
              <MaterialCommunityIcons name="close" size={24} color="#2C3A4E" />
            </TouchableOpacity>
            <Text style={styles.faceOverlayTitle}>Register Face</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.faceCameraContainer}>
            <View style={styles.cameraContainer}>
              <View style={styles.cameraShadowCircle} />
              <View style={styles.cameraWrapper}>
                <CameraView
                  ref={cameraRef}
                  style={styles.cameraView}
                  facing="front"
                />
              </View>
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
                  <MaterialCommunityIcons name="close" size={24} color="#7C8BA1" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Current Password *</Text>
                  <View style={styles.modalInputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Enter current password"
                      placeholderTextColor="#7C8BA1"
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      secureTextEntry={true}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>New Password *</Text>
                  <View style={styles.modalInputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Enter new password"
                      placeholderTextColor="#7C8BA1"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={true}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password *</Text>
                  <View style={styles.modalInputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#7C8BA1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Confirm new password"
                      placeholderTextColor="#7C8BA1"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={true}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {changingPassword ? (
                  <ActivityIndicator size="large" color="#35A7C4" style={{ marginVertical: 20 }} />
                ) : (
                  <View style={styles.submitButtonShadowContainer}>
                    <TouchableOpacity style={styles.submitButton} onPress={handleChangePassword}>
                      <Text style={styles.submitButtonText}>Update Password</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
            <Text style={styles.logoutModalMessage}>Do you want to log out of your session?</Text>
            
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

      {/* AI Chatbot FAB */}
      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => navigation.navigate('ChatScreen')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#35A7C4', '#2CA0C4']}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="robot-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Custom Bottom Curved Tab Bar matching attached mockup */}
      <View style={styles.navBarContainer}>
        <View style={styles.navBar}>
          
          {/* Absolute Sliding Active Indicator */}
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
                  activeTab === 'settings' ? 'cog' :
                  activeTab === 'search' ? 'magnify' : 'apps'
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

          {/* Tab 2: Settings */}
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <Animated.View style={makeIconStyle(1)}>
              <MaterialCommunityIcons name="cog-outline" size={24} color="#7C8BA1" />
            </Animated.View>
          </TouchableOpacity>

          {/* Tab 3: Search */}
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('search')}
            activeOpacity={0.8}
          >
            <Animated.View style={makeIconStyle(2)}>
              <MaterialCommunityIcons name="magnify" size={24} color="#7C8BA1" />
            </Animated.View>
          </TouchableOpacity>

          {/* Tab 4: Menu */}
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('menu')}
            activeOpacity={0.8}
          >
            <Animated.View style={makeIconStyle(3)}>
              <MaterialCommunityIcons name="apps" size={24} color="#7C8BA1" />
            </Animated.View>
          </TouchableOpacity>

        </View>
      </View>
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
  
  // Top Header Row for non-home tabs
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 12,
    backgroundColor: '#ECF0F3',
    zIndex: 10,
  },
  topAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCloseSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  scrollContent: { 
    flexGrow: 1,
    paddingBottom: 120, // Extra padding to scroll past the absolute bottom nav bar
    alignItems: 'center',
    width: '100%',
  },

  // Curved Header Block matching mockup with Solid Green Field and Full-Opacity Right Image
  headerContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#ECF0F3', // Matches canvas
    borderBottomLeftRadius: 60, // Curved bottom left
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
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCloseSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerWelcomeSection: {
    marginTop: 10,
  },
  headerGreetingText: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    color: '#35A7C4', // Cyan accent
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerStudentNameText: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  headerClockSection: {
    alignItems: 'flex-start',
  },
  headerClockText: {
    fontSize: 44,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    letterSpacing: -0.5,
  },
  headerDateText: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: '#7C8BA1',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  homeContentPadding: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  tabSectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    marginBottom: 16,
    letterSpacing: -0.2,
  },

  // Lectures Card styles (Curved Neumorphic raised card)
  lectureCard: {
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    padding: 24,
    width: '100%',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  lectureCardLive: {
    borderColor: '#35A7C4',
    borderWidth: 1.5,
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
    backgroundColor: 'rgba(53, 167, 196, 0.12)',
  },
  badgeUpcoming: {
    backgroundColor: '#FEF3C7',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.3,
  },
  cardTime: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    color: '#7C8BA1',
  },
  cardCourseName: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
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
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    // Sunken border simulation
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  cardPillText: {
    color: '#2C3A4E',
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
    marginLeft: 6,
  },
  markedBtn: {
    backgroundColor: '#10B981',
    borderRadius: 27,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markedBtnText: {
    color: '#fff',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginLeft: 8,
  },

  // Empty state card
  emptyStateCard: {
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#ECF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#7C8BA1',
    fontFamily: 'Outfit-Medium',
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
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 12,
  },
  profilePhotoLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: '#7C8BA1',
  },
  profileForm: {
    width: '100%',
    marginBottom: 24,
  },
  profileField: {
    width: '100%',
    backgroundColor: '#ECF0F3',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
    // Sunken border simulation
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  profileFieldLabel: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#7C8BA1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  profileFieldValue: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
  },
  logoutBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECF0F3',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#FFFFFF',
    borderLeftColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#D1D9E6',
    borderRightColor: '#D1D9E6',
  },
  logoutBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },

  // Search tab styles
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    // Sunken border simulation
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C3A4E',
    fontFamily: 'Outfit-Medium',
  },

  // Quick Tools styles
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 3,
  },
  menuIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
  menuCardTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
  },
  menuCardDesc: {
    fontSize: 12,
    color: '#7C8BA1',
    fontFamily: 'Outfit-Medium',
    marginTop: 2,
  },
  menuChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ECF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
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
    backgroundColor: '#ECF0F3', // Matches canvas
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
    backgroundColor: '#ECF0F3', // Matches canvas
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    top: 10, // Sits under the circle to blend
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#35A7C4', // Cyan active tab background
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
  
  // AI Chatbot FAB
  fabButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 100,
    shadowColor: '#288BA3',
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
    backgroundColor: '#ECF0F3',
    zIndex: 999,
  },
  faceOverlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  closeOverlayBtn: {
    padding: 5,
  },
  faceOverlayTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
  },
  faceCameraContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  cameraContainer: {
    width: 240,
    height: 240,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 30,
  },
  cameraShadowCircle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#ECF0F3',
    shadowColor: '#35A7C4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  cameraWrapper: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#35A7C4',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  faceInstructionText: {
    fontSize: 15,
    color: '#7C8BA1',
    fontFamily: 'Outfit-Medium',
    textAlign: 'center',
    marginBottom: 50,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#35A7C4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  // Modal / Change password styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
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
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: '#7C8BA1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Modal specific inputs (Sunken Neumorphic style)
  modalInputContainer: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECF0F3',
    paddingLeft: 18,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    // Sunken border simulation
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  modalTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#2C3A4E',
    fontFamily: 'Outfit-Medium',
  },

  // Primary Button wrappers
  submitButtonShadowContainer: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    marginVertical: 14,
    backgroundColor: '#ECF0F3', // Matches canvas
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButton: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#35A7C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    backgroundColor: '#E11D48', // Semantic red for log out
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutConfirmBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
});