import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  ActivityIndicator,
  FlatList,
  Platform,
  TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

export default function LecturerTimetable({ route, navigation }) {
  const { user_id } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const res = await post('/get_lecturer_timetable', { index_number: user_id });
      if (res.status === 'success') {
        setTimetable(res.data.lectures || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const groupByDay = () => {
    const grouped = {};
    timetable.forEach(lecture => {
      if (!grouped[lecture.day_of_week]) {
        grouped[lecture.day_of_week] = [];
      }
      grouped[lecture.day_of_week].push(lecture);
    });
    // Create an array format for FlatList
    return Object.keys(grouped).map(day => ({
      day,
      lectures: grouped[day]
    }));
  };

  const groupedData = groupByDay();

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
              <Text style={styles.headerSubtitle}>Schedule</Text>
              <Text style={styles.headerTitle}>My Timetable</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#35A7C4" />
        </View>
      ) : groupedData.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color="#7C8BA1" />
          <Text style={styles.emptyText}>No classes scheduled</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.day}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.daySection}>
              <Text style={styles.dayTitle}>{item.day}</Text>
              {item.lectures.map((lec, index) => (
                <View key={index} style={styles.lectureCard}>
                  <View style={styles.timeLine}>
                    <Text style={styles.timeText}>{lec.start_time?.substring(0,5)}</Text>
                    <View style={styles.timeLineDash} />
                    <Text style={styles.timeText}>{lec.end_time?.substring(0,5)}</Text>
                  </View>
                  <View style={styles.lectureDetails}>
                    <Text style={styles.courseName}>{lec.course_name}</Text>
                    <Text style={styles.courseCode}>{lec.subject_code}</Text>
                    <View style={styles.roomPill}>
                      <MaterialCommunityIcons name="map-marker" size={14} color="#35A7C4" />
                      <Text style={styles.roomText}>{lec.room_name}</Text>
                    </View>
                  </View>
                </View>
              ))}
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
  daySection: { marginBottom: 24 },
  dayTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#2C3A4E', marginBottom: 12, marginLeft: 8 },
  lectureCard: {
    flexDirection: 'row',
    backgroundColor: '#ECF0F3',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fff',
    elevation: 2,
  },
  timeLine: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#D1D9E6',
    paddingRight: 12,
    marginRight: 12,
  },
  timeText: { fontFamily: 'Outfit-Bold', fontSize: 14, color: '#35A7C4' },
  timeLineDash: { width: 2, height: 16, backgroundColor: '#D1D9E6', marginVertical: 4 },
  lectureDetails: { flex: 1, justifyContent: 'center' },
  courseName: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#2C3A4E', marginBottom: 4 },
  courseCode: { fontFamily: 'Outfit-Medium', fontSize: 12, color: '#7C8BA1', marginBottom: 8 },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(53, 167, 196, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roomText: { fontFamily: 'Outfit-Medium', fontSize: 12, color: '#35A7C4', marginLeft: 4 },
});
