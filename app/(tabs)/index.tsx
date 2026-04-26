import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const SLEEP_EMOJIS = ['😴', '😟', '😐', '😊', '🌟'];

const EXERCISES = [
  { route: '/exercises/memory-grid', name: 'Memory Grid', sub: 'Working Memory', icon: 'grid-outline' as const, key: 'memoryGridLast', color: '#7eb8a4', unit: '' },
  { route: '/exercises/focus-filter', name: 'Focus Filter', sub: 'Attention', icon: 'eye-outline' as const, key: 'focusLastAccuracy', color: '#8aabcc', unit: '%' },
  { route: '/exercises/speed-match', name: 'Speed Match', sub: 'Processing Speed', icon: 'flash-outline' as const, key: 'speedMatchLast', color: '#c8a87e', unit: '' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const { fs } = useTextSize();
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [lastCheckinDate, setLastCheckinDate] = useState<string | null>(null);
  const [lastCheckinScore, setLastCheckinScore] = useState<number | null>(null);
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [todaySleep, setTodaySleep] = useState<number | null>(null);
  const [lastSleepDate, setLastSleepDate] = useState<string | null>(null);
  const [lastScores, setLastScores] = useState<Record<string, string>>({});
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

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

    const moodDate = await AsyncStorage.getItem('moodLastDate');
    const moodVal = await AsyncStorage.getItem('moodLastValue');
    if (moodDate === today && moodVal) setTodayMood(Number(moodVal));
    else setTodayMood(null);

    const sleepDate = await AsyncStorage.getItem('sleepLastDate');
    const sleepVal = await AsyncStorage.getItem('sleepLastValue');
    setLastSleepDate(sleepDate);
    if (sleepDate === today && sleepVal) setTodaySleep(Number(sleepVal));
    else setTodaySleep(null);

    const scores: Record<string, string> = {};
    for (const ex of EXERCISES) {
      const v = await AsyncStorage.getItem(ex.key);
      if (v) scores[ex.key] = v;
    }
    setLastScores(scores);
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

  async function saveMood(value: number) {
    setTodayMood(value);
    setShowMoodPicker(false);
    await AsyncStorage.setItem('moodLastDate', todayString());
    await AsyncStorage.setItem('moodLastValue', String(value));
    const existing = await AsyncStorage.getItem('moodHistory');
    const history = existing ? JSON.parse(existing) : [];
    await AsyncStorage.setItem('moodHistory', JSON.stringify([...history, { date: todayString(), mood: value }].slice(-60)));
  }

  async function saveSleep(value: number) {
    setTodaySleep(value);
    setShowSleepPicker(false);
    setLastSleepDate(todayString());
    await AsyncStorage.setItem('sleepLastDate', todayString());
    await AsyncStorage.setItem('sleepLastValue', String(value));
    const existing = await AsyncStorage.getItem('sleepHistory');
    const history = existing ? JSON.parse(existing) : [];
    await AsyncStorage.setItem('sleepHistory', JSON.stringify([...history, { date: todayString(), sleep: value }].slice(-60)));
  }

  const checkinDaysAgo = lastCheckinDate ? daysSince(lastCheckinDate) : null;
  const checkinDue = checkinDaysAgo === null || checkinDaysAgo >= 7;
  const sleepDue = lastSleepDate === null || daysSince(lastSleepDate) >= 7;

  // Onboarding
  if (userName === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0a1628" />
        <KeyboardAvoidingView style={styles.onboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Text style={styles.onboardEmoji}>🧠</Text>
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
          <TouchableOpacity style={[styles.primaryButton, !nameInput.trim() && styles.primaryButtonDone]} onPress={saveName} disabled={!nameInput.trim()}>
            <Text style={[styles.primaryButtonText, !nameInput.trim() && styles.primaryButtonTextDone]}>Get Started</Text>
          </TouchableOpacity>
          <Text style={styles.onboardDisclaimer}>Your data stays on your device. Nothing is uploaded.</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoIcon}>
              <Ionicons name="fitness-outline" size={22} color="#7eb8a4" />
            </View>
            <View>
              <Text style={[styles.greeting, { fontSize: fs(17) }]}>{greeting()}, {userName}</Text>
              <Text style={[styles.date, { fontSize: fs(12) }]}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color="#8899aa" />
          </TouchableOpacity>
        </View>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={[styles.streakNumber, { fontSize: fs(60) }]}>{streak}</Text>
            <Text style={[styles.streakLabel, { fontSize: fs(13) }]}>Day Streak</Text>
            {streak >= 7 && <Text style={styles.heroBadge}>🔥 {streak} days strong</Text>}
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroRight}>
            <View style={[styles.statusPill, completedToday ? styles.statusPillDone : styles.statusPillPending]}>
              <Text style={[styles.statusPillText, { fontSize: fs(13) }]}>
                {completedToday ? '✓ Done' : '○ Pending'}
              </Text>
            </View>
            <Text style={styles.heroSub}>
              {completedToday ? 'Great work!' : 'Start when ready'}
            </Text>
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.primaryButton, completedToday && styles.primaryButtonDone]}
          onPress={markDoneToday}
          disabled={completedToday}
        >
          <Text style={[styles.primaryButtonText, completedToday && styles.primaryButtonTextDone, { fontSize: fs(16) }]}>
            {completedToday ? '✓  Exercises complete for today' : "▶  Start Today's Exercises"}
          </Text>
        </TouchableOpacity>

        {/* Exercise cards */}
        <Text style={styles.sectionLabel}>EXERCISES</Text>
        {EXERCISES.map(ex => {
          const rawScore = lastScores[ex.key];
          const scoreDisplay = rawScore && Number(rawScore) > 0
            ? `${rawScore}${ex.unit}`
            : '—';
          return (
            <TouchableOpacity
              key={ex.route}
              style={[styles.exerciseCard, { borderLeftColor: ex.color }]}
              onPress={() => router.push(ex.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.exerciseIconBox, { backgroundColor: ex.color + '22' }]}>
                <Ionicons name={ex.icon} size={22} color={ex.color} />
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { fontSize: fs(15) }]}>{ex.name}</Text>
                <Text style={styles.exerciseSub}>{ex.sub}</Text>
              </View>
              <View style={styles.exerciseScore}>
                <Text style={[styles.exerciseScoreVal, { color: ex.color }]}>{scoreDisplay}</Text>
                {scoreDisplay !== '—' && <Text style={styles.exerciseScoreLabel}>last</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#445566" />
            </TouchableOpacity>
          );
        })}

        {/* Data tiles */}
        <Text style={styles.sectionLabel}>TODAY</Text>
        <View style={styles.tilesRow}>
          <TouchableOpacity style={[styles.tile, checkinDue && styles.tileDue]} onPress={() => router.push('/checkin')}>
            <Text style={styles.tileIcon}>📋</Text>
            <Text style={[styles.tileValue, lastCheckinScore !== null ? { color: checkinZoneColor(lastCheckinScore) } : {}]}>
              {lastCheckinScore !== null ? `${lastCheckinScore}` : '—'}
            </Text>
            <Text style={styles.tileLabel}>Check-In</Text>
            {checkinDue && <View style={styles.tileDot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => todayMood === null && setShowMoodPicker(!showMoodPicker)}>
            <Text style={styles.tileIcon}>{todayMood !== null ? MOOD_EMOJIS[todayMood - 1] : '😐'}</Text>
            <Text style={styles.tileValue}>{todayMood ?? '—'}</Text>
            <Text style={styles.tileLabel}>Mood</Text>
            {todayMood === null && <View style={styles.tileDot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => sleepDue && setShowSleepPicker(!showSleepPicker)}>
            <Text style={styles.tileIcon}>{todaySleep !== null ? SLEEP_EMOJIS[todaySleep - 1] : '💤'}</Text>
            <Text style={styles.tileValue}>{todaySleep ?? '—'}</Text>
            <Text style={styles.tileLabel}>Sleep</Text>
            {sleepDue && <View style={styles.tileDot} />}
          </TouchableOpacity>
        </View>

        {/* Inline pickers */}
        {showMoodPicker && (
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>How are you feeling today?</Text>
            <View style={styles.pickerRow}>
              {MOOD_EMOJIS.map((emoji, i) => (
                <TouchableOpacity key={i} style={styles.pickerButton} onPress={() => saveMood(i + 1)}>
                  <Text style={styles.pickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showSleepPicker && (
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>How has your sleep been this week?</Text>
            <View style={styles.pickerRow}>
              {SLEEP_EMOJIS.map((emoji, i) => (
                <TouchableOpacity key={i} style={styles.pickerButton} onPress={() => saveSleep(i + 1)}>
                  <Text style={styles.pickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.pickerHint}>1 = very poor · 5 = excellent</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built for those who served. Every session matters.
          </Text>
          <Text style={styles.footerSub}>NeuroVet · Made for veterans, with care</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a1628' },
  container: { padding: 20, paddingTop: 12, paddingBottom: 16 },

  // Onboarding
  onboardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  onboardEmoji: { fontSize: 56, marginBottom: 16 },
  onboardTitle: { fontSize: 30, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  onboardSub: { fontSize: 15, color: '#7eb8a4', marginTop: 8, marginBottom: 40, textAlign: 'center', lineHeight: 22 },
  onboardLabel: { fontSize: 15, color: '#aabbcc', marginBottom: 12, alignSelf: 'flex-start' },
  nameInput: { width: '100%', backgroundColor: '#1a2e4a', borderRadius: 12, padding: 16, fontSize: 17, color: '#ffffff', borderWidth: 1, borderColor: '#2a4a6a', marginBottom: 20 },
  onboardDisclaimer: { fontSize: 12, color: '#445566', marginTop: 16, textAlign: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, marginTop: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a4a6a' },
  logoEmoji: { fontSize: 22 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  date: { fontSize: 14, color: '#8899aa', marginTop: 4 },
  settingsButton: { padding: 6 },

  // Hero card
  heroCard: { backgroundColor: '#1a2e4a', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#2a4a6a' },
  heroLeft: { alignItems: 'center', flex: 1 },
  streakNumber: { fontSize: 60, fontWeight: 'bold', color: '#7eb8a4', lineHeight: 64 },
  streakLabel: { fontSize: 13, color: '#8899aa', marginTop: 2 },
  heroBadge: { fontSize: 11, color: '#c8a87e', marginTop: 6 },
  heroDivider: { width: 1, height: 64, backgroundColor: '#2a4a6a', marginHorizontal: 18 },
  heroRight: { flex: 1, alignItems: 'center', gap: 8 },
  statusPill: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18 },
  statusPillDone: { backgroundColor: '#7eb8a4' },
  statusPillPending: { backgroundColor: '#2a2a1a' },
  statusPillText: { fontSize: 13, fontWeight: '700', color: '#0a1628', textAlign: 'center' },
  heroSub: { fontSize: 12, color: '#8899aa' },

  // Primary button
  primaryButton: { backgroundColor: '#7eb8a4', paddingVertical: 13, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  primaryButtonDone: { backgroundColor: '#1a2e4a' },
  primaryButtonText: { fontSize: 16, fontWeight: 'bold', color: '#0a1628' },
  primaryButtonTextDone: { color: '#7eb8a4' },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#445566', letterSpacing: 1.2, marginBottom: 10 },

  // Exercise cards
  exerciseCard: { backgroundColor: '#1a2e4a', borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 7, borderWidth: 1, borderColor: '#2a4a6a', borderLeftWidth: 3 },
  exerciseAccent: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exerciseIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  exerciseSub: { fontSize: 12, color: '#8899aa', marginTop: 2 },
  exerciseScore: { alignItems: 'center', marginRight: 10 },
  exerciseScoreVal: { fontSize: 18, fontWeight: 'bold' },
  exerciseScoreLabel: { fontSize: 10, color: '#445566', marginTop: 1 },

  // Tiles
  tilesRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tile: { flex: 1, backgroundColor: '#1a2e4a', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a4a6a', position: 'relative' },
  tileDue: { borderColor: '#c8a87e' },
  tileIcon: { fontSize: 22, marginBottom: 4 },
  tileValue: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  tileLabel: { fontSize: 11, color: '#8899aa', marginTop: 3 },
  tileDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#c8a87e' },

  // Pickers
  pickerCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 18, marginTop: 10, borderWidth: 1, borderColor: '#2a4a6a', alignItems: 'center' },
  pickerTitle: { fontSize: 14, color: '#aabbcc', marginBottom: 16, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', gap: 12 },
  pickerButton: { padding: 6 },
  pickerEmoji: { fontSize: 34 },
  pickerHint: { fontSize: 11, color: '#445566', marginTop: 12 },
  footer: { marginTop: 20, alignItems: 'center', paddingBottom: 8 },
  footerText: { fontSize: 14, color: '#445566', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
  footerSub: { fontSize: 11, color: '#2a4a6a', marginTop: 6 },
});
