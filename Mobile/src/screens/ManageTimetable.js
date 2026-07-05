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
  RefreshControl,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { post } from '../api';

const { width } = Dimensions.get('window');
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

  const availableClassrooms = classrooms.filter(room => {
    if (!formDay || !formStartTime || !formEndTime) return true;
    
    const overlappingEntry = timetables.find(tt => {
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
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color="#35A7C4" />
        </View>
        <Text style={{ marginTop: 16, color: '#7C8BA1', fontFamily: 'Outfit-Medium', fontSize: 15 }}>Loading Timetable Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Header Container */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#F3F7FD', '#E5EDF9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <MaterialCommunityIcons name="chevron-left" size={28} color="#35A7C4" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubtitle}>Scheduler Engine</Text>
              <Text style={styles.headerTitle}>Manage Timetable</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#35A7C4" 
              colors={['#35A7C4']}
            />
          }
        >
          {/* Add Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assign New Class</Text>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Department</Text>
                <View style={styles.pickerWrapper}>
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
                <View style={styles.pickerWrapper}>
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
              <View style={styles.pickerWrapper}>
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
                <Text style={{ color: '#E11D48', fontSize: 12, marginTop: 4, fontFamily: 'Outfit-Medium' }}>
                  No subjects assigned to this batch.
                </Text>
              )}
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Day</Text>
                <View style={styles.pickerWrapper}>
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
                <View style={styles.pickerWrapper}>
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
                <View style={styles.pickerWrapper}>
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
              <View style={styles.pickerWrapper}>
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
              <ActivityIndicator size="large" color="#35A7C4" style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.submitBtnShadow}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleAddTimetable} activeOpacity={0.8}>
                  <Text style={styles.submitBtnText}>Assign to Timetable</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Current Timetable List Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Existing Timetable</Text>
            <View style={styles.autoScheduleBtnShadow}>
              <TouchableOpacity 
                style={styles.autoScheduleBtn}
                onPress={handleAutoSchedule}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="magic-staff" size={16} color="#35A7C4" style={{ marginRight: 6 }} />
                <Text style={styles.autoScheduleBtnText}>Auto-Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>

          {timetables.length > 0 ? (
            timetables.map((tt) => (
              <View key={tt.id} style={styles.ttCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ttCourse}>{tt.subject_code} - {tt.course_name}</Text>
                  <Text style={styles.ttInfo}>
                    <MaterialCommunityIcons name="account-group" size={14} color="#7C8BA1" /> {tt.batch_year ? `Batch ${tt.batch_year}` : 'All Batches'} {tt.department_name ? `(${tt.department_name})` : ''}
                  </Text>
                  <Text style={styles.ttInfo}>
                    <MaterialCommunityIcons name="calendar" size={14} color="#7C8BA1" /> {tt.day_of_week} | {tt.start_time?.substring(0,5)} - {tt.end_time?.substring(0,5)}
                  </Text>
                  <Text style={styles.ttInfo}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#7C8BA1" /> {tt.room_name}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteBtn} 
                  onPress={() => handleDeleteTimetable(tt.id)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color="#E11D48" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="calendar-blank" size={32} color="#7C8BA1" />
              </View>
              <Text style={styles.emptyText}>No timetable entries found.</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF0F3',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  headerContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#ECF0F3',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    justifyContent: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 3,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    color: '#7C8BA1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#2C3A4E',
    marginTop: 2,
  },
  
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  
  card: {
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
    marginBottom: 16,
  },
  
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#7C8BA1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  picker: {
    width: '100%',
    color: '#2C3A4E',
  },
  
  submitBtnShadow: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECF0F3',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 8,
  },
  submitBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#35A7C4', // Cyan active submit button
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    fontSize: 16,
  },
  
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
    marginLeft: 4,
  },
  autoScheduleBtnShadow: {
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECF0F3',
    shadowColor: '#288BA3',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  autoScheduleBtn: {
    paddingHorizontal: 16,
    height: '100%',
    borderRadius: 19,
    backgroundColor: '#ECF0F3',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoScheduleBtnText: {
    color: '#35A7C4',
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
  },
  
  ttCard: {
    backgroundColor: '#ECF0F3',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#35A7C4', // Cyan theme left accent line
  },
  ttCourse: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#2C3A4E',
    marginBottom: 4,
  },
  ttInfo: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: '#7C8BA1',
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },
  
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ECF0F3',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#7C8BA1',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: {
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    marginTop: 8,
    fontSize: 14,
  },
});
