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
  Animated,
  TextInput,
  FlatList,
  Platform,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

export default function AssignSubjects({ navigation }) {
  const [departments, setDepartments] = useState([]);
  
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [batchYear, setBatchYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  
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
      const deptRes = await post('/get_departments', {});

      if (deptRes.status === 'success') {
        setDepartments(deptRes.data.departments || []);
        if (deptRes.data.departments?.length > 0) {
          setSelectedDeptId(deptRes.data.departments[0].id.toString());
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    if (!selectedDeptId || !batchYear) return;
    setLoading(true);
    try {
      const res = await post('/get_batch_subjects', {
        department_id: selectedDeptId,
        batch_year: parseInt(batchYear) || new Date().getFullYear()
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
  }, [selectedDeptId]);

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
        batch_year: parseInt(batchYear),
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
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
              <Text style={styles.headerSubtitle}>Semester Configuration</Text>
              <Text style={styles.headerTitle}>Assign Subjects</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>

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

          <Text style={[styles.filterLabel, { marginTop: 14 }]}>Batch Year</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={batchYear}
              onChangeText={setBatchYear}
              onEndEditing={fetchSubjects}
              keyboardType="numeric"
              placeholder="e.g. 2024"
              placeholderTextColor="#7C8BA1"
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={22} color="#7C8BA1" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subject by name or code..."
            placeholderTextColor="#7C8BA1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Subjects List */}
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#35A7C4" />
              <Text style={{ marginTop: 12, color: '#7C8BA1', fontFamily: 'Outfit-Medium' }}>Loading subjects...</Text>
            </View>
          ) : subjects.length > 0 ? (
            <View style={[styles.listContainer, { flex: 1 }]}>
              <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                <Text style={styles.sectionTitle}>
                  Available Subjects
                </Text>
                <Text style={styles.sectionDesc}>
                  Assign subjects for {departments.find(d => d.id.toString() === selectedDeptId)?.name || 'Department'} (Batch {batchYear || '?'})
                </Text>
              </View>
              
              <FlatList
                data={subjects.filter(s => 
                  s.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  s.subject_code.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: subject }) => (
                  <TouchableOpacity 
                    style={[styles.subjectItem, subject.assigned && styles.subjectItemActive]}
                    onPress={() => toggleSubject(subject.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.subjectInfo}>
                      <Text style={[styles.subjectCode, subject.assigned ? styles.textActiveCode : styles.subjectCodeInactive]}>
                        {subject.subject_code}
                      </Text>
                      <Text style={[styles.subjectName, subject.assigned ? styles.textActiveName : styles.subjectNameInactive]}>
                        {subject.subject_name}
                      </Text>
                    </View>
                    <MaterialCommunityIcons 
                      name={subject.assigned ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                      size={26} 
                      color={subject.assigned ? "#FFFFFF" : "#7C8BA1"} 
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="book-remove-multiple-outline" size={48} color="#7C8BA1" />
              </View>
              <Text style={styles.emptyText}>No subjects found for this department.</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Save Button */}
      {!loading && subjects.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.saveBtnShadow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="content-save-check" size={22} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save Assignments</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF0F3',
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
  
  filterCard: {
    backgroundColor: '#ECF0F3',
    margin: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 3,
    marginTop: 20,
  },
  filterLabel: {
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
  inputWrapper: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  textInput: {
    fontFamily: 'Outfit-Medium',
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#2C3A4E',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: '#D1D9E6',
    borderLeftColor: '#D1D9E6',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    fontFamily: 'Outfit-Medium',
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#2C3A4E',
  },

  listContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: '#7C8BA1',
    marginBottom: 16,
    lineHeight: 20,
  },
  
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectItemActive: {
    backgroundColor: '#35A7C4', // Cyan active subject background
    borderColor: '#35A7C4',
    shadowColor: '#288BA3',
    shadowOpacity: 0.3,
  },
  subjectInfo: {
    flex: 1,
    paddingRight: 16,
  },
  subjectCode: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    marginBottom: 4,
  },
  subjectCodeInactive: {
    color: '#35A7C4',
  },
  subjectName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
  subjectNameInactive: {
    color: '#2C3A4E',
  },
  textActiveCode: {
    fontFamily: 'Outfit-Bold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  textActiveName: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
    marginTop: 12,
    color: '#7C8BA1',
    fontSize: 15,
  },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 20,
    backgroundColor: '#ECF0F3',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
  },
  saveBtnShadow: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECF0F3',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#35A7C4', // Cyan active save button
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    fontSize: 16,
  }
});
