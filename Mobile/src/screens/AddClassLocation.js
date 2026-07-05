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
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { post } from '../api';

const { width } = Dimensions.get('window');

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
              <Text style={styles.headerSubtitle}>Define boundaries</Text>
              <Text style={styles.headerTitle}>Set Geofence</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>

      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Room Name Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Classroom Information</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="school" size={20} color="#35A7C4" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Hall 01, Lab B" 
              placeholderTextColor="#7C8BA1"
              value={roomName}
              onChangeText={setRoomName}
            />
          </View>
          
          <Text style={[styles.label, { marginTop: 16 }]}>Seat Capacity</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="chair-school" size={20} color="#35A7C4" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 50" 
              placeholderTextColor="#7C8BA1"
              keyboardType="numeric"
              value={seatCount}
              onChangeText={setSeatCount}
            />
          </View>
        </View>

        {/* Instructions Card */}
        <View style={[styles.card, styles.instructionCard]}>
          <MaterialCommunityIcons name="information" size={20} color="#35A7C4" />
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
                  <ActivityIndicator color="#35A7C4" size="small" />
                ) : (
                  <>
                    <Text style={[styles.pointLabel, isCaptured ? styles.pointLabelCaptured : styles.pointLabelUncaptured]}>
                      Point {item.toUpperCase()}
                    </Text>
                    {isCaptured ? (
                      <MaterialCommunityIcons name="checkbox-marked-circle" size={22} color="#fff" style={styles.checkIcon} />
                    ) : (
                      <MaterialCommunityIcons name="map-marker-outline" size={20} color="#7C8BA1" style={styles.markerIcon} />
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
        <View style={styles.saveBtnShadow}>
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSave} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="content-save" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.saveText}>Save Configuration</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
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
  
  scrollContent: {
    padding: 20,
  },
  
  card: { 
    backgroundColor: '#ECF0F3', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#7C8BA1',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: { 
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    fontFamily: 'Outfit-Medium',
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#2C3A4E',
  },
  
  instructionCard: { 
    flexDirection: 'row', 
    backgroundColor: '#ECF0F3', 
    borderColor: 'rgba(53, 167, 196, 0.25)',
    borderWidth: 1.5,
    alignItems: 'center',
  },
  instructionText: {
    fontFamily: 'Outfit-Medium',
    flex: 1,
    color: '#2C3A4E',
    fontSize: 13,
    marginLeft: 12,
    lineHeight: 18,
  },
  
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#2C3A4E',
    marginBottom: 12,
    marginLeft: 4,
  },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pointBtn: { 
    width: '48%', 
    height: 110, 
    backgroundColor: '#ECF0F3', 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#A3B1C6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 2,
  },
  pointDone: { 
    backgroundColor: '#35A7C4', // Cyan active corner point background
    borderColor: '#35A7C4',
    shadowColor: '#288BA3',
    shadowOpacity: 0.35,
  },
  pointCapturing: { 
    backgroundColor: '#ECF0F3',
    borderColor: '#35A7C4',
  },
  pointLabel: {
    fontSize: 15,
  },
  pointLabelUncaptured: {
    fontFamily: 'Outfit-Bold',
    color: '#7C8BA1',
  },
  pointLabelCaptured: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
  markerIcon: {
    marginTop: 6,
  },
  checkIcon: {
    marginTop: 4,
  },
  coordText: {
    fontFamily: 'Outfit-SemiBold',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    marginTop: 4,
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
    marginTop: 12,
  },
  saveBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#35A7C4', // Cyan active save boundary button
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    fontSize: 16,
  },
});