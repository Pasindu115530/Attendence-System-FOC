import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

export default function AddClassLocation({ navigation }) {
  const [roomName, setRoomName] = useState('');
  const [seatCount, setSeatCount] = useState('');
  const [points, setPoints] = useState({ a: null, b: null, c: null, d: null });
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const capturePoint = async (p) => {
    setCapturing(p);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required to capture coordinates.");
        return;
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      setPoints(prev => ({ ...prev, [p]: loc.coords }));
    } catch (err) {
      Alert.alert("Error", "Could not capture location. Make sure GPS is enabled.");
    } finally {
      setCapturing(null);
    }
  };

  const handleSave = async () => {
    if (!roomName.trim()) return Alert.alert("Error", "Please enter a classroom name");
    if (!points.a || !points.b || !points.c || !points.d)
      return Alert.alert("Error", "Please capture all 4 corner points");

    setLoading(true);
    try {
      const res = await post('/update_geofence', {
        room_name: roomName.trim(),
        seat_count: parseInt(seatCount) || 0,
        lat_a: points.a.latitude, lon_a: points.a.longitude,
        lat_b: points.b.latitude, lon_b: points.b.longitude,
        lat_c: points.c.latitude, lon_c: points.c.longitude,
        lat_d: points.d.latitude, lon_d: points.d.longitude,
      });
      if (res.status === 'success') {
        Alert.alert("Success", "Location boundary updated successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Error", res.message || "Failed to update database");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Set Geofence</Text>
            <Text style={styles.headerSubtitle}>Define classroom boundaries</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Room Name Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Classroom Information</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="school" size={20} color="#667eea" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Hall 01, Lab B" 
              placeholderTextColor="#94a3b8"
              value={roomName}
              onChangeText={setRoomName}
            />
          </View>
          
          <Text style={[styles.label, { marginTop: 16 }]}>Seat Capacity</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="chair-school" size={20} color="#667eea" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 50" 
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={seatCount}
              onChangeText={setSeatCount}
            />
          </View>
        </View>

        {/* Instructions Card */}
        <View style={[styles.card, styles.instructionCard]}>
          <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
          <Text style={styles.instructionText}>
            Walk to each corner (A, B, C, D) of the classroom and tap the corresponding button to record the boundary coordinates.
          </Text>
        </View>

        {/* Points Grid */}
        <Text style={styles.sectionTitle}>Corner Points</Text>
        <View style={styles.grid}>
          {['a', 'b', 'c', 'd'].map((item) => {
            const isCaptured = !!points[item];
            const isCapturingThis = capturing === item;
            
            return (
              <TouchableOpacity 
                key={item} 
                style={[
                  styles.pointBtn, 
                  isCaptured && styles.pointDone,
                  isCapturingThis && styles.pointCapturing
                ]} 
                onPress={() => capturePoint(item)}
                disabled={isCapturingThis}
                activeOpacity={0.8}
              >
                {isCapturingThis ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={[styles.pointLabel, isCaptured && styles.pointLabelCaptured]}>
                      Point {item.toUpperCase()}
                    </Text>
                    {isCaptured ? (
                      <MaterialCommunityIcons name="checkbox-marked-circle" size={22} color="#fff" style={styles.checkIcon} />
                    ) : (
                      <MaterialCommunityIcons name="map-marker-outline" size={20} color="#94a3b8" style={styles.markerIcon} />
                    )}
                    {isCaptured && (
                      <Text style={styles.coordText} numberOfLines={1}>
                        {points[item].latitude.toFixed(6)}, {points[item].longitude.toFixed(6)}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, loading && { opacity: 0.8 }]} 
          onPress={handleSave} 
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtnGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.saveText}>Save Configuration</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: { 
    paddingTop: 60, 
    paddingBottom: 28, 
    paddingHorizontal: 24, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 24, color: '#fff' },
  headerSubtitle: { fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2,},
  
  scrollContent: { padding: 20 },
  
  card: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  label: { fontFamily: 'Outfit-Bold', fontSize: 12, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    borderRadius: 16, 
    paddingHorizontal: 16,
    height: 56
  },
  inputIcon: { marginRight: 12 },
  input: { fontFamily: 'Outfit-Medium', flex: 1, fontSize: 15, color: '#1e293b',},
  
  instructionCard: { 
    flexDirection: 'row', 
    backgroundColor: '#eff6ff', 
    borderColor: '#bfdbfe',
    alignItems: 'center' 
  },
  instructionText: { fontFamily: 'Outfit-Medium', flex: 1, color: '#1e40af', fontSize: 13, marginLeft: 12, lineHeight: 18 },
  
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#1e293b', marginBottom: 12, marginLeft: 4 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pointBtn: { 
    width: '48%', 
    height: 110, 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  pointDone: { 
    backgroundColor: '#10b981', 
    borderColor: '#10b981' 
  },
  pointCapturing: { 
    backgroundColor: '#667eea', 
    borderColor: '#667eea' 
  },
  pointLabel: { fontFamily: 'Outfit-Bold', color: '#64748b', fontSize: 15,},
  pointLabelCaptured: { fontFamily: 'Outfit-Regular', color: '#fff' },
  markerIcon: { marginTop: 6 },
  checkIcon: { marginTop: 4 },
  coordText: { fontFamily: 'Outfit-SemiBold', color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 4 },
  
  saveBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 12, elevation: 3 },
  saveBtnGradient: { 
    paddingVertical: 16, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  saveText: { fontFamily: 'Outfit-Bold', color: '#fff', fontSize: 16 }
});