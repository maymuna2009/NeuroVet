import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Returns today's date as a string like "2026-04-23"
function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Returns yesterday's date string
function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Returns "Good morning", "Good afternoon", or "Good evening"
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);

  // Load saved data when app opens
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const savedStreak = await AsyncStorage.getItem('streak');
    const lastDate = await AsyncStorage.getItem('lastExerciseDate');
    const today = todayString();
    const yesterday = yesterdayString();

    if (lastDate === today) {
      // Already exercised today
      setStreak(Number(savedStreak) || 0);
      setCompletedToday(true);
    } else if (lastDate === yesterday) {
      // Exercised yesterday — streak still alive, not done today yet
      setStreak(Number(savedStreak) || 0);
      setCompletedToday(false);
    } else {
      // Missed a day or first launch — reset streak
      setStreak(0);
      setCompletedToday(false);
      await AsyncStorage.setItem('streak', '0');
    }
  }

  async function markDoneToday() {
    if (completedToday) return; // prevent double-counting
    const newStreak = streak + 1;
    await AsyncStorage.setItem('streak', String(newStreak));
    await AsyncStorage.setItem('lastExerciseDate', todayString());
    setStreak(newStreak);
    setCompletedToday(true);
  }

  return (
    <View style={styles.container}>

      {/* Greeting */}
      <Text style={styles.greeting}>{greeting()}, Veteran</Text>
      <Text style={styles.date}>{new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      })}</Text>

      {/* Streak card */}
      <View style={styles.streakCard}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
        {streak >= 7 && <Text style={styles.badge}>🔥 One week strong</Text>}
        {streak >= 30 && <Text style={styles.badge}>⭐ 30-day milestone</Text>}
      </View>

      {/* Today's status */}
      <View style={[styles.statusCard, completedToday ? styles.statusDone : styles.statusPending]}>
        <Text style={styles.statusText}>
          {completedToday ? '✓ Exercises done today' : 'Exercises not done yet today'}
        </Text>
      </View>

      {/* Start button */}
      <TouchableOpacity
        style={[styles.startButton, completedToday && styles.startButtonDone]}
        onPress={markDoneToday}
        disabled={completedToday}
      >
        <Text style={styles.startButtonText}>
          {completedToday ? 'Come back tomorrow' : "Start Today's Exercises"}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  date: {
    fontSize: 15,
    color: '#7eb8a4',
    marginTop: 6,
    marginBottom: 40,
  },
  streakCard: {
    backgroundColor: '#1a2e4a',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    width: '75%',
    borderWidth: 1,
    borderColor: '#2a4a6a',
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#7eb8a4',
  },
  streakLabel: {
    fontSize: 18,
    color: '#8899aa',
    marginTop: 6,
  },
  badge: {
    fontSize: 13,
    color: '#7eb8a4',
    marginTop: 10,
  },
  statusCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statusDone: {
    backgroundColor: '#1a3a2a',
  },
  statusPending: {
    backgroundColor: '#2a1a1a',
  },
  statusText: {
    fontSize: 15,
    color: '#ccddcc',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#7eb8a4',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  startButtonDone: {
    backgroundColor: '#2a4a3a',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },
});
