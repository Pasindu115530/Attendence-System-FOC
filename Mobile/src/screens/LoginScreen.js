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
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView } from 'expo-camera';
import { post, upload } from '../api';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState({ username: false, password: false });
  const [loadingFace, setLoadingFace] = useState(false);
  const [isFaceLoginMode, setIsFaceLoginMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('Position your face in the scan area');
  
  const cameraRef = useRef(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
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

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    try {
      // POST /login  →  { status, data: { user_id, nic, role } }
      const result = await post('/login', { username, password });
      console.log("Login Response:", result);

      if (result.status === "success") {
        const user = result.data;          // { user_id, nic, role }
        if (user.role === "Admin" || user.role === "Lecturer") {
          navigation.replace('AdminDashboard', { user_id: user.user_id });
        } else if (user.role === "Student") {
          navigation.replace('UserDashboard', { user_id: user.user_id });
        } else {
          Alert.alert("Login Failed", "Unknown user role: " + user.role);
        }
      } else {
        Alert.alert("Login Failed", result.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Error", "Could not connect to the server. Please check your connection.");
    }
  };

  const handleFaceLogin = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
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
          setScanningStatus('Scanning for face...');
          setIsProcessing(false);
          return;
        }

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
          // Fallback
          console.log("Fallback: Inferring role from user_id prefix...");
          const lowerId = studentId.toLowerCase();
          if (lowerId.startsWith('admin') || lowerId.startsWith('l')) {
             navigation.replace('AdminDashboard', { user_id: studentId });
          } else {
             navigation.replace('UserDashboard', { user_id: studentId });
          }
        }
      } else {
        setScanningStatus('Scanning for face...');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Auto face login error:", err);
      setScanningStatus('Scanning for face...');
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.keyboardView}
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
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="school-outline" size={48} color="#fff" />
              </View>
              <Text style={styles.title}>StudyNest</Text>
              <Text style={styles.subtitle}>Smart Attendance System</Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              {isFaceLoginMode ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.cardTitle}>Face Verification</Text>
                  <Text style={[styles.cardSubtitle, { color: '#667eea', fontWeight: '700' }]}>{scanningStatus}</Text>

                  {/* Centered Camera Preview */}
                  <View style={styles.cameraWrapper}>
                    <CameraView
                      ref={cameraRef}
                      style={styles.cameraView}
                      facing="front"
                    />
                    <View style={styles.scanTargetBox} />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setIsFaceLoginMode(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Welcome Back</Text>
                  <Text style={styles.cardSubtitle}>Sign in to your account</Text>

                  <View style={[
                    styles.inputContainer,
                    isFocused.username && styles.inputContainerFocused
                  ]}>
                    <MaterialCommunityIcons 
                      name="account-outline" 
                      size={20} 
                      color={isFocused.username ? '#667eea' : '#94a3b8'} 
                      style={styles.inputIcon}
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Username" 
                      placeholderTextColor="#94a3b8"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      onFocus={() => setIsFocused({ ...isFocused, username: true })}
                      onBlur={() => setIsFocused({ ...isFocused, username: false })}
                    />
                  </View>

                  <View style={[
                    styles.inputContainer,
                    isFocused.password && styles.inputContainerFocused
                  ]}>
                    <MaterialCommunityIcons 
                      name="lock-outline" 
                      size={20} 
                      color={isFocused.password ? '#667eea' : '#94a3b8'} 
                      style={styles.inputIcon}
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Password" 
                      placeholderTextColor="#94a3b8"
                      secureTextEntry 
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setIsFocused({ ...isFocused, password: true })}
                      onBlur={() => setIsFocused({ ...isFocused, password: false })}
                    />
                  </View>

                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleLogin}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>Sign In</Text>
                      <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Face Login Button */}
                  <TouchableOpacity 
                    style={[styles.button, styles.faceButton]} 
                    onPress={handleFaceLogin}
                    activeOpacity={0.8}
                  >
                    <View style={styles.faceButtonContent}>
                      <MaterialCommunityIcons name="face-recognition" size={22} color="#667eea" style={{ marginRight: 8 }} />
                      <Text style={styles.faceButtonText}>Use Face ID Login</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={styles.footerText}>Faculty of Computing</Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: '500' },
  
  card: { 
    backgroundColor: '#fff', 
    padding: 28, 
    borderRadius: 28, 
    elevation: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 30 
  },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  cardSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  
  inputContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc', 
    paddingHorizontal: 16,
    borderRadius: 16, 
    marginBottom: 16, 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0',
    height: 56
  },
  inputContainerFocused: { 
    borderColor: '#667eea', 
    backgroundColor: '#fff',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  
  button: { borderRadius: 16, marginTop: 8, overflow: 'hidden', elevation: 4 },
  buttonGradient: { 
    paddingVertical: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  faceButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#667eea',
    elevation: 0,
    marginTop: 0,
  },
  faceButtonContent: {
    height: 54,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  faceButtonText: {
    color: '#667eea',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  
  cameraWrapper: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: '#000',
  },
  cameraView: {
    width: '100%',
    height: '100%',
  },
  scanTargetBox: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#64748b',
    elevation: 0,
    marginTop: 10,
    width: '100%',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 16,
  },
  
  footerText: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginTop: 24, fontSize: 13, fontWeight: '500' }
});