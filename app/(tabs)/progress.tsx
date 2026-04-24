import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

type CheckinEntry = { date: string; score: number };

type Stats = {
  memoryHistory: number[];
  memoryBest: number;
  focusHistory: number[];
  focusBest: number;
  speedHistory: number[];
  speedBest: number;
  checkinHistory: CheckinEntry[];
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
    checkinHistory: [], streak: 0,
  });

  // Reload every time user switches to this tab
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  async function loadAll() {
    const [mh, mb, fh, fb, sh, sbb, ch, st] = await Promise.all([
      AsyncStorage.getItem('memoryGridHistory'),
      AsyncStorage.getItem('memoryGridBest'),
      AsyncStorage.getItem('focusHistory'),
      AsyncStorage.getItem('focusBestAccuracy'),
      AsyncStorage.getItem('speedMatchHistory'),
      AsyncStorage.getItem('speedMatchBest'),
      AsyncStorage.getItem('checkinHistory'),
      AsyncStorage.getItem('streak'),
    ]);

    setStats({
      memoryHistory:   mh  ? JSON.parse(mh)  : [],
      memoryBest:      mb  ? Number(mb)       : 0,
      focusHistory:    fh  ? JSON.parse(fh)   : [],
      focusBest:       fb  ? Number(fb)       : 0,
      speedHistory:    sh  ? JSON.parse(sh)   : [],
      speedBest:       sbb ? Number(sbb)      : 0,
      checkinHistory:  ch  ? JSON.parse(ch)   : [],
      streak:          st  ? Number(st)       : 0,
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
});
