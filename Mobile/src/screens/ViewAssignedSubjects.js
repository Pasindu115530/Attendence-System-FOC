import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  ActivityIndicator, 
  Alert,
  Platform,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

export default function ViewAssignedSubjects({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedAssignments, setGroupedAssignments] = useState({});

  const fetchData = async () => {
    try {
      const res = await post('/get_all_assigned_subjects', {});
      if (res.status === 'success') {
        // Group the assignments by department and then batch
        const assignments = res.data.assignments || [];
        const grouped = {};
        
        assignments.forEach(item => {
          const dept = item.department_name;
          const batch = item.batch_year;
          
          if (!grouped[dept]) grouped[dept] = {};
          if (!grouped[dept][batch]) grouped[dept][batch] = [];
          
          grouped[dept][batch].push(item);
        });

        setGroupedAssignments(grouped);
      } else {
        Alert.alert("Error", res.message || "Failed to load assigned subjects.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Network or server error.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const confirmDelete = (assignment_id, subject_name) => {
    Alert.alert(
      "Remove Assignment",
      `Are you sure you want to remove ${subject_name} from this batch?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => handleDelete(assignment_id)
        }
      ]
    );
  };

  const handleDelete = async (assignment_id) => {
    try {
      const res = await post('/unassign_subject', { assignment_id });
      if (res.status === 'success') {
        // Refresh data after successful deletion
        fetchData();
      } else {
        Alert.alert("Error", res.message || "Failed to remove assignment.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Network or server error.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading Assignments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={['#059669', '#10b981', '#34d399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>View Assignments</Text>
            <Text style={styles.headerSubtitle}>Subjects per Batch</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {Object.keys(groupedAssignments).length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="book-remove-multiple-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No subjects have been assigned yet.</Text>
          </View>
        ) : (
          Object.keys(groupedAssignments).sort().map(dept => (
            <View key={dept} style={styles.deptGroup}>
              <Text style={styles.deptTitle}>{dept}</Text>
              
              {Object.keys(groupedAssignments[dept]).sort().reverse().map(batch => (
                <View key={`${dept}-${batch}`} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="account-group" size={20} color="#10b981" />
                    <Text style={styles.cardTitle}>Batch {batch}</Text>
                  </View>
                  
                  <View style={styles.divider} />

                  {groupedAssignments[dept][batch].map((subject, index) => (
                    <View key={subject.assignment_id} style={[styles.subjectRow, index === groupedAssignments[dept][batch].length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="book-open-variant" size={16} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.subjectCode}>{subject.subject_code}</Text>
                            <Text style={styles.subjectName}>{subject.subject_name}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.deleteBtn}
                          onPress={() => confirmDelete(subject.assignment_id, subject.subject_name)}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2, fontWeight: '500' },
  scrollContent: { padding: 20, paddingBottom: 60 },

  deptGroup: {
    marginBottom: 24
  },
  deptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    padding: 16
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1e293b',
    marginLeft: 8
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155'
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    marginLeft: 8
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginTop: 40
  },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 15, fontWeight: '500' }
});
