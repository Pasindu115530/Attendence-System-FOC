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
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState({ username: false, password: false });
  
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

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });

      const result = await response.json();
      console.log("Response:", result);

      if (result.status === "success") {
        const user = result.data;
        if (user.role === "Admin" || user.role === "Lecturer") {
          navigation.replace('AdminDashboard', { user_id: user.user_id });
        } else if (user.role === "Student") {
          navigation.replace('UserDashboard', { user_id: user.user_id });
        }
      } else {
        Alert.alert("Login Failed", result.message);
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Error", "Could not connect to the server. Please check your internet connection.");
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
  
  footerText: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginTop: 24, fontSize: 13, fontWeight: '500' }
});