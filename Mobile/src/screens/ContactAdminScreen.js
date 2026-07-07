import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { post } from '../api';

const { width, height } = Dimensions.get('window');

export default function ContactAdminScreen({ navigation }) {
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('Student'); // 'Student' or 'Lecturer'
  const [message, setMessage] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'error' });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const notificationAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    // Screen transition on load
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const showNotification = (msg, type = 'error') => {
    setNotification({ visible: true, message: msg, type });

    Animated.spring(notificationAnim, {
      toValue: Platform.OS === 'ios' ? 60 : 30,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();

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

  const handleContactAction = async (type) => {
    let url = '';
    if (type === 'phone') {
      url = 'tel:+94112802000';
    } else if (type === 'email') {
      url = 'mailto:foc.admin@sjp.ac.lk?subject=FOC%20CheckIn%20Account%20Request';
    } else if (type === 'web') {
      url = 'https://foc.sjp.ac.lk';
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showNotification(`Could not launch the application for this action. Contact detail is: ${url.replace('tel:', '').replace('mailto:', '').replace('https://', '')}`);
      }
    } catch (error) {
      showNotification('An error occurred while opening the link.');
    }
  };

  const handleSubmitRequest = async () => {
    if (!name.trim()) {
      showNotification('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showNotification('Please enter a valid email address.');
      return;
    }
    if (!message.trim()) {
      showNotification('Please enter a message details.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await post('/submit_login_request', {
        name: name.trim(),
        email: email.trim(),
        user_id: userId.trim(),
        role: role,
        message: message.trim()
      });

      if (res.status === 'success') {
        setName('');
        setEmail('');
        setUserId('');
        setMessage('');
        showNotification('Your request has been sent to the administrator. We will review and contact you shortly.', 'success');
      } else {
        showNotification(res.message || 'Failed to send request. Please try again.');
      }
    } catch (err) {
      console.error(err);
      showNotification('Could not connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  {notification.type === 'error' ? 'Error' : 'Success'}
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

        {/* Background Waves */}
        <View style={styles.topWave1} pointerEvents="none" />
        <View style={styles.topWave2} pointerEvents="none" />
        <View style={styles.bottomWave1} pointerEvents="none" />
        <View style={styles.bottomWave2} pointerEvents="none" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Custom Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color="#35A7C4" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Contact Administrator</Text>
            <View style={{ width: 44 }} />
          </View>

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
              {/* Logo / Branding */}
              <View style={styles.creativeLogoRow}>
                <Text style={styles.focText}>FOC</Text>
                <Text style={styles.checkText}>Check</Text>
                <View style={styles.inBadge}>
                  <Text style={styles.inText}>In</Text>
                </View>
              </View>

              <Text style={styles.welcomeText}>Need an Account?</Text>
              <Text style={styles.subtitleText}>
                Registration is managed by the FOC administration. Get in touch directly or submit a registration request below.
              </Text>

              {/* Direct Contact Cards */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Direct Contacts</Text>

                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleContactAction('email')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.contactIconCircle, { backgroundColor: '#e0f2fe' }]}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#0369a1" />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactLabel}>Email Address</Text>
                    <Text style={styles.contactValue}>foc.admin@sjp.ac.lk</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#7C8BA1" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleContactAction('phone')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.contactIconCircle, { backgroundColor: '#f0fdf4' }]}>
                    <MaterialCommunityIcons name="phone-outline" size={20} color="#15803d" />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactLabel}>Faculty Office</Text>
                    <Text style={styles.contactValue}>+94 11 280 2000</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#7C8BA1" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleContactAction('web')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.contactIconCircle, { backgroundColor: '#faf5ff' }]}>
                    <MaterialCommunityIcons name="web" size={20} color="#6b21a8" />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactLabel}>Official Website</Text>
                    <Text style={styles.contactValue}>foc.sjp.ac.lk</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#7C8BA1" />
                </TouchableOpacity>
              </View>

              {/* Contact Form Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Submit Request</Text>

                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="account-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Full Name"
                    placeholderTextColor="#7C8BA1"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="email-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email Address"
                    placeholderTextColor="#7C8BA1"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={22} color="#7C8BA1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Student / Lecturer ID (Optional)"
                    placeholderTextColor="#7C8BA1"
                    value={userId}
                    onChangeText={setUserId}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Role Selection Toggle */}
                <View style={styles.roleContainer}>
                  <Text style={styles.roleLabel}>I am a:</Text>
                  <View style={styles.roleSelector}>
                    <TouchableOpacity
                      style={[styles.roleOption, role === 'Student' && styles.roleOptionActive]}
                      onPress={() => setRole('Student')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleText, role === 'Student' && styles.roleTextActive]}>Student</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleOption, role === 'Lecturer' && styles.roleOptionActive]}
                      onPress={() => setRole('Lecturer')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleText, role === 'Lecturer' && styles.roleTextActive]}>Lecturer</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <MaterialCommunityIcons name="pencil-outline" size={22} color="#7C8BA1" style={[styles.inputIcon, { marginTop: 12 }]} />
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Message (e.g. Please register my account under batch 2022/2023)"
                    placeholderTextColor="#7C8BA1"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.actionButtonShadowContainer}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleSubmitRequest}
                    disabled={isSubmitting}
                    activeOpacity={0.9}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ alignSelf: 'center', flex: 1 }} />
                    ) : (
                      <>
                        <View style={styles.buttonIconCircle}>
                          <MaterialCommunityIcons name="send" size={18} color="#35A7C4" />
                        </View>
                        <Text style={styles.actionButtonText}>SUBMIT REQUEST</Text>
                        <View style={{ width: 42 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Footer */}
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
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
  creativeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  focText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#2C3A4E',
    letterSpacing: 1.5,
  },
  checkText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 26,
    color: '#2C3A4E',
    marginLeft: 5,
  },
  inBadge: {
    backgroundColor: '#35A7C4',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 5,
    shadowColor: '#35A7C4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  inText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  welcomeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#2C3A4E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#7C8BA1',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  card: {
    width: '100%',
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#2C3A4E',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: '#7C8BA1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2C3A4E',
    marginTop: 2,
  },

  // Sunken Neumorphic Inputs
  inputContainer: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  textAreaContainer: {
    height: 120,
    borderRadius: 18,
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    fontFamily: 'Outfit-Medium',
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#2C3A4E',
  },
  textArea: {
    paddingTop: 12,
    paddingBottom: 12,
    height: '100%',
  },

  // Role selectors
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 6,
    marginBottom: 14,
  },
  roleLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: '#7C8BA1',
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: '#ECF0F3',
    borderRadius: 20,
    padding: 3,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 17,
  },
  roleOptionActive: {
    backgroundColor: '#35A7C4', // Cyan active selector
  },
  roleText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: '#7C8BA1',
  },
  roleTextActive: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },

  // Submit Button
  actionButtonShadowContainer: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    marginTop: 10,
    backgroundColor: '#ECF0F3',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButton: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#35A7C4', // Solid cyan
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  buttonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF', // White circle for send icon
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#FFFFFF', // White text
    letterSpacing: 1.2,
  },

  // Footer credits
  footerContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Outfit-SemiBold',
    textAlign: 'center',
    color: '#7C8BA1',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  footerSubText: {
    fontFamily: 'Outfit-SemiBold',
    textAlign: 'center',
    color: '#7C8BA1',
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Toast Notification
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
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  notificationMessage: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    marginTop: 2,
  },
  notificationClose: {
    marginLeft: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});
