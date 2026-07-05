import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { post } from '../api';

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ManageTimetable({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Data
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [timetables, setTimetables] = useState([]);

  // Form
  const [formDeptId, setFormDeptId] = useState('');
  const [formBatchYear, setFormBatchYear] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formDay, setFormDay] = useState('Monday');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formClassroomId, setFormClassroomId] = useState('');

  // Dropdown Generation
  const TIME_OPTIONS = [];
  for (let h = 8; h <= 20; h++) {
    const hr = h.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${hr}:00`);
    TIME_OPTIONS.push(`${hr}:30`);
  }

  const fetchData = useCallback(async () => {
    try {
      const [deptRes, batchRes, roomRes, ttRes] = await Promise.all([
        post('/get_departments', {}),
        post('/get_batches', {}),
        post('/get_all_classrooms', {}),
        post('/get_all_timetable', {})
      ]);

      if (deptRes.status === 'success') {
        setDepartments(deptRes.data.departments || []);
        if (deptRes.data.departments?.length > 0 && !formDeptId) {
          setFormDeptId(deptRes.data.departments[0].id.toString());
        }
      }
      if (batchRes.status === 'success') {
        setBatches(batchRes.data.batches || []);
        if (batchRes.data.batches?.length > 0 && !formBatchYear) {
          setFormBatchYear(batchRes.data.batches[0].batch_year.toString());
        }
      }
      if (roomRes.status === 'success') setClassrooms(roomRes.data.classrooms || []);
      if (ttRes.status === 'success') setTimetables(ttRes.data.timetable || []);
      
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to load data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formDeptId, formBatchYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch subjects dynamically based on selected Department and Batch
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!formDeptId || !formBatchYear) return;
      setLoadingSubjects(true);
      setFormCourseId(''); // Reset course
      try {
        const res = await post('/get_batch_subjects', {
          department_id: formDeptId,
          batch_year: parseInt(formBatchYear)
        });
        if (res.status === 'success') {
          // Filter to only assigned subjects
          const assignedSubjects = (res.data.subjects || []).filter(s => s.assigned);
          setCourses(assignedSubjects);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [formDeptId, formBatchYear]);


  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isTimeOverlapping = (start1, end1, start2, end2) => {
    return start1 < end2 && end1 > start2;
  };

  // Determine available classrooms based on day and time selected
  const availableClassrooms = classrooms.filter(room => {
    if (!formDay || !formStartTime || !formEndTime) return true; // Show all if times not fully picked
    
    // Check if this room has an overlapping timetable entry
    const overlappingEntry = timetables.find(tt => {
      // Note: Backend start_time format might be "08:00:00", we can slice it
      const ttStart = tt.start_time.substring(0, 5);
      const ttEnd = tt.end_time.substring(0, 5);
      return tt.classroom_id === room.id && tt.day_of_week === formDay && isTimeOverlapping(formStartTime, formEndTime, ttStart, ttEnd);
    });

    return !overlappingEntry;
  });

  const handleAddTimetable = async () => {
    if (!formCourseId || !formClassroomId || !formDay || !formStartTime || !formEndTime) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    if (formStartTime >= formEndTime) {
      Alert.alert("Error", "Start time must be before end time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await post('/add_timetable', {
        course_id: formCourseId,
        classroom_id: formClassroomId,
        day_of_week: formDay,
        start_time: formStartTime,
        end_time: formEndTime
      });
      if (res.status === 'success') {
        Alert.alert("Success", "Timetable entry added!");
        // Reset specific fields
        setFormCourseId('');
        setFormClassroomId('');
        fetchData();
      } else {
        Alert.alert("Error", res.message || "Failed to add.");
      }
    } catch (e) {
      Alert.alert("Error", "Connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTimetable = (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to remove this timetable entry?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          try {
            const res = await post('/delete_timetable', { slot_id: id });
            if (res.status === 'success') {
              fetchData();
            } else {
              Alert.alert("Error", res.message || "Failed to delete.");
            }
          } catch (e) {
            Alert.alert("Error", "Connection error.");
          }
        }
      }
    ]);
  };

  const handleAutoSchedule = () => {
    Alert.alert(
      "Confirm Auto-Schedule",
      "This will DELETE the current timetable and automatically schedule all assigned subjects for the semester. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Auto-Schedule", 
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await post('/auto_schedule_timetable', {});
              if (res.status === 'success') {
                Alert.alert("Success", res.data.message);
                fetchData();
              } else {
                Alert.alert("Error", res.message || "Failed to auto-schedule.");
              }
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "An unexpected error occurred.");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading Timetable Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={['#b45309', '#d97706', '#f59e0b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Timetable</Text>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />}
        >
          {/* Add Form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assign New Class</Text>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Department</Text>
                <View style={[styles.pickerWrapper]}>
                  <Picker
                    selectedValue={formDeptId}
                    onValueChange={(itemValue) => setFormDeptId(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select..." value="" />
                    {departments.map(d => (
                      <Picker.Item key={d.id} label={d.name} value={d.id.toString()} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Batch</Text>
                <View style={[styles.pickerWrapper]}>
                  <Picker
                    selectedValue={formBatchYear}
                    onValueChange={(itemValue) => setFormBatchYear(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select..." value="" />
                    {batches.map(b => (
                      <Picker.Item key={b.batch_year} label={`${b.batch_year}`} value={b.batch_year.toString()} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Course</Text>
              <View style={[styles.pickerWrapper]}>
                <Picker
                  selectedValue={formCourseId}
                  onValueChange={(itemValue) => setFormCourseId(itemValue)}
                  style={styles.picker}
                  enabled={!loadingSubjects && courses.length > 0}
                >
                  <Picker.Item label={loadingSubjects ? "Loading..." : "Select Course..."} value="" />
                  {courses.map(c => (
                    <Picker.Item key={c.id} label={`${c.subject_code} - ${c.subject_name}`} value={c.id} />
                  ))}
                </Picker>
              </View>
              {courses.length === 0 && !loadingSubjects && formDeptId && formBatchYear && (
                <Text style={{color: '#ef4444', fontSize: 12, marginTop: 4}}>No subjects assigned to this batch.</Text>
              )}
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Day</Text>
                <View style={[styles.pickerWrapper]}>
                  <Picker
                    selectedValue={formDay}
                    onValueChange={(itemValue) => setFormDay(itemValue)}
                    style={styles.picker}
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <Picker.Item key={d} label={d} value={d} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Start Time</Text>
                <View style={[styles.pickerWrapper]}>
                  <Picker
                    selectedValue={formStartTime}
                    onValueChange={(itemValue) => {
                      setFormStartTime(itemValue);
                      setFormClassroomId(''); // Reset room as availability changed
                    }}
                    style={styles.picker}
                  >
                    {TIME_OPTIONS.map(t => (
                      <Picker.Item key={`start_${t}`} label={t} value={t} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>End Time</Text>
                <View style={[styles.pickerWrapper]}>
                  <Picker
                    selectedValue={formEndTime}
                    onValueChange={(itemValue) => {
                      setFormEndTime(itemValue);
                      setFormClassroomId(''); // Reset room as availability changed
                    }}
                    style={styles.picker}
                  >
                    {TIME_OPTIONS.map(t => (
                      <Picker.Item key={`end_${t}`} label={t} value={t} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Available Classroom (Seats)</Text>
              <View style={[styles.pickerWrapper]}>
                <Picker
                  selectedValue={formClassroomId}
                  onValueChange={(itemValue) => setFormClassroomId(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Available Room..." value="" />
                  {availableClassrooms.map(r => (
                    <Picker.Item key={r.id} label={`${r.room_name} (${r.seat_count || 0} seats)`} value={r.id} />
                  ))}
                </Picker>
              </View>
            </View>

            {submitting ? (
              <ActivityIndicator size="large" color="#d97706" style={{ marginVertical: 10 }} />
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddTimetable}>
                <Text style={styles.submitBtnText}>Assign to Timetable</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Current Timetable List */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Existing Timetable</Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#9333ea', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
              onPress={handleAutoSchedule}
              disabled={submitting}
            >
              <MaterialCommunityIcons name="magic-staff" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Outfit_600SemiBold' }}>Auto-Schedule</Text>
            </TouchableOpacity>
          </View>
          {timetables.length > 0 ? (
            timetables.map((tt) => (
              <View key={tt.id} style={styles.ttCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ttCourse}>{tt.subject_code} - {tt.course_name}</Text>
                  <Text style={styles.ttInfo}>
                    <MaterialCommunityIcons name="account-group" size={14} color="#64748b" /> {tt.batch_year ? `Batch ${tt.batch_year}` : 'All Batches'} {tt.department_name ? `(${tt.department_name})` : ''}
                  </Text>
                  <Text style={styles.ttInfo}>
                    <MaterialCommunityIcons name="calendar" size={14} color="#64748b" /> {tt.day_of_week} | {tt.start_time?.substring(0,5)} - {tt.end_time?.substring(0,5)}
                  </Text>
                  <Text style={styles.ttInfo}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#64748b" /> {tt.room_name}
                  </Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteTimetable(tt.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-blank" size={32} color="#cbd5e1" />
              <Text style={styles.emptyText}>No timetable entries found.</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    marginRight: 16
  },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#1e293b', marginBottom: 16 },
  
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputLabel: { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: '#64748b', marginBottom: 8 },
  pickerWrapper: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  picker: {
    fontFamily: 'Outfit-Regular',
    height: 50,
    width: '100%',
    color: '#1e293b'
  },
  
  submitBtn: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  submitBtnText: { fontFamily: 'Outfit-Bold', color: '#fff', fontSize: 16,},
  
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#1e293b', marginBottom: 12, marginLeft: 4 },
  
  ttCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706'
  },
  ttCourse: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#1e293b', marginBottom: 4 },
  ttInfo: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#64748b', marginTop: 2,},
  deleteBtn: { padding: 8 },
  
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed'
  },
  emptyText: { fontFamily: 'Outfit-Medium', color: '#94a3b8', marginTop: 8, fontSize: 14,}
});
