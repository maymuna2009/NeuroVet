import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ResourcesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resources</Text>
      <Text style={styles.subtitle}>VA Crisis Line · TBI Support · Portland VA</Text>
      <Text style={styles.coming}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 15,
    color: '#7eb8a4',
    marginTop: 10,
  },
  coming: {
    fontSize: 14,
    color: '#445566',
    marginTop: 24,
  },
});
