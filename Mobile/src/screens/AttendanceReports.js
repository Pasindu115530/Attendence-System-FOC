import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  Animated,
  ScrollView,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdvancedReports() {
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
      const [deptRes, batchRes] = await Promise.all([
        fetch('https://attendence-system-foc.onrender.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_departments' }),
        }),
        fetch('https://attendence-system-foc.onrender.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_batches' }),
        })
      ]);
      const deptData = await deptRes.json();
      const batchData = await batchRes.json();

      if (deptData.status === 'success') setDepartments(deptData.departments);
      if (batchData.status === 'success') setBatches(batchData.batches);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingOptions(false);
    }
  };

  const fetchCourses = async (deptId) => {
    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_courses', dept_id: deptId }),
      });
      const data = await response.json();
      if (data.status === 'success') setCourses(data.courses);
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
    setResults([]); // Clear previous results
    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_filtered_report', ...filters }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setResults(data.report);
        if (data.report.length === 0) Alert.alert("Notice", "No records found for the selected filters.");
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
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? '#d1fae5' : '#fee2e2' }]}>
          <Text style={[styles.statusText, { color: item.status === 'Active' ? '#065f46' : '#991b1b' }]}>
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
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#2c3e50', '#4ca1af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>Faculty of Computing</Text>
          <Text style={styles.headerTitle}>Academic Reports</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], padding: 20 }}>
          
          {/* Filter Card */}
          <View style={styles.formCard}>
            <View style={styles.filterHeader}>
              <MaterialCommunityIcons name="filter-variant" size={20} color="#64748b" />
              <Text style={styles.filterHeaderText}>Filter Options</Text>
            </View>

            <View style={styles.pickerRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.label}>Department</Text>
                {fetchingOptions ? (
                  <ActivityIndicator size="small" color="#4ca1af" style={{ alignSelf: 'flex-start', padding: 10 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                    {departments.map((item) => (
                      <TouchableOpacity 
                        key={item.dept_id}
                        style={[styles.chip, filters.dept_id === item.dept_id && styles.chipSelected]}
                        onPress={() => {
                          setFilters({...filters, dept_id: item.dept_id, course_id: ''});
                          fetchCourses(item.dept_id);
                        }}
                      >
                        <Text style={[styles.chipText, filters.dept_id === item.dept_id && styles.chipTextSelected]}>
                          Dept {item.dept_id}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Batch</Text>
                {fetchingOptions ? (
                  <ActivityIndicator size="small" color="#4ca1af" style={{ alignSelf: 'flex-start', padding: 10 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                    {batches.map((item) => (
                      <TouchableOpacity 
                        key={item.batch_year}
                        style={[styles.chip, filters.batch === item.batch_year && styles.chipSelected]}
                        onPress={() => setFilters({...filters, batch: item.batch_year})}
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
              {courses.length > 0 ? courses.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={[styles.chip, filters.course_id === item.id && styles.chipSelected]}
                  onPress={() => setFilters({...filters, course_id: item.id})}
                >
                  <Text style={[styles.chipText, filters.course_id === item.id && styles.chipTextSelected]}>
                    {item.course_name}
                  </Text>
                </TouchableOpacity>
              )) : (
                <Text style={styles.hintText}>Select Department to load courses</Text>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.searchBtn, loading && { opacity: 0.7 }]} 
              onPress={fetchFilteredReport}
              disabled={loading}
            >
              <LinearGradient
                colors={['#4ca1af', '#2c3e50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.searchBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="file-chart-outline" size={22} color="#fff" />
                    <Text style={styles.btnText}>Generate Report</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
                <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
                <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Attendance</Text>
              </View>

              {results.map((item, index) => (
                <React.Fragment key={item.user_id}>
                  {renderRow({ item, index })}
                </React.Fragment>
              ))}
            </View>
          )}

          {results.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="file-search-outline" size={48} color="#cbd5e1" />
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    paddingTop: 60, 
    paddingBottom: 40, 
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
  },
  headerContent: { alignItems: 'flex-start' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  
  scrollView: { flex: 1, marginTop: -25 },
  
  formCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 24, 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 20,
    marginBottom: 20
  },
  filterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
  filterHeaderText: { fontSize: 14, fontWeight: '700', color: '#64748b', marginLeft: 8 },
  
  label: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  selector: { flexDirection: 'row', marginBottom: 5 },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 12, 
    backgroundColor: '#f1f5f9', 
    marginRight: 10, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  chipSelected: { backgroundColor: '#4ca1af', borderColor: '#4ca1af' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  hintText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', paddingVertical: 8 },
  
  searchBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 24, elevation: 4 },
  searchBtnGradient: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 10 },
  
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15, paddingHorizontal: 4 },
  resultsTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  countBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  countText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#f1f5f9', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    marginBottom: 10 
  },
  headerCell: { fontWeight: '700', fontSize: 11, color: '#64748b', textTransform: 'uppercase' },
  
  tableRow: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 18, 
    marginBottom: 12, 
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    alignItems: 'center' 
  },
  studentInfo: { flex: 2, flexDirection: 'row', alignItems: 'center' },
  idBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  idBadgeText: { fontSize: 14, fontWeight: '800', color: '#4ca1af' },
  cellText: { fontWeight: '700', fontSize: 15, color: '#1e293b' },
  subCellText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  statusCol: { flex: 1, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontWeight: '800', fontSize: 11 },
  
  percentageCol: { flex: 1, alignItems: 'flex-end' },
  percentageText: { fontWeight: '800', color: '#1e293b', fontSize: 16 },
  percentageLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTextTitle: { fontSize: 18, fontWeight: '700', color: '#475569' },
  emptyTextSub: { textAlign: 'center', color: '#94a3b8', marginTop: 8, lineHeight: 20 }
});