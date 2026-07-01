import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { post, upload } from '../api';

export default function StudentMedicalUpload({ route, navigation }) {
  const { studentId } = route.params || { studentId: 'TEST001' };
  const [absentRecords, setAbsentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchAbsentRecords();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Fetch the student's absent records
  const fetchAbsentRecords = async () => {
    try {
      const data = await post('/get_absent_records', { student_id: studentId });
      if (data.status === 'success') {
        setAbsentRecords(data.data.records);
      } else {
        setAbsentRecords([]);
      }
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
          Alert.alert("Failed", data.message || "Failed to upload file");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.card,
        { 
          opacity: fadeAnim, 
          transform: [{ translateY: Animated.multiply(slideAnim, index * 0.1) }] 
        }
      ]}
    >
      <View style={styles.cardStatusContainer}>
        <View style={styles.absentBadge}>
          <Text style={styles.absentBadgeText}>ABSENT</Text>
        </View>
        <Text style={styles.dateText}>{item.date ? item.date.substring(0, 10) : 'N/A'}</Text>
      </View>

      <Text style={styles.subjectText}>{item.course_name}</Text>
      
      <View style={styles.footerRow}>
        <View style={styles.reportStatus}>
          <MaterialCommunityIcons 
            name={item.medical_report ? "check-decagram" : "alert-circle-outline"} 
            size={18} 
            color={item.medical_report ? "#10b981" : "#f59e0b"} 
          />
          <Text style={[styles.reportStatusText, { color: item.medical_report ? "#10b981" : "#f59e0b" }]}>
            {item.medical_report ? "Report Submitted" : "Pending Report"}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.uploadBtn, item.medical_report && styles.uploadBtnCompleted]} 
          onPress={() => handleUploadMedical(item.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={item.medical_report ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadBtnGradient}
          >
            <MaterialCommunityIcons name="upload" size={16} color="#fff" />
            <Text style={styles.uploadBtnText}>
              {item.medical_report ? "Re-upload" : "Upload Medical"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#ef4444', '#b91c1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Absence Records</Text>
            <Text style={styles.headerSubtitle}>Submit medical certificates</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '500' }}>Fetching records...</Text>
        </View>
      ) : (
        <FlatList
          data={absentRecords}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="check-bold" size={40} color="#10b981" />
              </View>
              <Text style={styles.emptyTextTitle}>Perfect Attendance!</Text>
              <Text style={styles.emptyTextSub}>No absent records found for your account.</Text>
            </View>
          }
        />
      )}

      {uploading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Uploading medical document...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { 
    paddingTop: 60, 
    paddingBottom: 28, 
    paddingHorizontal: 24, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2, fontWeight: '500' },
  
  listContent: { padding: 20 },
  
  card: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  cardStatusContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  absentBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  absentBadgeText: { fontSize: 10, fontWeight: '800', color: '#ef4444' },
  dateText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  
  subjectText: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportStatus: { flexDirection: 'row', alignItems: 'center' },
  reportStatusText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  
  uploadBtn: { borderRadius: 12, overflow: 'hidden' },
  uploadBtnCompleted: { opacity: 0.9 },
  uploadBtnGradient: { paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, marginLeft: 6 },
  
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTextTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  emptyTextSub: { textAlign: 'center', color: '#64748b', marginTop: 8, fontSize: 14, lineHeight: 20 },
  
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(15,23,42,0.85)', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 999
  },
  overlayText: { color: '#fff', marginTop: 16, fontWeight: '600', fontSize: 15 }
});