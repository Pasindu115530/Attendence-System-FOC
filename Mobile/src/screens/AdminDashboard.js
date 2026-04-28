import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  ActivityIndicator, 
  RefreshControl,
  Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminDashboard({ navigation }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // API එකෙන් දත්ත ලබාගැනීමේ function එක
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
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={{marginTop: 10, color: '#7f8c8d'}}>Loading Schedule...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f7f6' }}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>Faculty of Computing</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <MaterialCommunityIcons name="bell-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e74c3c" />}
      >
        {/* Statistics or Info Bar */}
        <View style={styles.infoBar}>
           <Text style={styles.infoBarText}>
             Total Lectures Today: <Text style={{fontWeight: 'bold'}}>{lectures.length}</Text>
           </Text>
        </View>

        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        
        {lectures.length > 0 ? (
          lectures.map((item, index) => (
            <View key={index} style={styles.lecCard}>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <View style={styles.dot} />
                  <Text style={styles.badgeText}>SCHEDULED</Text>
                </View>
                <Text style={styles.timeText}>
                  {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
                </Text>
              </View>
              <Text style={styles.courseName}>{item.course_name}</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="map-marker-radius" size={18} color="#e74c3c" />
                <Text style={styles.infoText}>{item.room_name}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={80} color="#bdc3c7" />
            <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => navigation.navigate('AttendanceReports')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#3498db' }]}>
            <MaterialCommunityIcons name="file-chart" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.actionTitle}>Attendance Reports</Text>
            <Text style={styles.actionDesc}>View student attendance statistics by course</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => navigation.navigate('AddClassLocation')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#e74c3c' }]}>
            <MaterialCommunityIcons name="map-marker-path" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.actionTitle}>Set Class Location</Text>
            <Text style={styles.actionDesc}>Define ABCD boundary points for geofencing</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#e74c3c" />
          <Text style={styles.logoutText}>Logout from System</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7f6' },
  header: { 
    backgroundColor: '#2c3e50', 
    paddingTop: 60, 
    paddingBottom: 30, 
    paddingHorizontal: 25, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    elevation: 10
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { color: '#bdc3c7', fontSize: 14 },
  notifBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12 },
  
  scrollContent: { padding: 20 },
  infoBar: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 20, alignItems: 'center', elevation: 2 },
  infoBarText: { color: '#2c3e50', fontSize: 14 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15, marginLeft: 5 },
  lecCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 15, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e74c3c', marginRight: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#e74c3c' },
  timeText: { fontSize: 12, color: '#95a5a6', fontWeight: '600' },
  courseName: { fontSize: 19, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { color: '#7f8c8d', fontSize: 14, marginLeft: 6 },

  emptyContainer: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  emptyText: { color: '#bdc3c7', marginTop: 10, fontSize: 16 },

  actionCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    elevation: 3,
    marginBottom: 30
  },
  iconCircle: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  actionDesc: { fontSize: 12, color: '#95a5a6', marginTop: 2 },

  logoutBtn: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 15, 
    marginBottom: 30
  },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});