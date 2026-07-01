import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function DashboardRedirect({ navigation }) {
  useEffect(() => {
    // Simply route to Login on entry to avoid empty screen hangs
    navigation.replace('Login');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
  );
}