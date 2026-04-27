import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function UserDashboard({ route, navigation }) {
  // Login එකෙන් ලැබෙන user_id එක (උදාහරණයක් ලෙස props හෝ route මගින් ගනියි)
  const { user_id } = route.params || { user_id: 'TEST001' }; 
  
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchDashboard();
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

      let loc = await Location.getCurrentPositionAsync({});

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
        Alert.alert("Success", "Attendance marked!");
        fetchDashboard(); // Refresh to show "Already Marked"
      } else {
        Alert.alert("Failed", res.message || "Could not mark attendance");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <ActivityIndicator style={{flex:1}} size="large" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome {user_id}</Text>
      
      <View style={[styles.card, { borderColor: lecture?.isLive ? '#3498db' : '#f39c12' }]}>
        {lecture ? (
          <>
            <Text style={styles.status}>{lecture.isLive ? "ONGOING" : "UPCOMING NEXT"}</Text>
            <Text style={styles.course}>{lecture.course_name}</Text>
            <Text>{lecture.room_name} | {lecture.start_time}</Text>

            {lecture.isLive && (
              lecture.hasMarked ? (
                <View style={[styles.btn, { backgroundColor: '#27ae60' }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#fff" /> Attendance Marked
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.btn} 
                  onPress={handleMarkAttendance} 
                  disabled={marking}
                >
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>
                    {marking ? "Marking..." : "Mark Attendance"}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', padding: 10 }}>
            <MaterialCommunityIcons name="calendar-blank" size={40} color="#bdc3c7" />
            <Text style={{ color: '#7f8c8d', marginTop: 10 }}>No lectures scheduled for now.</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Login')}>
        <Text style={styles.logoutText}>Logout from System</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
  card: { padding: 20, borderRadius: 15, backgroundColor: '#fff', borderWidth: 2, elevation: 3 },
  status: { fontWeight: 'bold', color: '#7f8c8d' },
  course: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  btn: { backgroundColor: '#3498db', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  logoutBtn: { marginTop: 'auto', padding: 15, alignItems: 'center', marginBottom: 20 },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});