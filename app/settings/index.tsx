import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function scheduleDaily(hour: number, minute: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'NeuroVet — Time to train 🧠',
      body: 'Your 5-minute brain training session is ready. Keep your streak going!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

function formatTime(hour: number, minute: number): string {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [remindersOn, setRemindersOn] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [largeText, setLargeText] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const r  = await AsyncStorage.getItem('remindersOn');
    const h  = await AsyncStorage.getItem('reminderHour');
    const m  = await AsyncStorage.getItem('reminderMinute');
    const lt = await AsyncStorage.getItem('largeText');
    if (r)  setRemindersOn(r === 'true');
    if (h)  setSelectedHour(Number(h));
    if (m)  setSelectedMinute(Number(m));
    if (lt) setLargeText(lt === 'true');
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  }

  async function toggleReminders(val: boolean) {
    if (val && !permissionGranted) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      setPermissionGranted(true);
    }
    setRemindersOn(val);
    await AsyncStorage.setItem('remindersOn', String(val));
    if (val) await scheduleDaily(selectedHour, selectedMinute);
    else await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async function updateHour(h: number) {
    setSelectedHour(h);
    await AsyncStorage.setItem('reminderHour', String(h));
    if (remindersOn) await scheduleDaily(h, selectedMinute);
  }

  async function updateMinute(m: number) {
    setSelectedMinute(m);
    await AsyncStorage.setItem('reminderMinute', String(m));
    if (remindersOn) await scheduleDaily(selectedHour, m);
  }

  async function toggleLargeText(val: boolean) {
    setLargeText(val);
    await AsyncStorage.setItem('largeText', String(val));
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      {/* Daily Reminder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DAILY REMINDER</Text>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Enable daily reminder</Text>
            <Text style={styles.rowSub}>Get notified to complete your exercises</Text>
          </View>
          <Switch
            value={remindersOn}
            onValueChange={toggleReminders}
            trackColor={{ false: '#2a4a6a', true: '#7eb8a4' }}
            thumbColor="#ffffff"
          />
        </View>

        {remindersOn && (
          <View style={styles.timePicker}>
            <Text style={styles.timePickerLabel}>Set reminder time</Text>

            <View style={styles.timeControls}>
              {/* Hour */}
              <View style={styles.timeUnit}>
                <TouchableOpacity style={styles.timeArrow} onPress={() => updateHour((selectedHour + 1) % 24)}>
                  <Text style={styles.timeArrowText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>
                  {selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour}
                </Text>
                <TouchableOpacity style={styles.timeArrow} onPress={() => updateHour((selectedHour + 23) % 24)}>
                  <Text style={styles.timeArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeColon}>:</Text>

              {/* Minute — steps of 15 */}
              <View style={styles.timeUnit}>
                <TouchableOpacity style={styles.timeArrow} onPress={() => updateMinute((selectedMinute + 15) % 60)}>
                  <Text style={styles.timeArrowText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{String(selectedMinute).padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.timeArrow} onPress={() => updateMinute((selectedMinute + 45) % 60)}>
                  <Text style={styles.timeArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* AM/PM toggle */}
              <TouchableOpacity
                style={styles.ampmButton}
                onPress={() => updateHour((selectedHour + 12) % 24)}
              >
                <Text style={styles.ampmText}>{selectedHour < 12 ? 'AM' : 'PM'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.currentTime}>
              Reminder set daily at {formatTime(selectedHour, selectedMinute)}
            </Text>
          </View>
        )}
      </View>

      {/* Accessibility */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCESSIBILITY</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Larger text</Text>
            <Text style={styles.rowSub}>Increases text size throughout the app</Text>
          </View>
          <Switch
            value={largeText}
            onValueChange={toggleLargeText}
            trackColor={{ false: '#2a4a6a', true: '#7eb8a4' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoRow}>Version 1.0</Text>
          <Text style={styles.infoRow}>All data stored locally on your device</Text>
          <Text style={styles.infoRow}>Nothing is uploaded or shared without your action</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a1628' },
  container: { padding: 24, paddingTop: 56, paddingBottom: 48 },
  backButton: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 32 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#8899aa', letterSpacing: 1, marginBottom: 12 },
  row: {
    backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2a4a6a', marginBottom: 10,
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowLabel: { fontSize: 16, color: '#ffffff', fontWeight: '600' },
  rowSub: { fontSize: 13, color: '#8899aa', marginTop: 3 },
  timePicker: {
    backgroundColor: '#1a2e4a', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#2a4a6a', alignItems: 'center',
  },
  timePickerLabel: { fontSize: 13, color: '#8899aa', marginBottom: 20 },
  timeControls: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  timeUnit: { alignItems: 'center', gap: 8 },
  timeArrow: { padding: 8 },
  timeArrowText: { fontSize: 18, color: '#7eb8a4', fontWeight: 'bold' },
  timeValue: { fontSize: 36, fontWeight: 'bold', color: '#ffffff', minWidth: 50, textAlign: 'center' },
  timeColon: { fontSize: 36, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  ampmButton: {
    backgroundColor: '#0d1f35', borderRadius: 10, paddingVertical: 10,
    paddingHorizontal: 14, borderWidth: 1, borderColor: '#7eb8a4',
  },
  ampmText: { fontSize: 18, fontWeight: 'bold', color: '#7eb8a4' },
  currentTime: { fontSize: 14, color: '#7eb8a4', fontWeight: '600' },
  infoCard: {
    backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2a4a6a', gap: 8,
  },
  infoRow: { fontSize: 13, color: '#8899aa' },
});
