import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView } from 'expo-camera';
import { post, upload } from '../api';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  // Loading screen state
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Screen toggle state: false = Login, true = Create Account
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');



  // Face Login states
  const [isFaceLoginMode, setIsFaceLoginMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('Position your face in the scan area');
  
  const cameraRef = useRef(null);
  const failedAttemptsRef = useRef(0);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarScale = useRef(new Animated.Value(0.6)).current;
  const radarOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation loop for the loading screen logo
    let pulseLoop = null;
    let radarLoop = null;
    
    if (isAppLoading) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();

      radarLoop = Animated.loop(
        Animated.parallel([
          Animated.timing(radarScale, { toValue: 2.2, duration: 2200, useNativeDriver: true }),
          Animated.timing(radarOpacity, { toValue: 0, duration: 2200, useNativeDriver: true }),
        ])
      );
      radarLoop.start();
    }

    // Load transition
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    // Auto loading redirection to Face ID
    const timer = setTimeout(() => {
      setIsAppLoading(false);
      handleFaceLogin();
    }, 2000);

    return () => {
      if (pulseLoop) pulseLoop.stop();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let intervalId = null;

    if (isFaceLoginMode && !isProcessing) {
      // Periodic automatic capture every 3.5 seconds
      intervalId = setInterval(() => {
        autoCaptureAndVerify();
      }, 3500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isFaceLoginMode, isProcessing]);



  // Custom modern notification toast state
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'error' });
  const notificationAnim = useRef(new Animated.Value(-150)).current;

  const showNotification = (message, type = 'error') => {
    setNotification({ visible: true, message, type });
    
    // Slide down
    Animated.spring(notificationAnim, {
      toValue: Platform.OS === 'ios' ? 60 : 30,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();

    // Automatically hide after 4 seconds
    const timer = setTimeout(() => {
      Animated.timing(notificationAnim, {
        toValue: -150,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setNotification(prev => ({ ...prev, visible: false }));
      });
    }, 4000);

    return timer;
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showNotification("Please enter both username and password");
      return;
    }

    try {
      const result = await post('/login', { username, password });
      console.log("Login Response:", result);

      if (result.status === "success") {
        const user = result.data;
        if (user.role === "Admin" || user.role === "Lecturer") {
          navigation.replace('AdminDashboard', { user_id: user.user_id });
        } else if (user.role === "Student") {
          navigation.replace('UserDashboard', { user_id: user.user_id });
        } else {
          showNotification("Unknown user role: " + user.role);
        }
      } else {
        showNotification(result.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login Error:", error);
      showNotification("Could not connect to the server. Please check your connection.");
    }
  };



  const handleFaceLogin = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      failedAttemptsRef.current = 0;
      setIsFaceLoginMode(true);
      setIsProcessing(false);
      setScanningStatus('Position your face in the scan area');
    } else {
      Alert.alert("Permission Denied", "Camera permission is required to use face login.");
    }
  };

  const autoCaptureAndVerify = async () => {
    if (isProcessing || !isFaceLoginMode) return;
    setIsProcessing(true);
    setScanningStatus('Analyzing frame...');

    try {
      if (!cameraRef.current) {
        setIsProcessing(false);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1,
      });

      setScanningStatus('Verifying face signature...');
      
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

      console.log("Auto-capturing frame...");
      const faceRes = await upload('/verify-face', formData);
      console.log("Auto-face Verify Response:", faceRes);

      if (faceRes.status === "success") {
        const studentId = faceRes.data?.student_id;
        if (!studentId) {
          failedAttemptsRef.current += 1;
          if (failedAttemptsRef.current >= 3) {
            setIsFaceLoginMode(false);
            setIsProcessing(false);
            showNotification("User not found");
            failedAttemptsRef.current = 0;
          } else {
            setScanningStatus('Scanning for face...');
            setIsProcessing(false);
          }
          return;
        }

        failedAttemptsRef.current = 0;
        setScanningStatus('Matched! Logging in...');
        const userRes = await post('/get_user_by_id', { user_id: studentId });
        
        setIsFaceLoginMode(false);
        if (userRes.status === "success") {
          const user = userRes.data;
          if (user.role === "Admin" || user.role === "Lecturer") {
             navigation.replace('AdminDashboard', { user_id: user.user_id });
          } else {
             navigation.replace('UserDashboard', { user_id: user.user_id });
          }
        } else {
          console.log("Fallback: Inferring role from user_id prefix...");
          const lowerId = studentId.toLowerCase();
          if (lowerId.startsWith('admin') || lowerId.startsWith('l')) {
             navigation.replace('AdminDashboard', { user_id: studentId });
          } else {
             navigation.replace('UserDashboard', { user_id: studentId });
          }
        }
      } else {
        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current >= 3) {
          setIsFaceLoginMode(false);
          setIsProcessing(false);
          showNotification("User not found");
          failedAttemptsRef.current = 0;
        } else {
          setScanningStatus('Scanning for face...');
          setIsProcessing(false);
        }
      }
    } catch (err) {
      console.error("Auto face login error:", err);
      failedAttemptsRef.current += 1;
      if (failedAttemptsRef.current >= 3) {
        setIsFaceLoginMode(false);
        setIsProcessing(false);
        showNotification("User not found");
        failedAttemptsRef.current = 0;
      } else {
        setScanningStatus('Scanning for face...');
        setIsProcessing(false);
      }
    }
  };

  if (isAppLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={['#029A84', '#007A68', '#004D40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        >
          {/* Layered Organic Waves */}
          <View style={styles.topWave1} pointerEvents="none" />
          <View style={styles.topWave2} pointerEvents="none" />
          <View style={styles.bottomWave1} pointerEvents="none" />
          <View style={styles.bottomWave2} pointerEvents="none" />

          <View style={styles.loadingContainer}>
            {/* Radar scanner glow ring */}
            <View style={styles.radarWrapper}>
              <Animated.View 
                style={[
                  styles.radarCircle, 
                  { 
                    transform: [{ scale: radarScale }], 
                    opacity: radarOpacity 
                  }
                ]} 
              />
              {/* Circular Central Face ID Logo container */}
              <Animated.View style={[styles.logoCircle, { transform: [{ scale: pulseAnim }] }]}>
                <MaterialCommunityIcons name="face-recognition" size={46} color="#007A68" />
              </Animated.View>
            </View>

            {/* FOC CheckIn Creative Text Layout */}
            <View style={styles.creativeLogoRow}>
              <Text style={styles.focText}>FOC</Text>
              <Text style={styles.checkText}>Check</Text>
              <View style={styles.inBadge}>
                <Text style={styles.inText}>In</Text>
              </View>
            </View>

            {/* Subtext */}
            <Text style={styles.subtitleTextLoading}>Smart Attendance</Text>

            {/* Spinner & Text */}
            <ActivityIndicator size="large" color="#5eead4" style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Initializing Face ID...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#029A84', '#007A68', '#004D40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        {/* Custom Toast Notification Banner */}
        {notification.visible && (
          <Animated.View 
            style={[
              styles.notificationBox, 
              { transform: [{ translateY: notificationAnim }] }
            ]}
          >
            <View style={[styles.notificationContent, notification.type === 'error' ? styles.notificationError : styles.notificationSuccess]}>
              <MaterialCommunityIcons 
                name={notification.type === 'error' ? "alert-circle-outline" : "check-circle-outline"} 
                size={22} 
                color="#fff" 
                style={styles.notificationIcon} 
              />
              <View style={styles.notificationTextContainer}>
                <Text style={styles.notificationTitle}>
                  {notification.type === 'error' ? 'Login Failed' : 'Success'}
                </Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  Animated.timing(notificationAnim, {
                    toValue: -150,
                    duration: 250,
                    useNativeDriver: true,
                  }).start(() => setNotification(prev => ({ ...prev, visible: false })));
                }}
                style={styles.notificationClose}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={16} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        {/* Layered Organic Waves */}
        <View style={styles.topWave1} pointerEvents="none" />
        <View style={styles.topWave2} pointerEvents="none" />
        <View style={styles.bottomWave1} pointerEvents="none" />
        <View style={styles.bottomWave2} pointerEvents="none" />

        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View 
              style={[
                styles.content,
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }] 
                }
              ]}
            >
              {/* FOC CheckIn Creative Text Layout */}
              <View style={styles.creativeLogoRow}>
                <Text style={styles.focText}>FOC</Text>
                <Text style={styles.checkText}>Check</Text>
                <View style={styles.inBadge}>
                  <Text style={styles.inText}>In</Text>
                </View>
              </View>

              {isFaceLoginMode ? (
                /* Face Verification Screen Mode */
                <View style={styles.faceVerificationContainer}>
                  <Text style={styles.welcomeText}>Face Verification</Text>
                  <Text style={styles.faceStatusText}>{scanningStatus}</Text>

                  {/* Circular Glowing Camera View */}
                  <View style={styles.cameraWrapper}>
                    <CameraView
                      ref={cameraRef}
                      style={styles.cameraView}
                      facing="front"
                    />
                    <View style={styles.scanTargetBox} />
                  </View>

                  {/* Cancel Action Button (Red Chevron-style) */}
                  <TouchableOpacity
                    style={styles.cancelActionButton}
                    onPress={() => setIsFaceLoginMode(false)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cancelButtonIconCircle}>
                      <MaterialCommunityIcons name="close" size={22} color="#fff" />
                    </View>
                    <Text style={styles.cancelActionButtonText}>CANCEL</Text>
                    <View style={{ width: 42 }} />
                  </TouchableOpacity>
                </View>
              ) : !isSignUpMode ? (
                /* Login Screen Mode */
                <View style={styles.formContainer}>
                  <Text style={styles.welcomeText}>Welcome Back!</Text>

                  {/* Username/Email Input */}
                  <TextInput 
                    style={styles.input}
                    placeholder="email"
                    placeholderTextColor="#a0aec0"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  {/* Password Input */}
                  <TextInput 
                    style={styles.input}
                    placeholder="password"
                    placeholderTextColor="#a0aec0"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />

                  {/* LOG IN Action Button */}
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleLogin}
                    activeOpacity={0.9}
                  >
                    <View style={styles.buttonIconCircle}>
                      <MaterialCommunityIcons name="chevron-right" size={26} color="#fff" />
                    </View>
                    <Text style={styles.actionButtonText}>LOG IN</Text>
                    <View style={{ width: 42 }} />
                  </TouchableOpacity>

                  {/* FACE ID LOGIN Action Button */}
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleFaceLogin}
                    activeOpacity={0.9}
                  >
                    <View style={styles.buttonIconCircle}>
                      <MaterialCommunityIcons name="face-recognition" size={22} color="#fff" />
                    </View>
                    <Text style={styles.actionButtonText}>FACE ID LOGIN</Text>
                    <View style={{ width: 42 }} />
                  </TouchableOpacity>

                  {/* Switch to SignUp Toggle */}
                  <TouchableOpacity onPress={() => setIsSignUpMode(true)} activeOpacity={0.7}>
                    <Text style={styles.switchModeText}>Don't have an account ? Contact Administrator</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Contact Administrator Screen Mode */
                <View style={styles.formContainer}>
                  <Text style={styles.welcomeText}>Contact Administrator</Text>
                  
                  {/* Contact Info Card */}
                  <View style={styles.contactCard}>
                    <MaterialCommunityIcons name="shield-account-outline" size={48} color="#007A68" style={styles.contactIconCenter} />
                    
                    <Text style={styles.contactInfoDesc}>
                      Account registration is managed strictly by the administration. If you are a Student or Lecturer, please contact your Faculty Admin office to request an account.
                    </Text>
                    
                    <View style={styles.contactItem}>
                      <MaterialCommunityIcons name="email-outline" size={20} color="#007A68" />
                      <Text style={styles.contactItemText}>admin@foc.sjp.ac.lk</Text>
                    </View>
                    
                    <View style={styles.contactItem}>
                      <MaterialCommunityIcons name="office-building" size={20} color="#007A68" />
                      <Text style={styles.contactItemText}>Dean's Office, Faculty of Computing</Text>
                    </View>

                    <View style={styles.contactItem}>
                      <MaterialCommunityIcons name="phone-outline" size={20} color="#007A68" />
                      <Text style={styles.contactItemText}>+94 11 280 2000</Text>
                    </View>
                  </View>

                  {/* BACK TO LOGIN Action Button */}
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => setIsSignUpMode(false)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.buttonIconCircle}>
                      <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
                    </View>
                    <Text style={styles.actionButtonText}>BACK TO LOGIN</Text>
                    <View style={{ width: 42 }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Sub-Footer Faculty Text */}
              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Faculty of Computing</Text>
                <Text style={styles.footerSubText}>University of Sri Jayewardenepura</Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  gradient: { 
    flex: 1 
  },
  keyboardView: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 30, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30 
  },
  content: { 
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  
  // Custom styled waves matching the mockup curves
  topWave1: {
    position: 'absolute',
    width: width * 1.8,
    height: width * 1.8,
    borderRadius: width * 0.9,
    top: -width * 1.1,
    left: -width * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  topWave2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    top: -width * 1.05,
    left: -width * 0.1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomWave1: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    bottom: -width * 0.45,
    left: -width * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  bottomWave2: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    bottom: -width * 0.6,
    right: -width * 0.35,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },

  // Stylized "MO" Logo
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoMContainer: {
    alignItems: 'center',
  },
  logoBar: {
    width: 28,
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginBottom: 1,
  },
  logoTextM: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 48,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-condensed',
  },
  logoTextO: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 48,
    marginLeft: 1,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-condensed',
  },

  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  welcomeText: { 
    fontSize: 22, 
    color: '#fff', 
    textAlign: 'center', 
    fontWeight: '500',
    marginBottom: 24,
  },
  subtitleText: { 
    fontSize: 18, 
    color: '#fff', 
    textAlign: 'center', 
    fontWeight: '400',
    marginBottom: 20,
  },

  // Social Row
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  dividerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 14,
    fontWeight: '400',
  },

  // Pill-shaped TextInput
  input: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    fontSize: 16,
    color: '#2d3748',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },

  // Terms and conditions disclaimer
  disclaimerText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginHorizontal: 10,
    marginBottom: 20,
    fontWeight: '400',
  },
  disclaimerLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Capsule Action Button (LOG IN / CREATE)
  actionButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#009688',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00796B',
    letterSpacing: 1.5,
  },

  switchModeText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 10,
    textDecorationLine: 'underline',
  },

  // Face Verification Panel
  faceVerificationContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  faceStatusText: {
    color: '#ccffed',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  cameraWrapper: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#000',
    shadowColor: '#00BFA5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  cameraView: {
    width: '100%',
    height: '100%',
  },
  scanTargetBox: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },

  // Cancel Button styling consistent with mockup language
  cancelActionButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButtonIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e11d48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e11d48',
    letterSpacing: 1.5,
  },
  
  footerContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: { 
    textAlign: 'center', 
    color: 'rgba(255, 255, 255, 0.55)', 
    fontSize: 13, 
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerSubText: { 
    textAlign: 'center', 
    color: 'rgba(255, 255, 255, 0.55)', 
    fontSize: 12, 
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  radarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: 200,
    height: 200,
  },
  radarCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#5eead4',
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00BFA5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 2,
  },
  creativeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  focText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  },
  checkText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    marginLeft: 6,
  },
  inBadge: {
    backgroundColor: '#5eead4',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
    shadowColor: '#5eead4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  inText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#004D40',
  },
  subtitleTextLoading: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingSpinner: {
    marginTop: 40,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 15,
    letterSpacing: 1,
  },
  notificationBox: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  notificationError: {
    backgroundColor: 'rgba(225, 29, 72, 0.95)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  notificationSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  notificationMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  notificationClose: {
    marginLeft: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  contactCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contactIconCenter: {
    marginBottom: 16,
  },
  contactInfoDesc: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  contactItemText: {
    fontSize: 14,
    color: '#2d3748',
    marginLeft: 12,
    fontWeight: '600',
  }
});
