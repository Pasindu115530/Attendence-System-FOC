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
  Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminDashboard({ navigation }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchAdminData = useCallback(async () => {
    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_admin_dashboard' }),
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setLectures(data.lectures);
      } else {
        setLectures([]);
      }
    } catch (error) {
      console.error("Fetch Error: ", error);
      Alert.alert("Error", "Server එක සම්බන්ධ කර ගැනීමට නොහැකි විය.");
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
          <MaterialCommunityIcons name="school-outline" size={48} color="#667eea" />
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
            <Text style={styles.headerTitle}>Admin Panel</Text>
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
            <Text style={[styles.statNumber, { color: '#10b981' }]}>{liveLectures.length}</Text>
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
            tintColor="#667eea"
            colors={['#667eea']}
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
                      <MaterialCommunityIcons name="map-marker-radius" size={14} color="#667eea" />
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
            onPress={() => navigation.navigate('AttendanceReports')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
              <MaterialCommunityIcons name="file-chart-outline" size={26} color="#3b82f6" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Attendance Reports</Text>
              <Text style={styles.actionDesc}>View student attendance statistics by course</Text>
            </View>
            <View style={styles.chevronBg}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#3b82f6" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { marginBottom: 12 }]} 
            onPress={() => navigation.navigate('AddClassLocation')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
              <MaterialCommunityIcons name="map-marker-path" size={26} color="#ef4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.actionTitle}>Set Class Location</Text>
              <Text style={styles.actionDesc}>Define boundary points for geofencing</Text>
            </View>
            <View style={[styles.chevronBg, { backgroundColor: '#fef2f2' }]}>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#ef4444" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout from System</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
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
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  
  header: { 
    paddingTop: 60, 
    paddingBottom: 28, 
    paddingHorizontal: 24, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4, fontWeight: '500' },
  notifBtn: { 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    padding: 12, 
    borderRadius: 16,
    position: 'relative'
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
    borderColor: '#667eea'
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
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
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
    shadowColor: '#10b981',
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
    backgroundColor: '#eff6ff',
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
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15, marginLeft: 8 }
});