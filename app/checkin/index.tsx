import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Adapted from the Cognitive Failures Questionnaire (CFQ)
// Validated for TBI self-assessment in veteran populations
const QUESTIONS = [
  'How often did you forget where you put something (keys, phone, wallet)?',
  'How often did you forget why you walked into a room?',
  'How often did you have trouble concentrating on something (reading, TV, conversation)?',
  'How often did you lose track of what you were doing in the middle of a task?',
  'How often did you forget appointments or things you planned to do?',
  'How often did you have trouble finding the right word when speaking?',
  'How often did you feel mentally foggy or slow?',
  'How often did you get distracted and forget what you were supposed to be doing?',
  'How often did you have to re-read something because you lost track?',
  'How often did you make mistakes because you were not paying attention?',
];

const OPTIONS = [
  { label: 'Never', value: 0 },
  { label: 'Rarely', value: 1 },
  { label: 'Sometimes', value: 2 },
  { label: 'Often', value: 3 },
  { label: 'Always', value: 4 },
];

// Score zones (0–40 scale)
function getZone(score: number): { label: string; color: string; message: string } {
  if (score <= 13) return {
    label: 'Low',
    color: '#7eb8a4',
    message: 'Cognitive symptoms are minimal. Keep up your daily exercises.',
  };
  if (score <= 26) return {
    label: 'Moderate',
    color: '#c8a87e',
    message: 'Some cognitive symptoms present. Daily exercises recommended. Monitor for changes.',
  };
  return {
    label: 'High',
    color: '#cc6666',
    message: 'Significant cognitive symptoms. Consider speaking with your VA provider.',
  };
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function CheckInScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'questions' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [lastCheckinDate, setLastCheckinDate] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [history, setHistory] = useState<{ date: string; score: number }[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('checkinLastDate').then(v => setLastCheckinDate(v));
    AsyncStorage.getItem('checkinLastScore').then(v => v && setLastScore(Number(v)));
    AsyncStorage.getItem('checkinHistory').then(v => v && setHistory(JSON.parse(v)));
  }, []);

  function handleAnswer(value: number) {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishCheckin(newAnswers);
    }
  }

  async function finishCheckin(finalAnswers: number[]) {
    const total = finalAnswers.reduce((a, b) => a + b, 0);
    const today = todayString();

    const newEntry = { date: today, score: total };
    const newHistory = [...history, newEntry].slice(-8);

    setHistory(newHistory);
    setLastScore(total);
    setLastCheckinDate(today);
    setStep('result');

    await AsyncStorage.setItem('checkinLastDate', today);
    await AsyncStorage.setItem('checkinLastScore', String(total));
    await AsyncStorage.setItem('checkinHistory', JSON.stringify(newHistory));
  }

  function restart() {
    setAnswers([]);
    setCurrentQ(0);
    setStep('questions');
  }

  const totalScore = answers.reduce((a, b) => a + b, 0);
  const zone = getZone(totalScore);
  const progress = ((currentQ) / QUESTIONS.length) * 100;
  const daysSinceLastCheckin = lastCheckinDate
    ? Math.floor((Date.now() - new Date(lastCheckinDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Weekly Check-In</Text>
      <Text style={styles.subtitle}>Cognitive Failures Questionnaire · TBI Self-Assessment</Text>

      {/* INTRO */}
      {step === 'intro' && (
        <View style={styles.centered}>
          <Text style={styles.introText}>
            10 questions about cognitive symptoms you may have experienced this week.
            {'\n\n'}
            Answer honestly — this helps track whether your symptoms are improving over time.
            {'\n\n'}
            Takes about 2 minutes.
          </Text>

          {lastCheckinDate && (
            <View style={styles.lastCheckinCard}>
              <Text style={styles.lastCheckinLabel}>Last check-in</Text>
              <Text style={styles.lastCheckinDate}>
                {daysSinceLastCheckin === 0 ? 'Today' :
                 daysSinceLastCheckin === 1 ? 'Yesterday' :
                 `${daysSinceLastCheckin} days ago`}
              </Text>
              {lastScore !== null && (
                <Text style={[styles.lastCheckinScore, { color: getZone(lastScore).color }]}>
                  Score: {lastScore}/40 · {getZone(lastScore).label}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.startButton} onPress={() => { setAnswers([]); setCurrentQ(0); setStep('questions'); }}>
            <Text style={styles.startButtonText}>Begin Check-In</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            This is a self-monitoring tool, not a medical diagnosis.
            {'\n'}Always consult your VA provider for clinical guidance.
          </Text>
        </View>
      )}

      {/* QUESTIONS */}
      {step === 'questions' && (
        <View style={styles.centered}>
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>Question {currentQ + 1} of {QUESTIONS.length}</Text>

          {/* Question card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{QUESTIONS[currentQ]}</Text>
          </View>

          {/* Answer options */}
          <View style={styles.optionsContainer}>
            {OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.optionButton}
                onPress={() => handleAnswer(opt.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionDot} />
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* RESULT */}
      {step === 'result' && (
        <View style={styles.centered}>
          <Text style={styles.resultTitle}>Check-In Complete</Text>

          {/* Score display */}
          <View style={[styles.scoreCircle, { borderColor: zone.color }]}>
            <Text style={[styles.scoreNumber, { color: zone.color }]}>{totalScore}</Text>
            <Text style={styles.scoreOutOf}>out of 40</Text>
          </View>

          <View style={[styles.zoneBadge, { backgroundColor: zone.color + '22', borderColor: zone.color }]}>
            <Text style={[styles.zoneLabel, { color: zone.color }]}>{zone.label} Symptom Level</Text>
          </View>

          <Text style={styles.zoneMessage}>{zone.message}</Text>

          {/* Score history */}
          {history.length > 1 && (
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>Score history</Text>
              <View style={styles.bars}>
                {history.map((entry, i) => {
                  const barHeight = Math.max((entry.score / 40) * 80, 6);
                  const entryZone = getZone(entry.score);
                  return (
                    <View key={i} style={styles.barWrapper}>
                      <Text style={styles.barLabel}>{entry.score}</Text>
                      <View style={[styles.bar, { height: barHeight, backgroundColor: entryZone.color }]} />
                    </View>
                  );
                })}
              </View>
              <Text style={styles.historyNote}>Lower score = fewer symptoms</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retakeButton} onPress={restart}>
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            This tool is for self-monitoring only.{'\n'}
            Not a substitute for professional medical advice.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a1628' },
  container: { padding: 24, paddingTop: 56, paddingBottom: 48, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#7eb8a4', marginTop: 6, marginBottom: 28, textAlign: 'center' },
  centered: { width: '100%', alignItems: 'center' },
  introText: { fontSize: 16, color: '#aabbcc', textAlign: 'center', lineHeight: 26, marginBottom: 24 },
  lastCheckinCard: {
    backgroundColor: '#1a2e4a', borderRadius: 14, padding: 18,
    width: '100%', marginBottom: 28, alignItems: 'center',
  },
  lastCheckinLabel: { fontSize: 12, color: '#8899aa' },
  lastCheckinDate: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  lastCheckinScore: { fontSize: 14, marginTop: 6, fontWeight: '600' },
  startButton: { backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, marginBottom: 24 },
  startButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  disclaimer: { fontSize: 12, color: '#445566', textAlign: 'center', lineHeight: 18, marginTop: 8 },
  progressBarBg: { width: '100%', height: 6, backgroundColor: '#1a2e4a', borderRadius: 3, marginBottom: 8 },
  progressBarFill: { height: 6, backgroundColor: '#7eb8a4', borderRadius: 3 },
  progressLabel: { fontSize: 13, color: '#8899aa', marginBottom: 24 },
  questionCard: {
    backgroundColor: '#1a2e4a', borderRadius: 18, padding: 24,
    width: '100%', marginBottom: 28, minHeight: 100, justifyContent: 'center',
  },
  questionText: { fontSize: 17, color: '#ffffff', lineHeight: 26, textAlign: 'center' },
  optionsContainer: { width: '100%', gap: 10 },
  optionButton: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1a2e4a', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#2a4a6a',
  },
  optionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a4a6a', borderWidth: 1, borderColor: '#7eb8a4' },
  optionText: { fontSize: 16, color: '#ccddcc', fontWeight: '500' },
  resultTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 28 },
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  scoreNumber: { fontSize: 48, fontWeight: 'bold' },
  scoreOutOf: { fontSize: 13, color: '#8899aa', marginTop: 2 },
  zoneBadge: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginBottom: 16,
  },
  zoneLabel: { fontSize: 15, fontWeight: 'bold' },
  zoneMessage: { fontSize: 15, color: '#aabbcc', textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 8 },
  historyCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 24 },
  historyTitle: { fontSize: 13, color: '#8899aa', marginBottom: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  barWrapper: { alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 11, color: '#aabbcc' },
  bar: { width: 28, borderRadius: 4 },
  historyNote: { fontSize: 11, color: '#445566', marginTop: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  doneButton: { backgroundColor: '#7eb8a4', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14 },
  doneButtonText: { fontSize: 16, fontWeight: 'bold', color: '#0a1628' },
  retakeButton: { backgroundColor: '#1a2e4a', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14, borderWidth: 1, borderColor: '#2a4a6a' },
  retakeButtonText: { fontSize: 16, color: '#8899aa' },
});
