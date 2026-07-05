import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

const { width } = Dimensions.get('window');

export default function AdvancedReports({ navigation }) {
  const [filters, setFilters] = useState({ dept_id: '', batch: '', course_id: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [fetchingOptions, setFetchingOptions] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchOptions();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchOptions = async () => {
    try {
      const [deptData, batchData] = await Promise.all([
        post('/get_departments', {}),
        post('/get_batches', {}),
      ]);

      if (deptData.status === 'success') setDepartments(deptData.data.departments);
      if (batchData.status === 'success') setBatches(batchData.data.batches);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingOptions(false);
    }
  };

  const fetchCourses = async (deptId) => {
    try {
      const data = await post('/get_courses', { dept_id: deptId });
      if (data.status === 'success') setCourses(data.data.courses);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFilteredReport = async () => {
    if (!filters.dept_id || !filters.course_id || !filters.batch) {
      Alert.alert("Error", "Please select Department, Batch and Course");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const data = await post('/get_filtered_report', filters);
      if (data.status === 'success') {
        setResults(data.data.report);
        if (data.data.report.length === 0)
          Alert.alert("Notice", "No records found for the selected filters.");
      } else {
        Alert.alert("Notice", data.message || "No records found");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to fetch report. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const renderRow = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.tableRow, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY: Animated.multiply(slideAnim, index * 0.1) }] 
        }
      ]}
    >
      <View style={styles.studentInfo}>
        <View style={styles.idBadge}>
          <Text style={styles.idBadgeText}>{item.user_id.substring(0, 2)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cellText}>{item.user_id}</Text>
          <Text style={styles.subCellText}>{item.full_name}</Text>
        </View>
      </View>
      <View style={styles.statusCol}>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(53, 167, 196, 0.12)' : 'rgba(225, 29, 72, 0.12)' }]}>
          <Text style={[styles.statusText, { color: item.status === 'Active' ? '#35A7C4' : '#E11D48' }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.percentageCol}>
        <Text style={styles.percentageText}>{item.percentage}</Text>
        <Text style={styles.percentageLabel}>Attendance</Text>
      </View>
    </Animated.View>
  );

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
              <Text style={styles.headerSubtitle}>Faculty of Computing</Text>
              <Text style={styles.headerTitle}>Academic Reports</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], padding: 20 }}>
          
          {/* Filter Card */}
          <View style={styles.formCard}>
            <View style={styles.filterHeader}>
              <MaterialCommunityIcons name="filter-variant" size={20} color="#35A7C4" />
              <Text style={styles.filterHeaderText}>Filter Options</Text>
            </View>

            <View style={styles.pickerRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.label}>Department</Text>
                {fetchingOptions ? (
                  <ActivityIndicator size="small" color="#35A7C4" style={{ alignSelf: 'flex-start', padding: 10 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                    {departments.map((item, index) => (
                      <TouchableOpacity 
                        key={item.id ? item.id.toString() : `dept_${index}`}
                        style={[styles.chip, filters.dept_id === item.id && styles.chipSelected]}
                        onPress={() => {
                          setFilters({...filters, dept_id: item.id, course_id: ''});
                          fetchCourses(item.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, filters.dept_id === item.id && styles.chipTextSelected]}>
                          {item.name || `Dept ${item.id}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Batch</Text>
                {fetchingOptions ? (
                  <ActivityIndicator size="small" color="#35A7C4" style={{ alignSelf: 'flex-start', padding: 10 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                    {batches.map((item, index) => (
                      <TouchableOpacity 
                        key={item.batch_year ? item.batch_year.toString() : `batch_${index}`}
                        style={[styles.chip, filters.batch === item.batch_year && styles.chipSelected]}
                        onPress={() => setFilters({...filters, batch: item.batch_year})}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, filters.batch === item.batch_year && styles.chipTextSelected]}>
                          {item.batch_year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Select Course</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
              {courses.length > 0 ? courses.map((item, index) => (
                <TouchableOpacity 
                  key={item.course_id ? item.course_id.toString() : `course_${index}`}
                  style={[styles.chip, filters.course_id === item.course_id && styles.chipSelected]}
                  onPress={() => setFilters({...filters, course_id: item.course_id})}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, filters.course_id === item.course_id && styles.chipTextSelected]}>
                    {item.course_name}
                  </Text>
                </TouchableOpacity>
              )) : (
                <Text style={styles.hintText}>Select Department to load courses</Text>
              )}
            </ScrollView>

            <View style={[styles.searchBtnShadow, loading && { opacity: 0.7 }]}>
              <TouchableOpacity 
                style={styles.searchBtn} 
                onPress={fetchFilteredReport}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="file-chart-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Generate Report</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Results Section */}
          {results.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Students List</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{results.length} Students</Text>
                </View>
              </View>
              
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 2, textAlign: 'left' }]}>Student Info</Text>
                <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Status</Text>
                <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Attendance</Text>
              </View>

              {results.map((item, index) => (
                <React.Fragment key={item.user_id ? item.user_id.toString() : `result_${index}`}>
                  {renderRow({ item, index })}
                </React.Fragment>
              ))}
            </View>
          )}

          {results.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="file-search-outline" size={48} color="#7C8BA1" />
              </View>
              <Text style={styles.emptyTextTitle}>No Report Data</Text>
              <Text style={styles.emptyTextSub}>Select filters above and click generate to view the report.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
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
  
  scrollView: {
    flex: 1,
  },
  
  formCard: { 
    backgroundColor: '#ECF0F3', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    paddingBottom: 10,
  },
  filterHeaderText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#2C3A4E',
    marginLeft: 8,
  },
  
  label: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#7C8BA1',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selector: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 14, 
    backgroundColor: '#ECF0F3', 
    marginRight: 10, 
    borderWidth: 1.5, 
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#35A7C4',
    borderColor: '#35A7C4',
    shadowColor: '#288BA3',
  },
  chipText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: '#7C8BA1',
  },
  chipTextSelected: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
  hintText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#7C8BA1',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  
  searchBtnShadow: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    marginTop: 24,
    backgroundColor: '#ECF0F3',
    shadowColor: '#288BA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#35A7C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
  
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  resultsTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
  },
  countBadge: {
    backgroundColor: '#ECF0F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 1,
  },
  countText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#35A7C4',
  },

  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  headerCell: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: '#7C8BA1',
    textTransform: 'uppercase',
  },
  
  tableRow: { 
    flexDirection: 'row', 
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
    alignItems: 'center',
  },
  studentInfo: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  idBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 1,
  },
  idBadgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#35A7C4',
  },
  cellText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2C3A4E',
  },
  subCellText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#7C8BA1',
    marginTop: 2,
  },
  
  statusCol: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
  },
  
  percentageCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  percentageText: {
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    fontSize: 16,
  },
  percentageLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 10,
    color: '#7C8BA1',
  },
  
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
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
  emptyTextTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#2C3A4E',
  },
  emptyTextSub: {
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    color: '#7C8BA1',
    marginTop: 8,
    lineHeight: 20,
  },
});