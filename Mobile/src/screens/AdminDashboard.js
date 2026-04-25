import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminDashboard({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSubtitle}>Manage Classes & Attendance</Text>
      </View>

      {/* --- Live Course Details Card --- */}
      <View style={styles.liveCourseCard}>
        <View style={styles.liveBadgeRow}>
          <View style={styles.liveBadge}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>LIVE NOW</Text>
          </View>
          <Text style={styles.dateText}>April 26, 2026</Text>
        </View>

        <Text style={styles.courseName}>Rapid Application Development</Text>
        
        <View style={styles.courseDetailRow}>
          <MaterialCommunityIcons name="clock-outline" size={18} color="#e74c3c" />
          <Text style={styles.courseInfo}>08:30 AM - 10:30 AM</Text>
        </View>

        <View style={styles.courseDetailRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color="#e74c3c" />
          <Text style={styles.courseInfo}>Lecture Hall 01 (Main Building)</Text>
        </View>

        <View style={styles.courseDetailRow}>
          <MaterialCommunityIcons name="account-tie" size={18} color="#e74c3c" />
          <Text style={styles.courseInfo}>Dr. Prasanna Sumathipala</Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Active Classes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>85%</Text>
          <Text style={styles.statLabel}>Avg Attendance</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('AddClassLocation')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#e74c3c' }]}>
            <MaterialCommunityIcons name="map-marker-radius" size={28} color="#fff" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Set Class Location</Text>
            <Text style={styles.cardDesc}>Mark ABCD points for geofencing</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#f1c40f' }]}>
            <MaterialCommunityIcons name="file-chart" size={28} color="#fff" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Batch Reports</Text>
            <Text style={styles.cardDesc}>Download & View Student Reports</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#bdc3c7" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#3498db' }]}>
            <MaterialCommunityIcons name="account-group" size={28} color="#fff" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Manage Students</Text>
            <Text style={styles.cardDesc}>Add or Remove students</Text>
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
  header: { 
    backgroundColor: '#2c3e50', 
    paddingTop: 60, 
    paddingBottom: 80, 
    paddingHorizontal: 25, 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35 
  },
  headerTitle: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 16, color: '#bdc3c7', marginTop: 5 },
  
  // Live Course Card Styles
  liveCourseCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -50,
    padding: 20,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  liveBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c', marginRight: 8 },
  liveText: { color: '#e74c3c', fontSize: 12, fontWeight: 'bold' },
  dateText: { color: '#95a5a6', fontSize: 12 },
  courseName: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15 },
  courseDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  courseInfo: { fontSize: 14, color: '#546e7a', marginLeft: 10 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  statBox: { backgroundColor: '#fff', padding: 20, borderRadius: 20, width: '47%', elevation: 3, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  statLabel: { fontSize: 12, color: '#95a5a6', marginTop: 5 },

  menuContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15, marginLeft: 5 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 20, 
    marginBottom: 15, 
    alignItems: 'center', 
    elevation: 2 
  },
  iconContainer: { padding: 12, borderRadius: 15, marginRight: 15 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  cardDesc: { fontSize: 13, color: '#95a5a6', marginTop: 2 },
  
  logoutBtn: { marginVertical: 20, padding: 15, alignItems: 'center' },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});