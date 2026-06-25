import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { post, upload } from '../api';

export default function StudentMedicalUpload({ route, navigation }) {
  const { studentId } = route.params || { studentId: 'TEST001' };
  const [absentRecords, setAbsentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAbsentRecords();
  }, []);

  // Fetch the student's absent records
  const fetchAbsentRecords = async () => {
    try {
      // POST /get_absent_records  →  { status, data: { records: [...] } }
      const data = await post('/get_absent_records', { student_id: studentId });
      if (data.status === 'success') setAbsentRecords(data.data.records);
    } catch (e) {
      Alert.alert("Error", "Could not fetch absent records.");
    } finally {
      setLoading(false);
    }
  };

  // Pick a file and upload it as a medical report
  const handleUploadMedical = async (recordId) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
      });

      if (!result.canceled) {
        setUploading(true);
        const file = result.assets[0];

        // POST /upload_medical (multipart/form-data)
        const formData = new FormData();
        formData.append('record_id', recordId);
        formData.append('medical_file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        });

        const data = await upload('/upload_medical', formData);
        if (data.status === 'success') {
          Alert.alert("Success", "Medical report uploaded successfully.");
          fetchAbsentRecords();
        } else {
          Alert.alert("Failed", data.message);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.dateText}>{item.date}</Text>
        <Text style={styles.subjectText}>{item.course_name}</Text>
        <Text style={styles.statusLabel}>Status: Absent</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.uploadBtn} 
        onPress={() => handleUploadMedical(item.id)}
      >
        <MaterialCommunityIcons name="plus-circle" size={35} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Absent Records</Text>
      {loading ? <ActivityIndicator size="large" color="#e74c3c" /> : (
        <FlatList
          data={absentRecords}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>නොපැමිණි දින කිසිවක් නැත.</Text>}
        />
      )}
      {uploading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{color: '#fff'}}>Uploading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' },
  card: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    elevation: 3
  },
  info: { flex: 1 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  subjectText: { fontSize: 14, color: '#7f8c8d', marginVertical: 2 },
  statusLabel: { fontSize: 12, color: '#e74c3c', fontWeight: 'bold' },
  uploadBtn: { padding: 5 },
  empty: { textAlign: 'center', marginTop: 50, color: '#bdc3c7' },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  }
});