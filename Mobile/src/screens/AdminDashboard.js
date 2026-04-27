import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminDashboard({ navigation }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // දත්ත ලබාගන්නා Function එක
  const fetchAdminData = async () => {
    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_admin_dashboard' }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setLectures(data.lectures);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#e74c3c" /></View>;
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSubtitle}>Manage Classes & Geofencing</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        
        {lectures.length > 0 ? lectures.map((item, index) => (
          <View key={index} style={styles.lecCard}>
            <View style={styles.cardHeader}>
              <View style={styles.liveBadge}>
                <View style={styles.dot} />
                <Text style={styles.liveText}>SCHEDULED</Text>
              </View>
              <Text style={styles.timeText}>{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</Text>
            </View>
            <Text style={styles.courseName}>{item.course_name}</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#7f8c8d" />
              <Text style={styles.infoText}>{item.room_name}</Text>
            </View>
          </View>
        )) : (
          <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Quick Actions</Text>
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => navigation.navigate('AddClassLocation')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#e74c3c' }]}>
            <MaterialCommunityIcons name="map-marker-radius" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.actionTitle}>Set Class Location</Text>
            <Text style={styles.actionDesc}>Update ABCD points for geofencing</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#bdc3c7" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Login')}>
        <Text style={styles.logoutText}>Logout from System</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2c3e50', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { color: '#bdc3c7', marginTop: 5 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15 },
  lecCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f5', padding: 5, borderRadius: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e74c3c', marginRight: 5 },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#e74c3c' },
  timeText: { fontSize: 12, color: '#95a5a6' },
  courseName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  infoText: { color: '#7f8c8d', fontSize: 14, marginLeft: 5 },
  actionCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 2 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 16, fontWeight: 'bold' },
  actionDesc: { fontSize: 12, color: '#95a5a6' },
  logoutBtn: { marginVertical: 20, padding: 15, alignItems: 'center' },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});