import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d1f35',
          borderTopColor: '#1a2e4a',
        },
        tabBarActiveTintColor: '#7eb8a4',
        tabBarInactiveTintColor: '#445566',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Exercises' }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress' }}
      />
      <Tabs.Screen
        name="resources"
        options={{ title: 'Resources' }}
      />
    </Tabs>
  );
}
