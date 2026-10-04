import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useMemberAuth } from '../context/AuthContext';

// Screens
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { BillsScreen } from '../screens/BillsScreen';
import { PayUpiScreen } from '../screens/PayUpiScreen';
import { CashConfirmModal } from '../screens/CashConfirmModal';
import { ComplaintsScreen } from '../screens/ComplaintsScreen';
import { CreateComplaintScreen } from '../screens/CreateComplaintScreen';
import { ComplaintDetailScreen } from '../screens/ComplaintDetailScreen';
import { MoreScreen } from '../screens/MoreScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabBarIcon = ({ emoji, focused }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
);

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#131B2E' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="BillsTab"
        component={BillsScreen}
        options={{
          headerTitle: 'Maintenance Bills',
          tabBarLabel: 'Bills',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="📄" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ComplaintsTab"
        component={ComplaintsScreen}
        options={{
          headerTitle: 'Complaints',
          tabBarLabel: 'Complaints',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🛠️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'More',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, loading } = useMemberAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Member Portal...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#131B2E' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          contentStyle: { backgroundColor: '#090D16' },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PayUpi"
              component={PayUpiScreen}
              options={{ headerTitle: 'Pay Maintenance (UPI)' }}
            />
            <Stack.Screen
              name="CashConfirm"
              component={CashConfirmModal}
              options={{ presentation: 'transparentModal', headerShown: false }}
            />
            <Stack.Screen
              name="CreateComplaint"
              component={CreateComplaintScreen}
              options={{ headerTitle: 'Raise Complaint' }}
            />
            <Stack.Screen
              name="ComplaintDetail"
              component={ComplaintDetailScreen}
              options={{ headerTitle: 'Complaint Thread' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
