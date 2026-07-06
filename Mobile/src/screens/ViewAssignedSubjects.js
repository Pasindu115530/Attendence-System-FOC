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
  RefreshControl,
  Dimensions,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

const { width } = Dimensions.get('window');

export default function ViewAssignedSubjects({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [confirmConfig, setConfirmConfig] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'error' });

  const showConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ visible: true, title, message, onConfirm });
  };

  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const fetchData = async () => {
    try {
      const res = await post('/get_all_assigned_subjects', {});
      if (res.status === 'success') {
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
        showAlert("Error", res.message || "Failed to load assigned subjects.", 'error');
      }
    } catch (e) {
      console.error(e);
      showAlert("Error", "Network or server error.", 'error');
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
    showConfirm(
      "Remove Assignment",
      `Are you sure you want to remove ${subject_name} from this batch?`,
      () => handleDelete(assignment_id)
    );
  };

  const handleDelete = async (assignment_id) => {
    try {
      const res = await post('/unassign_subject', { assignment_id });
      if (res.status === 'success') {
        fetchData();
        showAlert("Success", "Assignment removed successfully!", 'success');
      } else {
        showAlert("Error", res.message || "Failed to remove assignment.", 'error');
      }
    } catch (e) {
      console.error(e);
      showAlert("Error", "Network or server error.", 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color="#35A7C4" />
        </View>
        <Text style={{ marginTop: 16, color: '#7C8BA1', fontFamily: 'Outfit-Medium', fontSize: 15 }}>Loading Assignments...</Text>
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
              <Text style={styles.headerSubtitle}>Subjects per Batch</Text>
              <Text style={styles.headerTitle}>View Assignments</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>

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
        {Object.keys(groupedAssignments).length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="book-remove-multiple-outline" size={48} color="#7C8BA1" />
            </View>
            <Text style={styles.emptyText}>No subjects have been assigned yet.</Text>
          </View>
        ) : (
          Object.keys(groupedAssignments).sort().map(dept => (
            <View key={dept} style={styles.deptGroup}>
              <Text style={styles.deptTitle}>{dept}</Text>
              
              {Object.keys(groupedAssignments[dept]).sort().reverse().map(batch => (
                <View key={`${dept}-${batch}`} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="account-group" size={20} color="#35A7C4" />
                    <Text style={styles.cardTitle}>Batch {batch}</Text>
                  </View>
                  
                  <View style={styles.divider} />

                  {groupedAssignments[dept][batch].map((subject, index) => (
                    <View key={subject.assignment_id} style={[styles.subjectRow, index === groupedAssignments[dept][batch].length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="book-open-variant" size={16} color="#35A7C4" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectCode}>{subject.subject_code}</Text>
                        <Text style={styles.subjectName}>{subject.subject_name}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteBtn}
                        onPress={() => confirmDelete(subject.assignment_id, subject.subject_name)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E11D48" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
      {/* Custom Styled Confirmation Modal Popup */}
      <Modal
        visible={confirmConfig.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.customAlertContent]}>
            <View style={styles.alertIconWrapper}>
              <View style={[styles.alertIconOutline, styles.alertIconOutlineError]}>
                <View style={styles.alertIconInner}>
                  <MaterialCommunityIcons 
                    name="alert-circle" 
                    size={36} 
                    color="#E11D48" 
                  />
                </View>
              </View>
            </View>
            
            <Text style={styles.alertModalTitle}>{confirmConfig.title}</Text>
            <Text style={styles.alertModalMessage}>{confirmConfig.message}</Text>
            
            <View style={styles.confirmActionRow}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setConfirmConfig(prev => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <View style={styles.confirmBtnShadow}>
                <TouchableOpacity 
                  style={styles.confirmBtn} 
                  onPress={() => {
                    setConfirmConfig(prev => ({ ...prev, visible: false }));
                    confirmConfig.onConfirm();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Styled Alert Modal Popup */}
      <Modal
        visible={alertConfig.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.customAlertContent]}>
            <View style={styles.alertIconWrapper}>
              <View style={[styles.alertIconOutline, alertConfig.type === 'error' ? styles.alertIconOutlineError : alertConfig.type === 'success' ? styles.alertIconOutlineSuccess : styles.alertIconOutlineSuccess]}>
                <View style={[styles.alertIconInner, alertConfig.type === 'error' ? styles.alertIconInnerError : styles.alertIconInnerSuccess]}>
                  <MaterialCommunityIcons 
                    name={alertConfig.type === 'error' ? "alert-circle" : "check-circle"} 
                    size={36} 
                    color={alertConfig.type === 'error' ? "#E11D48" : "#10B981"} 
                  />
                </View>
              </View>
            </View>
            
            <Text style={styles.alertModalTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertModalMessage}>{alertConfig.message}</Text>
            
            <TouchableOpacity 
              style={[styles.alertOkBtn, alertConfig.type === 'error' ? styles.alertOkBtnError : styles.alertOkBtnSuccess]} 
              onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
              activeOpacity={0.8}
            >
              <Text style={styles.alertOkBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  deptGroup: {
    marginBottom: 24,
  },
  deptTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2C3A4E',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 3,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { 
    fontFamily: 'Outfit-Bold',
    fontSize: 16, 
    color: '#2C3A4E',
    marginLeft: 8,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 1,
  },
  subjectCode: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#35A7C4',
    marginBottom: 2,
  },
  subjectName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2C3A4E',
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
    marginLeft: 8,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ECF0F3',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#7C8BA1',
    borderStyle: 'dashed',
    marginTop: 40,
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
    marginTop: 12,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ECF0F3',
    borderRadius: 28,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  customAlertContent: {
    alignItems: 'center',
    padding: 24,
    maxWidth: 300,
    borderRadius: 24,
  },
  alertIconWrapper: {
    marginBottom: 16,
  },
  alertIconOutline: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  alertIconOutlineError: {
    borderColor: '#FFEBEF',
    backgroundColor: '#FFEBEF',
  },
  alertIconOutlineSuccess: {
    borderColor: '#ECFDF5',
    backgroundColor: '#ECFDF5',
  },
  alertIconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF0F3',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  alertIconInnerError: {
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
  },
  alertIconInnerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  alertModalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3A4E',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertModalMessage: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: '#7C8BA1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  alertOkBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  alertOkBtnError: {
    backgroundColor: '#E11D48',
    shadowColor: '#E11D48',
  },
  alertOkBtnSuccess: {
    backgroundColor: '#35A7C4',
    shadowColor: '#35A7C4',
  },
  alertOkBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
  },
  confirmActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#7C8BA1',
  },
  confirmBtnShadow: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECF0F3',
    shadowColor: '#FFEBEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
});
