import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  ActivityIndicator,
  FlatList,
  Platform,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

const { width } = Dimensions.get('window');

export default function LecturerReport({ route, navigation }) {
  const { user_id } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await post('/get_lecturer_report', { index_number: user_id });
      if (res.status === 'success') {
        setReports(res.data.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentageStr) => {
    const val = parseFloat(percentageStr);
    if (isNaN(val)) return '#7C8BA1';
    if (val >= 80) return '#10B981'; // Green
    if (val >= 50) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#F3F7FD', '#E5EDF9']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color="#35A7C4" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubtitle}>Analytics</Text>
              <Text style={styles.headerTitle}>Attendance Reports</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#35A7C4" />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="file-chart-outline" size={48} color="#7C8BA1" />
          <Text style={styles.emptyText}>No subjects assigned</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.subject_id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.reportCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectCode}>{item.subject_code}</Text>
                  <Text style={styles.subjectName}>{item.subject_name}</Text>
                </View>
                <View style={[styles.percentageCircle, { borderColor: getPercentageColor(item.attendance_percentage) }]}>
                  <Text style={[styles.percentageText, { color: getPercentageColor(item.attendance_percentage) }]}>
                    {item.attendance_percentage}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.statValue}>{item.total_present}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D1D9E6' }]}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                  <Text style={styles.statValue}>{item.total_absent}</Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={styles.statBox}>
                  <MaterialCommunityIcons name="format-list-checks" size={20} color="#3B82F6" />
                  <Text style={styles.statValue}>{item.total_marked}</Text>
                  <Text style={styles.statLabel}>Total Logs</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECF0F3' },
  headerContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#ECF0F3',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    elevation: 3,
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#fff',
    elevation: 3,
  },
  headerTitleContainer: { alignItems: 'center' },
  headerSubtitle: { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: '#7C8BA1', textTransform: 'uppercase' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#2C3A4E' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: 'Outfit-Medium', marginTop: 12, color: '#7C8BA1' },
  
  reportCard: {
    backgroundColor: '#ECF0F3',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectCode: { fontFamily: 'Outfit-Bold', fontSize: 12, color: '#35A7C4', marginBottom: 4 },
  subjectName: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#2C3A4E' },
  percentageCircle: {
    width: 60, height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  percentageText: { fontFamily: 'Outfit-Bold', fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#2C3A4E', marginVertical: 4 },
  statLabel: { fontFamily: 'Outfit-Medium', fontSize: 11, color: '#7C8BA1' },
});
