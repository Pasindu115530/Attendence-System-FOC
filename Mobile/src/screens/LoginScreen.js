import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    try {
      // Use the IP and port 3000 as you configured in your terminal
      const response = await fetch('https://attendence-system-foc.onrender.com/Backend/api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const result = await response.json();

    if (result.status === "success") {
      // Redirect based on the role received from PHP
      if (result.role === "admin") {
        navigation.replace('AdminDashboard'); // Matches AdminDashboard.js
      } else if (result.role === "lecturer") {
        navigation.replace('AdminDashboard');  // Matches UserDashboard.js
      } else if (result.role === "student") {
        navigation.replace('UserDashboard');  // Matches UserDashboard.js
      }   
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error("Login Error:", error);
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