import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './src/screens/LoginScreen';
import UserDashboard from './src/screens/UserDashboard';
import AdminDashboard from './src/screens/AdminDashboard';
import AddClassLocation from './src/screens/AddClassLocation';
import AttendanceReports from './src/screens/AttendanceReports';
import AbsentUploader from './src/screens/AbsentUploader';
import ChatScreen from './src/screens/ChatScreen';
import ContactAdminScreen from './src/screens/ContactAdminScreen';
import AssignSubjects from './src/screens/AssignSubjects';
import ManageTimetable from './src/screens/ManageTimetable';
import ViewAssignedSubjects from './src/screens/ViewAssignedSubjects';
import AdminAIChat from './src/screens/AdminAIChat';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="UserDashboard" component={UserDashboard} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="AddClassLocation" component={AddClassLocation} />
        <Stack.Screen name="AttendanceReports" component={AttendanceReports} />
        <Stack.Screen name="AbsentUploader" component={AbsentUploader} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="ContactAdmin" component={ContactAdminScreen} />
        <Stack.Screen name="AssignSubjects" component={AssignSubjects} />
        <Stack.Screen name="ManageTimetable" component={ManageTimetable} />
        <Stack.Screen name="ViewAssignedSubjects" component={ViewAssignedSubjects} />
        <Stack.Screen name="AdminAIChat" component={AdminAIChat} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}