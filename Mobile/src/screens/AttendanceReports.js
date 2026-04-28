import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdvancedReports() {
  const [filters, setFilters] = useState({ dept_id: '', batch: '', course_id: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [fetchingOptions, setFetchingOptions] = useState(true);

  React.useEffect(() => {
    fetchOptions();
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
    try {
      const response = await fetch('https://attendence-system-foc.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_filtered_report', ...filters }),
      });
      const data = await response.json();
      if (data.status === 'success') setResults(data.report);
      else Alert.alert("Notice", data.message || "No records found");
    } catch (e) { Alert.alert("Error", "Failed to fetch report"); }
    finally { setLoading(false); }
  };

  const renderRow = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={{ flex: 2 }}>
        <Text style={styles.cellText}>{item.user_id}</Text>
        <Text style={styles.subCellText}>{item.full_name}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[styles.statusText, { color: item.status === 'Present' ? '#27ae60' : '#e74c3c' }]}>
          {item.status}
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={styles.percentageText}>{item.percentage}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Academic Reports</Text>
      </View>

      {/* Filter Form */}
      <View style={styles.formCard}>
        <View style={styles.pickerRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.selector}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={departments}
                keyExtractor={(item) => item.dept_id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
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
                )}
              />
            </View>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Batch</Text>
            <View style={styles.selector}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={batches}
                keyExtractor={(item) => item.batch_year.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.chip, filters.batch === item.batch_year && styles.chipSelected]}
                    onPress={() => setFilters({...filters, batch: item.batch_year})}
                  >
                    <Text style={[styles.chipText, filters.batch === item.batch_year && styles.chipTextSelected]}>
                      {item.batch_year}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 15 }]}>Select Course</Text>
        <View style={styles.selector}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={courses}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={<Text style={styles.hintText}>Select Dept first</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.chip, filters.course_id === item.id && styles.chipSelected]}
                onPress={() => setFilters({...filters, course_id: item.id})}
              >
                <Text style={[styles.chipText, filters.course_id === item.id && styles.chipTextSelected]}>
                  {item.course_name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={fetchFilteredReport}>
          <MaterialCommunityIcons name="file-chart" size={20} color="#fff" />
          <Text style={[styles.btnText, { marginLeft: 8 }]}>Generate Report</Text>
        </TouchableOpacity>
      </View>

      {/* Results Table */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerCell}>Student Info</Text>
        <Text style={styles.headerCell}>Status</Text>
        <Text style={styles.headerCell}>Attendance %</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#e74c3c" /> : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.user_id}
          renderItem={renderRow}
          ListEmptyComponent={<Text style={styles.empty}>No data found. Apply filters above.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  header: { backgroundColor: '#2c3e50', padding: 25, paddingTop: 60, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  formCard: { backgroundColor: '#fff', padding: 20, margin: 15, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#7f8c8d', marginBottom: 8 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  selector: { marginBottom: 5 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f3f5', marginRight: 8, borderWidth: 1, borderColor: '#e0e6ed' },
  chipSelected: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
  chipText: { fontSize: 12, color: '#546e7a' },
  chipTextSelected: { color: '#fff', fontWeight: 'bold' },
  hintText: { fontSize: 12, color: '#bdc3c7', fontStyle: 'italic', paddingVertical: 8 },
  searchBtn: { backgroundColor: '#e74c3c', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20, flexDirection: 'row', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#ecf0f1', padding: 15, marginHorizontal: 15, borderRadius: 12, marginBottom: 10 },
  headerCell: { flex: 1, fontWeight: 'bold', textAlign: 'center', fontSize: 12, color: '#2c3e50' },
  tableRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginHorizontal: 15, marginBottom: 8, borderRadius: 15, elevation: 2, alignItems: 'center' },
  cellText: { fontWeight: 'bold', fontSize: 14, color: '#2c3e50' },
  subCellText: { fontSize: 12, color: '#7f8c8d' },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  percentageText: { fontWeight: 'bold', color: '#e74c3c', fontSize: 15 },
  empty: { textAlign: 'center', marginTop: 40, color: '#bdc3c7', fontSize: 14 }
});