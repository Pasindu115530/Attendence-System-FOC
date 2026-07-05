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

export default function LoginScreen({ route, navigation }) {
  // Loading screen state
  const [isAppLoading, setIsAppLoading] = useState(route?.params?.autoFaceLogin !== false);

  // Screen toggle state: false = Login, true = Create Account
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showReTypePassword, setShowReTypePassword] = useState(false);

  // Sign Up form state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reTypePassword, setReTypePassword] = useState('');

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
    let timer = null;
    if (route?.params?.autoFaceLogin !== false) {
      timer = setTimeout(() => {
        setIsAppLoading(false);
        handleFaceLogin();
      }, 2000);
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
      if (timer) clearTimeout(timer);
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
          navigation.replace('UserDashboard', { user_id: user.user_id, user });
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

  const handleCreateAccount = () => {
    if (!signUpEmail || !newPassword || !reTypePassword) {
      showNotification("Please fill in all fields");
      return;
    }

    if (newPassword !== reTypePassword) {
      showNotification("Passwords do not match");
      return;
    }

    showNotification(
      "Account registration is managed by the administrator. Contact your Faculty Admin.",
      "success"
    );
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
        const studentId = faceRes.data?.index_number || faceRes.data?.student_id;
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
            navigation.replace('UserDashboard', { user_id: user.user_id, user });
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
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={['#F3F7FD', '#E5EDF9']}
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
                <MaterialCommunityIcons name="face-recognition" size={46} color="#35A7C4" />
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
            <ActivityIndicator size="large" color="#35A7C4" style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Initializing Face ID...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#F3F7FD', '#E5EDF9']}
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
                color={notification.type === 'error' ? "#E11D48" : "#10B981"}
                style={styles.notificationIcon}
              />
              <View style={styles.notificationTextContainer}>
                <Text style={[styles.notificationTitle, { color: notification.type === 'error' ? "#E11D48" : "#10B981" }]}>
                  {notification.type === 'error' ? 'Login Failed' : 'Success'}
                </Text>
                <Text style={[styles.notificationMessage, { color: '#2C3A4E' }]}>{notification.message}</Text>
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
                <MaterialCommunityIcons name="close" size={16} color="#7C8BA1" />
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
              <View style={styles.cardContainer}>
                {/* Top Avatar Circle from Mockup */}
                {!isFaceLoginMode && (
                  <View style={styles.avatarOutline}>
                    <View style={styles.avatarInner}>
                      <MaterialCommunityIcons name="face-recognition" size={38} color="#35A7C4" />
                    </View>
                  </View>
                )}

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

                    {/* Cancel Action Button */}
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setIsFaceLoginMode(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : !isSignUpMode ? (
                  /* Login Screen Mode */
                  <View style={styles.formContainer}>
                    <Text style={styles.welcomeText}>Welcome Back!</Text>

                    {/* Username/Email Input Container */}
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="account-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="email"
                        placeholderTextColor="#7C8BA1"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>

                    {/* Password Input Container */}
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="lock-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="password"
                        placeholderTextColor="#7C8BA1"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={showPassword ? "eye-outline" : "eye-off-outline"}
                          size={22}
                          color="#7C8BA1"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* LOG IN Action Button */}
                    <TouchableOpacity
                      style={styles.loginButton}
                      onPress={handleLogin}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.loginButtonText}>Login</Text>
                    </TouchableOpacity>

                    {/* FACE ID LOGIN Action Button */}
                    <TouchableOpacity
                      style={styles.faceIdButton}
                      onPress={handleFaceLogin}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="face-recognition" size={22} color="#35A7C4" style={{ marginRight: 8 }} />
                      <Text style={styles.faceIdButtonText}>Face ID Login</Text>
                    </TouchableOpacity>

                    {/* Switch to Contact Admin Screen */}
                    <TouchableOpacity onPress={() => navigation.navigate('ContactAdmin')} activeOpacity={0.7} style={styles.switchModeButton}>
                      <Text style={styles.switchModeText}>Don't have an account ? Contact Administrator</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Create Account Screen Mode */
                  <View style={styles.formContainer}>
                    <Text style={styles.welcomeText}>Create Account</Text>

                    {/* Sign Up Email */}
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="email-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="email"
                        placeholderTextColor="#7C8BA1"
                        value={signUpEmail}
                        onChangeText={setSignUpEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>

                    {/* New Password */}
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="lock-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="new password"
                        placeholderTextColor="#7C8BA1"
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                          size={22}
                          color="#7C8BA1"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Re-type Password */}
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="lock-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="re-type password"
                        placeholderTextColor="#7C8BA1"
                        secureTextEntry={!showReTypePassword}
                        value={reTypePassword}
                        onChangeText={setReTypePassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowReTypePassword(!showReTypePassword)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={showReTypePassword ? "eye-outline" : "eye-off-outline"}
                          size={22}
                          color="#7C8BA1"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Terms & Privacy Disclaimer */}
                    <Text style={styles.disclaimerText}>
                      By creating an account, you agree to our{' '}
                      <Text style={styles.disclaimerLink}>Terms of Service</Text> and{' '}
                      <Text style={styles.disclaimerLink}>Privacy Policy</Text>
                    </Text>

                    {/* CREATE Action Button */}
                    <TouchableOpacity
                      style={styles.loginButton}
                      onPress={handleCreateAccount}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.loginButtonText}>Create Account</Text>
                    </TouchableOpacity>

                    {/* Switch to Login Toggle */}
                    <View style={styles.footerLinks}>
                      <Text style={styles.footerLinkText}>Already have an account? </Text>
                      <TouchableOpacity onPress={() => setIsSignUpMode(false)} activeOpacity={0.7}>
                        <Text style={styles.footerLinkTextBold}>Log in</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

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
    flex: 1,
    backgroundColor: '#ECF0F3',
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 30,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  // Soft/Neumorphic Card Container
  cardContainer: {
    width: '100%',
    backgroundColor: '#ECF0F3',
    borderRadius: 36,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    marginTop: 10,
  },

  // Neumorphic Top Avatar Circle
  avatarOutline: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 20,
  },
  avatarInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },

  // Subtle background shadows / lights
  topWave1: {
    position: 'absolute',
    width: width * 1.8,
    height: width * 1.8,
    borderRadius: width * 0.9,
    top: -width * 1.1,
    left: -width * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  topWave2: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    top: -width * 1.05,
    left: -width * 0.1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bottomWave1: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    bottom: -width * 0.45,
    left: -width * 0.25,
    backgroundColor: 'rgba(163, 177, 198, 0.15)',
  },
  bottomWave2: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    bottom: -width * 0.6,
    right: -width * 0.35,
    backgroundColor: 'rgba(163, 177, 198, 0.1)',
  },

  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    color: '#2C3A4E',
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 22,
    letterSpacing: 0.5,
  },

  // Sunken Neumorphic Input Container
  inputContainer: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECF0F3',
    paddingLeft: 20,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#2C3A4E',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },

  // Convex/Raised Neumorphic Button for LOG IN
  loginButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#35A7C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
    shadowColor: '#288BA3',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Convex/Raised Neumorphic Button for FACE ID
  faceIdButton: {
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
  faceIdButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#35A7C4',
    letterSpacing: 0.5,
  },

  // Footer navigation links
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#7C8BA1',
    fontWeight: '500',
  },
  footerDivider: {
    fontSize: 14,
    color: '#7C8BA1',
    marginHorizontal: 4,
  },
  footerLinkTextBold: {
    fontSize: 14,
    color: '#35A7C4',
    fontWeight: '700',
  },

  // Disclaimer text in sign up
  disclaimerText: {
    color: '#7C8BA1',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginHorizontal: 10,
    marginBottom: 20,
    fontWeight: '400',
  },
  disclaimerLink: {
    fontWeight: '700',
    color: '#35A7C4',
    textDecorationLine: 'underline',
  },

  // Face Verification Screen Mode Styles
  faceVerificationContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  faceStatusText: {
    color: '#35A7C4',
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
    borderColor: '#35A7C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#000',
    shadowColor: '#35A7C4',
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

  // Cancel Button styling consistent with neumorphic design
  cancelButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECF0F3',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
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
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E11D48',
    letterSpacing: 0.5,
  },

  // Footer Faculty layout
  footerContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: '#7C8BA1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerSubText: {
    textAlign: 'center',
    color: '#7C8BA1',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Loading Screen Styles
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
    borderColor: '#35A7C4',
    backgroundColor: 'rgba(53, 167, 196, 0.12)',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  creativeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  focText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3A4E',
    letterSpacing: 1,
  },
  checkText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#2C3A4E',
    marginLeft: 4,
  },
  inBadge: {
    backgroundColor: '#35A7C4',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
    shadowColor: '#35A7C4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subtitleTextLoading: {
    fontSize: 13,
    color: '#7C8BA1',
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingSpinner: {
    marginTop: 40,
  },
  loadingText: {
    color: '#2C3A4E',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 15,
    letterSpacing: 1,
  },

  // Notification Toast Styles
  notificationBox: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    backgroundColor: '#ECF0F3',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  notificationError: {
    borderColor: '#E11D48',
  },
  notificationSuccess: {
    borderColor: '#10B981',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  notificationMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  notificationClose: {
    marginLeft: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  switchModeButton: {
    marginTop: 20,
    marginBottom: 6,
  },
  switchModeText: {
    color: '#35A7C4',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
