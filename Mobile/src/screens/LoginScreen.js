import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Basic logic to differentiate Admin and User
    if (username.toLowerCase() === 'admin') {
      navigation.replace('AdminDashboard');
    } else {
      navigation.replace('UserDashboard');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>StudyNest</Text>
        <Text style={styles.subtitle}>Smart Attendance System</Text>

        <TextInput 
          style={styles.input} 
          placeholder="Registration No / Username" 
          placeholderTextColor="#95a5a6"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor="#95a5a6"
          secureTextEntry 
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', padding: 30, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ecf0f1', color: '#2c3e50' },
  button: { backgroundColor: '#3498db', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});