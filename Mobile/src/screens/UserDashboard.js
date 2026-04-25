import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function UserDashboard({ navigation }) {
  // Logic Setup: lecture එකක් දැන් පැවැත්වෙනවාද නැද්ද යන්න තීරණය කිරීමට
  const isLectureOngoing = true; // මේක false කළොත් 'Upcoming' view එක බලාගන්න පුළුවන්

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, Pasindu!</Text>
          <Text style={styles.subText}>Faculty of Computing</Text>
        </View>
        <TouchableOpacity style={styles.profileIcon}>
          <MaterialCommunityIcons name="account-circle" size={40} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      {/* --- Live / Upcoming Status Card --- */}
      <View style={[
        styles.statusCard, 
        { borderColor: isLectureOngoing ? '#3498db' : '#2ecc71' }
      ]}>
        <View style={styles.cardHeader}>
          <View style={[
            styles.badge, 
            { backgroundColor: isLectureOngoing ? '#e3f2fd' : '#e8f5e9' }
          ]}>
            <View style={[styles.dot, { backgroundColor: isLectureOngoing ? '#3498db' : '#2ecc71' }]} />
            <Text style={[styles.badgeText, { color: isLectureOngoing ? '#3498db' : '#2ecc71' }]}>
              {isLectureOngoing ? 'ONGOING' : 'UPCOMING NEXT'}
            </Text>
          </View>
          <Text style={styles.timeLabel}>Today, 08:30 AM</Text>
        </View>

        <Text style={styles.courseName}>
          {isLectureOngoing ? 'Rapid Application Development' : 'Advanced Web Engineering'}
        </Text>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color="#7f8c8d" />
          <Text style={styles.infoText}>Lec Hall 01 (Building B)</Text>
        </View>

        {isLectureOngoing ? (
          <TouchableOpacity 
            style={styles.attendanceBtn}
            onPress={() => console.log('Location Submitted')}
          >
            <MaterialCommunityIcons name="map-marker-check" size={20} color="#fff" />
            <Text style={styles.attendanceBtnText}>Mark My Attendance</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.upcomingNote}>
            <Text style={styles.upcomingText}>Lecture starts in 45 minutes</Text>
          </View>
        )}
      </View>

      {/* Quick Menu Options */}
      <View style={styles.menuGrid}>
        <Text style={styles.sectionTitle}>Dashboard Menu</Text>
        
        <View style={styles.row}>
          {/* Reports Button */}
          <TouchableOpacity style={styles.menuBox}>
            <View style={[styles.iconCircle, { backgroundColor: '#34495e' }]}>
              <MaterialCommunityIcons name="file-chart" size={30} color="#fff" />
            </View>
            <Text style={styles.menuBoxTitle}>My Reports</Text>
            <Text style={styles.menuBoxSub}>Attendance History</Text>
          </TouchableOpacity>

          {/* Schedule Button */}
          <TouchableOpacity style={styles.menuBox}>
            <View style={[styles.iconCircle, { backgroundColor: '#f39c12' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={30} color="#fff" />
            </View>
            <Text style={styles.menuBoxTitle}>Schedule</Text>
            <Text style={styles.menuBoxSub}>Weekly Timetable</Text>
          </TouchableOpacity>
        </View>

        {/* Support or Other Info */}
        <TouchableOpacity style={styles.listCard}>
          <MaterialCommunityIcons name="information-outline" size={24} color="#3498db" />
          <Text style={styles.listCardText}>System Guidelines & Help</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#bdc3c7" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutRow} onPress={() => navigation.replace('Login')}>
        <MaterialCommunityIcons name="power" size={22} color="#e74c3c" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 50, 
    paddingBottom: 20 
  },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  subText: { fontSize: 14, color: '#95a5a6' },
  
  // Status Card Styles
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  timeLabel: { fontSize: 12, color: '#95a5a6' },
  courseName: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoText: { fontSize: 14, color: '#7f8c8d', marginLeft: 8 },
  
  attendanceBtn: { 
    backgroundColor: '#3498db', 
    flexDirection: 'row', 
    padding: 15, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  attendanceBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  upcomingNote: { backgroundColor: '#f1f2f6', padding: 12, borderRadius: 12, alignItems: 'center' },
  upcomingText: { color: '#7f8c8d', fontSize: 13, fontStyle: 'italic' },

  // Menu Styles
  menuGrid: { padding: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  menuBox: { 
    backgroundColor: '#fff', 
    width: '47%', 
    padding: 20, 
    borderRadius: 20, 
    alignItems: 'center',
    elevation: 2 
  },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  menuBoxTitle: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  menuBoxSub: { fontSize: 11, color: '#95a5a6', marginTop: 4 },
  
  listCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 18, 
    alignItems: 'center', 
    elevation: 1 
  },
  listCardText: { flex: 1, marginLeft: 15, fontSize: 15, color: '#2c3e50', fontWeight: '500' },

  logoutRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 30 
  },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});