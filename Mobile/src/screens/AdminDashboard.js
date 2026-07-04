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
import { post } from '../api';

export default function AdminDashboard({ navigation }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Student states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStudentId, setFormStudentId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formBatchYear, setFormBatchYear] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
    if (!formStudentId.trim() || !formFullName.trim() || !formNic.trim()) {
      Alert.alert("Error", "Student ID, Full Name and NIC are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await post('/add_student', {
        user_id: formStudentId.trim(),
        full_name: formFullName.trim(),
        nic: formNic.trim(),
        dept_id: formDeptId.trim(),
        batch_year: formBatchYear.trim() ? parseInt(formBatchYear.trim()) : null
      });

      if (res.status === 'success') {
        Alert.alert("Success", "Student added successfully!");
        setIsModalOpen(false);
        setFormStudentId('');
        setFormFullName('');
        setFormNic('');
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
    Alert.alert("Logout", "ඔබට පද්ධතියෙන් ඉවත් වීමට අවශ්‍යද?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, Logout", onPress: () => navigation.replace('Login'), style: 'destructive' }
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
                  <Text style={styles.inputLabel}>Student ID (Username for Login) *</Text>
                  <View style={styles.rowInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="e.g. S001"
                      placeholderTextColor="#94a3b8"
                      value={formStudentId}
                      onChangeText={setFormStudentId}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.generatorBtn} onPress={generateStudentId}>
                      <Text style={styles.generatorBtnText}>Generate</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Pasindu Udana"
                    placeholderTextColor="#94a3b8"
                    value={formFullName}
                    onChangeText={setFormFullName}
                  />
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
                    <TouchableOpacity style={styles.generatorBtn} onPress={generatePassword}>
                      <Text style={styles.generatorBtnText}>Generate</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Department</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Computing"
                    placeholderTextColor="#94a3b8"
                    value={formDeptId}
                    onChangeText={setFormDeptId}
                  />
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

                {submitting ? (
                  <ActivityIndicator size="large" color="#007A68" style={{ marginVertical: 20 }} />
                ) : (
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
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  }
});