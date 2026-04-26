import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTextSize } from '@/context/TextSizeContext';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function checkinZoneColor(score: number): string {
  if (score <= 13) return '#7eb8a4';
  if (score <= 26) return '#c8a87e';
  return '#cc6666';
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const { fs } = useTextSize();
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [lastCheckinDate, setLastCheckinDate] = useState<string | null>(null);
  const [lastCheckinScore, setLastCheckinScore] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const name = await AsyncStorage.getItem('userName');
    setUserName(name);

    const savedStreak = await AsyncStorage.getItem('streak');
    const lastDate = await AsyncStorage.getItem('lastExerciseDate');
    const today = todayString();
    const yesterday = yesterdayString();

    if (lastDate === today) {
      setStreak(Number(savedStreak) || 0);
      setCompletedToday(true);
    } else if (lastDate === yesterday) {
      setStreak(Number(savedStreak) || 0);
      setCompletedToday(false);
    } else {
      setStreak(0);
      setCompletedToday(false);
      await AsyncStorage.setItem('streak', '0');
    }

    const checkinDate = await AsyncStorage.getItem('checkinLastDate');
    const checkinScore = await AsyncStorage.getItem('checkinLastScore');
    setLastCheckinDate(checkinDate);
    if (checkinScore) setLastCheckinScore(Number(checkinScore));
  }

  async function saveName() {
    const name = nameInput.trim();
    if (!name) return;
    await AsyncStorage.setItem('userName', name);
    setUserName(name);
  }

  async function markDoneToday() {
    if (completedToday) return;
    const newStreak = streak + 1;
    await AsyncStorage.setItem('streak', String(newStreak));
    await AsyncStorage.setItem('lastExerciseDate', todayString());
    setStreak(newStreak);
    setCompletedToday(true);
    router.push('/(tabs)/exercises');
  }

  const checkinDaysAgo = lastCheckinDate ? daysSince(lastCheckinDate) : null;
  const checkinDue = checkinDaysAgo === null || checkinDaysAgo >= 7;

  // First launch — ask for name
  if (userName === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0a1628" />
        <KeyboardAvoidingView
          style={styles.onboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Text style={styles.onboardTitle}>Welcome to NeuroVet</Text>
          <Text style={styles.onboardSub}>Daily brain training for veterans with TBI</Text>
          <Text style={styles.onboardLabel}>What should we call you?</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter your first name"
            placeholderTextColor="#445566"
            value={nameInput}
            onChangeText={setNameInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveName}
          />
          <TouchableOpacity
            style={[styles.startButton, !nameInput.trim() && styles.startButtonDone]}
            onPress={saveName}
            disabled={!nameInput.trim()}
          >
            <Text style={styles.startButtonText}>Get Started</Text>
          </TouchableOpacity>
          <Text style={styles.onboardDisclaimer}>
            Your data stays on your device. Nothing is uploaded.
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Logo + Settings */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🧠</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logoName}>NeuroVet</Text>
            <Text style={styles.logoTagline}>Brain Training for Veterans</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.greeting, { fontSize: fs(26) }]}>{greeting()}, {userName}</Text>
        <Text style={[styles.date, { fontSize: fs(15) }]}>{new Date().toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        })}</Text>

        {/* Streak card */}
        <View style={styles.streakCard}>
          <Text style={[styles.streakNumber, { fontSize: fs(72) }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { fontSize: fs(18) }]}>Day Streak</Text>
          {streak >= 7  && <Text style={[styles.badge, { fontSize: fs(13) }]}>🔥 One week strong</Text>}
          {streak >= 30 && <Text style={[styles.badge, { fontSize: fs(13) }]}>⭐ 30-day milestone</Text>}
        </View>

        {/* Exercise status */}
        <View style={[styles.statusCard, completedToday ? styles.statusDone : styles.statusPending]}>
          <Text style={[styles.statusText, { fontSize: fs(15) }]}>
            {completedToday ? '✓ Exercises done today' : 'Exercises not done yet today'}
          </Text>
        </View>

        {/* Start button — navigates to Exercises tab */}
        <TouchableOpacity
          style={[styles.startButton, completedToday && styles.startButtonDone]}
          onPress={markDoneToday}
          disabled={completedToday}
        >
          <Text style={styles.startButtonText}>
            {completedToday ? 'Come back tomorrow' : "Start Today's Exercises"}
          </Text>
        </TouchableOpacity>

        {/* Weekly Check-In card */}
        <TouchableOpacity
          style={[styles.checkinCard, checkinDue && styles.checkinCardDue]}
          onPress={() => router.push('/checkin')}
          activeOpacity={0.8}
        >
          <View style={styles.checkinLeft}>
            <Text style={styles.checkinTitle}>Weekly Check-In</Text>
            <Text style={styles.checkinSub}>
              {checkinDaysAgo === null ? 'Never completed — tap to start'
                : checkinDaysAgo === 0 ? 'Completed today'
                : checkinDaysAgo === 1 ? 'Completed yesterday'
                : `${checkinDaysAgo} days ago`}
            </Text>
          </View>
          <View style={styles.checkinRight}>
            {lastCheckinScore !== null ? (
              <>
                <Text style={[styles.checkinScore, { color: checkinZoneColor(lastCheckinScore) }]}>
                  {lastCheckinScore}
                </Text>
                <Text style={styles.checkinScoreLabel}>/40</Text>
              </>
            ) : (
              <Text style={styles.checkinArrow}>→</Text>
            )}
          </View>
        </TouchableOpacity>

        {checkinDue && (
          <Text style={styles.checkinDueNote}>
            {checkinDaysAgo === null ? 'Start tracking your symptoms' : 'Your weekly check-in is due'}
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a1628' },
  container: { alignItems: 'center', padding: 24, paddingTop: 32, paddingBottom: 40 },
  onboardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  onboardTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  onboardSub: { fontSize: 16, color: '#7eb8a4', marginTop: 10, marginBottom: 48, textAlign: 'center' },
  onboardLabel: { fontSize: 16, color: '#aabbcc', marginBottom: 16, alignSelf: 'flex-start' },
  nameInput: {
    width: '100%', backgroundColor: '#1a2e4a', borderRadius: 12,
    padding: 16, fontSize: 18, color: '#ffffff',
    borderWidth: 1, borderColor: '#2a4a6a', marginBottom: 20,
  },
  onboardDisclaimer: { fontSize: 12, color: '#445566', marginTop: 16, textAlign: 'center' },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', alignSelf: 'flex-start' },
  date: { fontSize: 15, color: '#7eb8a4', marginTop: 6, marginBottom: 32, alignSelf: 'flex-start' },
  streakCard: {
    backgroundColor: '#1a2e4a', borderRadius: 20, padding: 36,
    alignItems: 'center', marginBottom: 20, width: '75%',
    borderWidth: 1, borderColor: '#2a4a6a',
  },
  streakNumber: { fontSize: 72, fontWeight: 'bold', color: '#7eb8a4' },
  streakLabel: { fontSize: 18, color: '#8899aa', marginTop: 6 },
  badge: { fontSize: 13, color: '#7eb8a4', marginTop: 10 },
  statusCard: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 20 },
  statusDone: { backgroundColor: '#1a3a2a' },
  statusPending: { backgroundColor: '#2a1a1a' },
  statusText: { fontSize: 15, color: '#ccddcc', fontWeight: '600' },
  startButton: {
    backgroundColor: '#7eb8a4', paddingVertical: 18,
    paddingHorizontal: 40, borderRadius: 14, marginBottom: 32, width: '100%', alignItems: 'center',
  },
  startButtonDone: { backgroundColor: '#2a4a3a' },
  startButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  checkinCard: {
    width: '100%', backgroundColor: '#1a2e4a', borderRadius: 16,
    padding: 18, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: '#2a4a6a',
  },
  checkinCardDue: { borderColor: '#c8a87e' },
  checkinLeft: { flex: 1 },
  checkinTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  checkinSub: { fontSize: 13, color: '#8899aa', marginTop: 4 },
  checkinRight: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 16 },
  checkinScore: { fontSize: 28, fontWeight: 'bold' },
  checkinScoreLabel: { fontSize: 13, color: '#8899aa', marginLeft: 2 },
  checkinArrow: { fontSize: 20, color: '#8899aa' },
  checkinDueNote: { fontSize: 13, color: '#c8a87e', marginTop: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28, width: '100%' },
  logoIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7eb8a4',
  },
  logoEmoji: { fontSize: 28 },
  logoName: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  logoTagline: { fontSize: 12, color: '#7eb8a4', marginTop: 2 },
  settingsButton: { padding: 8 },
  settingsIcon: { fontSize: 22 },
});
