import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';
import { Picker } from '@react-native-picker/picker';

export default function AssignSubjects({ navigation }) {
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const [deptRes, batchRes] = await Promise.all([
        post('/get_departments', {}),
        post('/get_batches', {})
      ]);

      if (deptRes.status === 'success') {
        setDepartments(deptRes.data.departments || []);
        if (deptRes.data.departments?.length > 0) {
          setSelectedDeptId(deptRes.data.departments[0].id.toString());
        }
      }
      
      if (batchRes.status === 'success') {
        const batchYears = batchRes.data.batches.map(b => b.batch_year);
        // Ensure some defaults if missing
        if (batchYears.length === 0) {
          const currentYear = new Date().getFullYear();
          batchYears.push(currentYear, currentYear - 1, currentYear - 2);
        }
        setBatches(batchYears);
        setSelectedBatch(batchYears[0].toString());
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    if (!selectedDeptId || !selectedBatch) return;
    setLoading(true);
    try {
      const res = await post('/get_batch_subjects', {
        department_id: selectedDeptId,
        batch_year: parseInt(selectedBatch)
      });
      if (res.status === 'success') {
        setSubjects(res.data.subjects || []);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedDeptId, selectedBatch]);

  const toggleSubject = (subjectId) => {
    setSubjects(prev => prev.map(s => 
      s.id === subjectId ? { ...s, assigned: !s.assigned } : s
    ));
  };

  const handleSave = async () => {
    const assignedIds = subjects.filter(s => s.assigned).map(s => s.id);
    setSaving(true);
    try {
      const res = await post('/assign_batch_subjects', {
        department_id: selectedDeptId,
        batch_year: parseInt(selectedBatch),
        subject_ids: assignedIds
      });

      if (res.status === 'success') {
        Alert.alert('Success', 'Subjects assigned successfully for the semester!');
      } else {
        Alert.alert('Error', res.message || 'Failed to assign subjects');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient
        colors={['#4f46e5', '#3730a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Assign Subjects</Text>
            <Text style={styles.headerSubtitle}>Semester Configuration</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        
        {/* Filters */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Department</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedDeptId}
              onValueChange={(val) => setSelectedDeptId(val)}
              style={styles.picker}
            >
              {departments.map(d => (
                <Picker.Item key={d.id} label={d.name} value={d.id.toString()} />
              ))}
            </Picker>
          </View>

          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Batch Year</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedBatch}
              onValueChange={(val) => setSelectedBatch(val)}
              style={styles.picker}
            >
              {batches.map(b => (
                <Picker.Item key={b} label={b.toString()} value={b.toString()} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Subjects List */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={{ marginTop: 12, color: '#64748b' }}>Loading subjects...</Text>
            </View>
          ) : subjects.length > 0 ? (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>Available Subjects</Text>
              <Text style={styles.sectionDesc}>Check the subjects you want to assign to this batch for the current semester.</Text>
              
              {subjects.map(subject => (
                <TouchableOpacity 
                  key={subject.id} 
                  style={[styles.subjectItem, subject.assigned && styles.subjectItemActive]}
                  onPress={() => toggleSubject(subject.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subjectInfo}>
                    <Text style={[styles.subjectCode, subject.assigned && styles.textActive]}>{subject.subject_code}</Text>
                    <Text style={[styles.subjectName, subject.assigned && styles.textActive]}>{subject.subject_name}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={subject.assigned ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                    size={28} 
                    color={subject.assigned ? "#fff" : "#cbd5e1"} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="book-remove-multiple-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No subjects found for this department.</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Save Button */}
      {!loading && subjects.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            <LinearGradient
              colors={['#4f46e5', '#4338ca']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-check" size={24} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save Assignments</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2, fontWeight: '500' },
  
  filterCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginTop: -20,
  },
  filterLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' },
  pickerWrapper: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  picker: { height: 50, color: '#0f172a' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  listContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 20 },
  
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  subjectItemActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  subjectInfo: { flex: 1, paddingRight: 16 },
  subjectCode: { fontSize: 12, fontWeight: '800', color: '#4f46e5', marginBottom: 4 },
  subjectName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  textActive: { color: '#fff' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15, fontWeight: '500' },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  saveBtn: { borderRadius: 20, overflow: 'hidden' },
  saveBtnGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
