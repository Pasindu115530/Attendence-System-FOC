import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddClassLocation({ navigation }) {
  const [roomName, setRoomName] = useState('');
  const [points, setPoints] = useState({ a: null, b: null, c: null, d: null });
  const [loading, setLoading] = useState(false);

  const capturePoint = async (p) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Error", "Permission required");

    let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setPoints({ ...points, [p]: loc.coords });
  };

  const handleSave = async () => {
    if (!roomName) return Alert.alert("Error", "Please enter a room name");
    if (!points.a || !points.b || !points.c || !points.d) return Alert.alert("Error", "Please mark all 4 points");
    
    setLoading(true);
    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_geofence',
          room_name: roomName,
          lat_a: points.a.latitude, lon_a: points.a.longitude,
          lat_b: points.b.latitude, lon_b: points.b.longitude,
          lat_c: points.c.latitude, lon_c: points.c.longitude,
          lat_d: points.d.latitude, lon_d: points.d.longitude,
        })
      });
      const res = await response.json();
      if (res.status === 'success') {
        Alert.alert("Success", "Location Boundary Updated!");
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Geofence Points</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Enter Classroom Name (e.g. Hall 01)" 
        placeholderTextColor="#95a5a6"
        value={roomName}
        onChangeText={setRoomName}
      />

      <Text style={styles.subtitle}>ශාලාවේ කොන් 4 ට ගොස් අදාළ අකුර ඔබන්න.</Text>

      <View style={styles.grid}>
        {['a', 'b', 'c', 'd'].map((item) => (
          <TouchableOpacity 
            key={item} 
            style={[styles.pointBtn, points[item] && styles.pointDone]} 
            onPress={() => capturePoint(item)}
          >
            <Text style={styles.pointLabel}>{item.toUpperCase()}</Text>
            {points[item] && <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Configuration</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#7f8c8d', marginBottom: 20 },
  input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#ecf0f1', color: '#2c3e50', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pointBtn: { width: '45%', height: 100, backgroundColor: '#34495e', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  pointDone: { backgroundColor: '#27ae60' },
  pointLabel: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#e74c3c', padding: 20, borderRadius: 15, marginTop: 10 },
  saveText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 18 }
});