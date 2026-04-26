import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

type CheckinEntry = { date: string; score: number };
type MoodEntry = { date: string; mood: number };

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_COLORS = ['#cc6666', '#c8a87e', '#8899aa', '#7eb8a4', '#5ec8a4'];

type SleepEntry = { date: string; sleep: number };

type Stats = {
  memoryHistory: number[];
  memoryBest: number;
  focusHistory: number[];
  focusBest: number;
  speedHistory: number[];
  speedBest: number;
  trailHistoryA: number[];
  trailBestA: number | null;
  trailHistoryB: number[];
  trailBestB: number | null;
  checkinHistory: CheckinEntry[];
  moodHistory: MoodEntry[];
  sleepHistory: SleepEntry[];
  streak: number;
};

function checkinColor(score: number): string {
  if (score <= 13) return '#7eb8a4';
  if (score <= 26) return '#c8a87e';
  return '#cc6666';
}

function trend(history: number[]): string {
  if (history.length < 2) return '–';
  const recent = history.slice(-3);
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const diff = avg(recent) - avg(history.slice(0, Math.max(1, history.length - 3)));
  if (diff > 1) return '↑ Improving';
  if (diff < -1) return '↓ Declining';
  return '→ Stable';
}

function trendColor(t: string): string {
  if (t.startsWith('↑')) return '#7eb8a4';
  if (t.startsWith('↓')) return '#cc6666';
  return '#8899aa';
}

// Generic horizontal bar chart
function BarChart({
  data, color, maxOverride, label,
}: {
  data: number[];
  color: string;
  maxOverride?: number;
  label?: (v: number) => string;
}) {
  if (data.length === 0) {
    return <Text style={styles.noData}>No data yet — complete some sessions</Text>;
  }
  const max = maxOverride ?? Math.max(...data, 1);
  return (
    <View style={styles.bars}>
      {data.map((v, i) => {
        const barH = Math.max((v / max) * 80, 6);
        return (
          <View key={i} style={styles.barWrapper}>
            <Text style={styles.barLabel}>{label ? label(v) : v}</Text>
            <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
          </View>
        );
      })}
    </View>
  );
}

function SectionCard({
  title, tag, color, best, bestLabel, trendStr, children,
}: {
  title: string; tag: string; color: string;
  best: number | string; bestLabel: string;
  trendStr: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardTag}>{tag}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardBest, { color }]}>{best}</Text>
          <Text style={styles.cardBestLabel}>{bestLabel}</Text>
        </View>
      </View>
      <Text style={[styles.trendText, { color: trendColor(trendStr) }]}>{trendStr}</Text>
      <View style={styles.chartArea}>{children}</View>
    </View>
  );
}

export default function ProgressScreen() {
  const [stats, setStats] = useState<Stats>({
    memoryHistory: [], memoryBest: 0,
    focusHistory: [],  focusBest: 0,
    speedHistory: [],  speedBest: 0,
    trailHistoryA: [], trailBestA: null,
    trailHistoryB: [], trailBestB: null,
    checkinHistory: [], moodHistory: [], sleepHistory: [], streak: 0,
  });

  // Reload every time user switches to this tab
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  function buildExportText(): string | null {
    const { memoryHistory, focusHistory, speedHistory, checkinHistory, streak } = stats;
    if (memoryHistory.length === 0 && focusHistory.length === 0 && speedHistory.length === 0) {
      return null;
    }
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const checkinScores = checkinHistory.map(e => e.score);
    const checkinDates = checkinHistory.map(e => e.date);
    return [
      `NeuroVet — Data Export`,
      `Generated: ${date}`,
      ``,
      `--- EXERCISE SCORES ---`,
      `Memory Grid (working memory span):`,
      `  Sessions: ${memoryHistory.join(', ') || 'none'}`,
      `  Best: ${Math.max(...memoryHistory, 0)}`,
      ``,
      `Focus Filter (attention accuracy %):`,
      `  Sessions: ${focusHistory.map(v => v + '%').join(', ') || 'none'}`,
      `  Best: ${Math.max(...focusHistory, 0)}%`,
      ``,
      `Speed Match (correct answers in 60s):`,
      `  Sessions: ${speedHistory.join(', ') || 'none'}`,
      `  Best: ${Math.max(...speedHistory, 0)}`,
      ``,
      `--- WEEKLY CHECK-IN (CFQ score /40, lower = fewer symptoms) ---`,
      checkinScores.length > 0
        ? checkinDates.map((d, i) => `  ${d}: ${checkinScores[i]}/40`).join('\n')
        : '  No check-ins completed yet',
      ``,
      `--- STREAK ---`,
      `  Current streak: ${streak} days`,
      ``,
      `Note: No personal identifying information included.`,
      `Shared voluntarily for research purposes.`,
    ].join('\n');
  }

  async function sendViaText() {
    const text = buildExportText();
    if (!text) { Alert.alert('No data yet', 'Complete some exercises first.'); return; }
    const encoded = encodeURIComponent(text);
    const url = `sms:REDACTED&body=${encoded}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) { await Linking.openURL(url); }
    else { Alert.alert('Cannot open Messages', 'Please send manually.'); }
  }

  async function sendViaEmail() {
    const text = buildExportText();
    if (!text) { Alert.alert('No data yet', 'Complete some exercises first.'); return; }
    const subject = encodeURIComponent(`NeuroVet Data — ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(text);
    const url = `mailto:redacted@example.com?subject=${subject}&body=${body}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) { await Linking.openURL(url); }
    else { Alert.alert('Cannot open Mail', 'Please send manually.'); }
  }

  async function sendToCaregiver() {
    const caregiverEmail = await AsyncStorage.getItem('caregiverEmail');
    if (!caregiverEmail) {
      Alert.alert('No caregiver email', 'Go to Settings (⚙️ on Home screen) and add a caregiver email first.');
      return;
    }
    const text = buildExportText();
    if (!text) { Alert.alert('No data yet', 'Complete some exercises first.'); return; }

    const { memoryHistory, focusHistory, speedHistory, checkinHistory } = stats;
    const latestCheckin = checkinHistory[checkinHistory.length - 1];
    const zone = latestCheckin
      ? latestCheckin.score <= 13 ? 'Low' : latestCheckin.score <= 26 ? 'Moderate' : 'High'
      : null;

    const memoryTrend = memoryHistory.length >= 2
      ? memoryHistory[memoryHistory.length - 1] > memoryHistory[0] ? 'improving' : 'stable'
      : 'not enough data yet';

    const summary = [
      `NeuroVet Weekly Caregiver Summary`,
      `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      ``,
      `--- PLAIN-LANGUAGE SUMMARY ---`,
      memoryHistory.length > 0 ? `Memory: Best span this week = ${Math.max(...memoryHistory)} tiles (${memoryTrend})` : `Memory: No sessions yet`,
      focusHistory.length > 0 ? `Attention: Best accuracy = ${Math.max(...focusHistory)}%` : `Attention: No sessions yet`,
      speedHistory.length > 0 ? `Processing speed: Best = ${Math.max(...speedHistory)} correct in 60s` : `Processing speed: No sessions yet`,
      latestCheckin ? `Symptom check-in: ${latestCheckin.score}/40 (${zone} symptom level)` : `Symptom check-in: Not completed`,
      ``,
      `--- FULL DATA ---`,
      text,
      ``,
      `This summary was sent by the veteran from NeuroVet, a TBI cognitive rehabilitation app.`,
      `For questions, please speak directly with the veteran or their VA provider.`,
    ].join('\n');

    const subject = encodeURIComponent(`NeuroVet Weekly Summary — ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(summary);
    const url = `mailto:${caregiverEmail}?subject=${subject}&body=${body}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) { await Linking.openURL(url); }
    else { Alert.alert('Cannot open Mail', `Send manually to: ${caregiverEmail}`); }
  }

  async function loadAll() {
    const [mh, mb, fh, fb, sh, sbb, tah, tab, tbh, tbb, ch, moodH, sleepH, st] = await Promise.all([
      AsyncStorage.getItem('memoryGridHistory'),
      AsyncStorage.getItem('memoryGridBest'),
      AsyncStorage.getItem('focusHistory'),
      AsyncStorage.getItem('focusBestAccuracy'),
      AsyncStorage.getItem('speedMatchHistory'),
      AsyncStorage.getItem('speedMatchBest'),
      AsyncStorage.getItem('trailHistoryA'),
      AsyncStorage.getItem('trailBestA'),
      AsyncStorage.getItem('trailHistoryB'),
      AsyncStorage.getItem('trailBestB'),
      AsyncStorage.getItem('checkinHistory'),
      AsyncStorage.getItem('moodHistory'),
      AsyncStorage.getItem('sleepHistory'),
      AsyncStorage.getItem('streak'),
    ]);

    setStats({
      memoryHistory:   mh      ? JSON.parse(mh)      : [],
      memoryBest:      mb      ? Number(mb)           : 0,
      focusHistory:    fh      ? JSON.parse(fh)       : [],
      focusBest:       fb      ? Number(fb)           : 0,
      speedHistory:    sh      ? JSON.parse(sh)       : [],
      speedBest:       sbb     ? Number(sbb)          : 0,
      trailHistoryA:   tah     ? JSON.parse(tah)      : [],
      trailBestA:      tab     ? Number(tab)          : null,
      trailHistoryB:   tbh     ? JSON.parse(tbh)      : [],
      trailBestB:      tbb     ? Number(tbb)          : null,
      checkinHistory:  ch      ? JSON.parse(ch)       : [],
      moodHistory:     moodH   ? JSON.parse(moodH)    : [],
      sleepHistory:    sleepH  ? JSON.parse(sleepH)   : [],
      streak:          st      ? Number(st)           : 0,
    });
  }

  const checkinScores = stats.checkinHistory.map(e => e.score);
  const latestCheckin = stats.checkinHistory[stats.checkinHistory.length - 1];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Your improvement over time</Text>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{stats.streak}</Text>
          <Text style={styles.summaryLabel}>Day streak</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{stats.memoryHistory.length + stats.focusHistory.length + stats.speedHistory.length}</Text>
          <Text style={styles.summaryLabel}>Total sessions</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNum, latestCheckin ? { color: checkinColor(latestCheckin.score) } : {}]}>
            {latestCheckin ? latestCheckin.score : '–'}
          </Text>
          <Text style={styles.summaryLabel}>Last check-in</Text>
        </View>
      </View>

      {/* Memory Grid */}
      <SectionCard
        title="Memory Grid"
        tag="Working Memory · Corsi Block Test"
        color="#7eb8a4"
        best={stats.memoryBest}
        bestLabel="best span"
        trendStr={trend(stats.memoryHistory)}
      >
        <BarChart data={stats.memoryHistory} color="#7eb8a4" />
        <Text style={styles.chartNote}>Higher = longer sequence remembered</Text>
      </SectionCard>

      {/* Focus Filter */}
      <SectionCard
        title="Focus Filter"
        tag="Sustained Attention · CPT"
        color="#8aabcc"
        best={`${stats.focusBest}%`}
        bestLabel="best accuracy"
        trendStr={trend(stats.focusHistory)}
      >
        <BarChart data={stats.focusHistory} color="#8aabcc" maxOverride={100} label={v => `${v}%`} />
        <Text style={styles.chartNote}>Higher % = better attention accuracy</Text>
      </SectionCard>

      {/* Speed Match */}
      <SectionCard
        title="Speed Match"
        tag="Processing Speed · SDMT"
        color="#c8a87e"
        best={stats.speedBest}
        bestLabel="best score"
        trendStr={trend(stats.speedHistory)}
      >
        <BarChart data={stats.speedHistory} color="#c8a87e" />
        <Text style={styles.chartNote}>Higher = more correct in 60s</Text>
        <Text style={styles.benchmark}>Benchmark: healthy 55–70 · TBI 30–45</Text>
      </SectionCard>

      {/* Trail Making */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Trail Making</Text>
            <Text style={styles.cardTag}>Executive Function · TMT</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardBest, { color: '#b87eb8' }]}>
              {stats.trailBestA !== null ? `${stats.trailBestA}s` : '—'}
            </Text>
            <Text style={styles.cardBestLabel}>best A</Text>
          </View>
        </View>
        <Text style={[styles.trendText, { color: '#8899aa' }]}>
          {stats.trailHistoryA.length >= 2
            ? stats.trailHistoryA[stats.trailHistoryA.length - 1] < stats.trailHistoryA[0]
              ? '↑ Improving' : '→ Stable'
            : '–'}
        </Text>
        <View style={styles.chartArea}>
          {stats.trailHistoryA.length > 0 ? (
            <>
              <Text style={styles.chartNote}>Part A (seconds — lower is better)</Text>
              <BarChart data={stats.trailHistoryA} color="#b87eb8" />
            </>
          ) : (
            <Text style={styles.noData}>No Trail Making sessions yet</Text>
          )}
          {stats.trailHistoryB.length > 0 && (
            <>
              <Text style={[styles.chartNote, { marginTop: 16 }]}>Part B (seconds — lower is better)</Text>
              <BarChart data={stats.trailHistoryB} color="#d4a0d4" />
            </>
          )}
          <Text style={styles.benchmark}>Benchmark A: healthy 20–40s · TBI 50–90s</Text>
          <Text style={styles.benchmark}>Benchmark B: healthy 45–90s · TBI 120–180s</Text>
        </View>
      </View>

      {/* Check-In History */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Symptom Check-In</Text>
            <Text style={styles.cardTag}>CFQ · Weekly Self-Assessment</Text>
          </View>
          {latestCheckin && (
            <View style={styles.cardMeta}>
              <Text style={[styles.cardBest, { color: checkinColor(latestCheckin.score) }]}>
                {latestCheckin.score}
              </Text>
              <Text style={styles.cardBestLabel}>latest /40</Text>
            </View>
          )}
        </View>
        {checkinScores.length > 0 ? (
          <>
            <Text style={[styles.trendText, { color: trendColor(trend(checkinScores.map(s => -s))) }]}>
              {/* Invert trend: lower check-in score = improvement */}
              {checkinScores.length < 2 ? '–' :
                checkinScores[checkinScores.length - 1] < checkinScores[checkinScores.length - 2]
                  ? '↑ Improving' :
                checkinScores[checkinScores.length - 1] > checkinScores[checkinScores.length - 2]
                  ? '↓ Worsening' : '→ Stable'}
            </Text>
            <View style={styles.chartArea}>
              <View style={styles.bars}>
                {checkinScores.map((s, i) => {
                  const barH = Math.max((s / 40) * 80, 6);
                  return (
                    <View key={i} style={styles.barWrapper}>
                      <Text style={styles.barLabel}>{s}</Text>
                      <View style={[styles.bar, { height: barH, backgroundColor: checkinColor(s) }]} />
                    </View>
                  );
                })}
              </View>
              <Text style={styles.chartNote}>Lower score = fewer cognitive symptoms</Text>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#7eb8a4' }]} />
                  <Text style={styles.legendText}>Low (0–13)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#c8a87e' }]} />
                  <Text style={styles.legendText}>Moderate (14–26)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#cc6666' }]} />
                  <Text style={styles.legendText}>High (27–40)</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noData}>No check-ins yet — complete your first from the Home tab</Text>
        )}
      </View>

      {/* Mood History */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Mood</Text>
            <Text style={styles.cardTag}>Daily self-report · 1 (low) to 5 (great)</Text>
          </View>
        </View>
        {stats.moodHistory.length > 0 ? (
          <View style={styles.moodBars}>
            {stats.moodHistory.slice(-14).map((entry, i) => (
              <View key={i} style={styles.moodBarWrapper}>
                <Text style={styles.moodBarEmoji}>{MOOD_EMOJIS[entry.mood - 1]}</Text>
                <View style={[styles.moodBar, { height: entry.mood * 14, backgroundColor: MOOD_COLORS[entry.mood - 1] }]} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noData}>No mood logs yet — log your mood daily from the Home tab</Text>
        )}
      </View>

      {/* Sleep History */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Sleep</Text>
            <Text style={styles.cardTag}>Daily self-report · 1 (poor) to 5 (excellent)</Text>
          </View>
        </View>
        {stats.sleepHistory && stats.sleepHistory.length > 0 ? (
          <View style={styles.moodBars}>
            {stats.sleepHistory.slice(-14).map((entry: { date: string; sleep: number }, i: number) => {
              const sleepEmojis = ['😴','😟','😐','😊','🌟'];
              const sleepColors = ['#cc6666','#c8a87e','#8899aa','#7eb8a4','#5ec8a4'];
              return (
                <View key={i} style={styles.moodBarWrapper}>
                  <Text style={styles.moodBarEmoji}>{sleepEmojis[entry.sleep - 1]}</Text>
                  <View style={[styles.moodBar, { height: entry.sleep * 14, backgroundColor: sleepColors[entry.sleep - 1] }]} />
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noData}>No sleep logs yet — log daily from the Home tab</Text>
        )}
      </View>

      {/* Export buttons */}
      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportButton} onPress={sendViaText}>
          <Text style={styles.exportButtonText}>📱 Send via Text</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportButton, styles.exportButtonEmail]} onPress={sendViaEmail}>
          <Text style={styles.exportButtonText}>✉️ Send via Email</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.caregiverButton} onPress={sendToCaregiver}>
        <Text style={styles.caregiverButtonText}>👨‍👩‍👧 Send Weekly Summary to Caregiver</Text>
      </TouchableOpacity>
      <Text style={styles.exportNoteTop}>
        Sends scores only — no name, no location, no personal info.
      </Text>
      <View style={styles.exportNoteRow}>
        <Text style={styles.exportNote}>Set caregiver email via </Text>
        <Ionicons name="settings-outline" size={13} color="#445566" />
        <Text style={styles.exportNote}> on the Home screen.</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a1628' },
  container: { padding: 24, paddingTop: 64, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#7eb8a4', marginTop: 6, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryBox: { flex: 1, backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryNum: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  summaryLabel: { fontSize: 11, color: '#8899aa', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#1a2e4a', borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2a4a6a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  cardTag: { fontSize: 12, color: '#8899aa', marginTop: 3 },
  cardMeta: { alignItems: 'flex-end' },
  cardBest: { fontSize: 24, fontWeight: 'bold' },
  cardBestLabel: { fontSize: 11, color: '#8899aa', marginTop: 2 },
  trendText: { fontSize: 13, fontWeight: '600', marginBottom: 14 },
  chartArea: { marginTop: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100, flexWrap: 'wrap' },
  barWrapper: { alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 11, color: '#aabbcc' },
  bar: { width: 28, borderRadius: 4 },
  chartNote: { fontSize: 12, color: '#445566', marginTop: 10 },
  benchmark: { fontSize: 12, color: '#445566', marginTop: 4 },
  noData: { fontSize: 14, color: '#445566', textAlign: 'center', paddingVertical: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#8899aa' },
  exportRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  exportButton: {
    flex: 1, backgroundColor: '#1a2e4a', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#7eb8a4',
  },
  exportButtonEmail: { borderColor: '#8aabcc' },
  exportButtonText: { fontSize: 14, fontWeight: '600', color: '#7eb8a4' },
  exportNote: { fontSize: 12, color: '#445566', lineHeight: 18 },
  exportNoteTop: { fontSize: 12, color: '#445566', lineHeight: 18, textAlign: 'center', marginTop: 10 },
  exportNoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 8 },
  caregiverButton: {
    backgroundColor: '#1a2e4a', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#8aabcc',
  },
  caregiverButtonText: { fontSize: 15, fontWeight: '600', color: '#8aabcc' },
  moodBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 90, flexWrap: 'wrap', marginTop: 8 },
  moodBarWrapper: { alignItems: 'center', gap: 4 },
  moodBarEmoji: { fontSize: 14 },
  moodBar: { width: 18, borderRadius: 4 },
});
