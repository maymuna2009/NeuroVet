import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName, focusedName: IoniconsName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d1f35',
          borderTopColor: '#1a2e4a',
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: '#7eb8a4',
        tabBarInactiveTintColor: '#445566',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Exercises', tabBarIcon: tabIcon('barbell-outline', 'barbell') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: tabIcon('stats-chart-outline', 'stats-chart') }}
      />
      <Tabs.Screen
        name="resources"
        options={{ title: 'Resources', tabBarIcon: tabIcon('medkit-outline', 'medkit') }}
      />
    </Tabs>
  );
}
