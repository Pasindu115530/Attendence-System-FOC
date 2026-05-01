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
  StatusBar
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function UserDashboard({ route, navigation }) {
  const { user_id } = route.params || { user_id: 'TEST001' }; 
  
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchDashboard();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_dashboard', user_id: user_id }),
      });
      const res = await response.json();
      if (res.status === 'success') setLecture(res.lecture);
    } catch (e) {
      Alert.alert("Error", "Could not fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    setMarking(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert("Permission denied");

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_attendance',
          user_id: user_id,
          course_id: lecture.course_id,
          timetable_id: lecture.id,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        }),
      });

      const res = await response.json();
      if (res.status === 'success') {
        Alert.alert(res.attendance_status === 'Present' ? "Success" : "Out of Range", res.message);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={{marginTop: 12, color: '#64748b', fontWeight: '500'}}>Loading your schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userId}>{user_id}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account" size={28} color="#667eea" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* Status Card */}
          <View style={[styles.statusCard, { borderColor: lecture?.isLive ? '#10b981' : '#f59e0b' }]}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusBadge, { backgroundColor: lecture?.isLive ? '#d1fae5' : '#fef3c7' }]}>
                <View style={[styles.statusDot, { backgroundColor: lecture?.isLive ? '#10b981' : '#f59e0b' }]} />
                <Text style={[styles.statusBadgeText, { color: lecture?.isLive ? '#065f46' : '#92400e' }]}>
                  {lecture?.isLive ? "LIVE NOW" : "UPCOMING"}
                </Text>
              </View>
            </View>

            {lecture ? (
              <>
                <Text style={styles.courseName}>{lecture.course_name}</Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#64748b" />
                    <Text style={styles.infoText}>{lecture.room_name}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#64748b" />
                    <Text style={styles.infoText}>{lecture.start_time}</Text>
                  </View>
                </View>

                {lecture.isLive && (
                  lecture.hasMarked ? (
                    <View style={[styles.actionBtn, styles.successBtn]}>
                      <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
                      <Text style={styles.actionBtnText}>Attendance Marked</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={handleMarkAttendance} 
                      disabled={marking}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionBtnGradient}
                      >
                        {marking ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="map-marker-radius" size={22} color="#fff" />
                            <Text style={styles.actionBtnText}>Mark Attendance</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialCommunityIcons name="calendar-blank" size={40} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyTitle}>No lectures scheduled</Text>
                <Text style={styles.emptySubtitle}>You're all caught up for now</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.menuCard}
            onPress={() => navigation.navigate('AbsentUploader', { studentId: user_id })}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="medical-bag" size={26} color="#f59e0b" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Upload Medical Report</Text>
              <Text style={styles.menuDesc}>Submit documents for absences</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuCard, { marginBottom: 20 }]}
            onPress={() => navigation.replace('Login')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#fee2e2' }]}>
              <MaterialCommunityIcons name="logout" size={26} color="#ef4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: '#ef4444' }]}>Sign Out</Text>
              <Text style={styles.menuDesc}>Logout from your account</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  
  header: { 
    paddingTop: 60, 
    paddingBottom: 40, 
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  userId: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 2 },
  avatarContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  
  scrollView: { flex: 1, marginTop: -20 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  
  statusCard: { 
    backgroundColor: '#fff', 
    padding: 24, 
    borderRadius: 24, 
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  
  courseName: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  infoText: { color: '#64748b', fontSize: 14, marginLeft: 6, fontWeight: '500' },
  
  actionBtn: { borderRadius: 16, overflow: 'hidden', elevation: 3 },
  actionBtnGradient: { 
    paddingVertical: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  successBtn: { backgroundColor: '#10b981', paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
  
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIconContainer: { 
    width: 72, 
    height: 72, 
    borderRadius: 24, 
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#475569' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 28, marginBottom: 14, marginLeft: 4 },
  
  menuCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  menuIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1, marginLeft: 14 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  menuDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 }
});