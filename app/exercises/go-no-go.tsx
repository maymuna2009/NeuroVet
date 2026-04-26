import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// 80% Go (tap), 20% No-Go (don't tap)
const SESSION_SECONDS = 60;
const STIMULUS_MS = 800;
const ISI_MS = 600; // inter-stimulus interval
const NOGO_CHANCE = 0.20;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => l !== 'X');
const NOGO_STIMULUS = 'X';

type Phase = 'tutorial' | 'idle' | 'playing' | 'result';

const TUTORIAL_STEPS = [
  { emoji: '✋', title: 'Go / No-Go', body: 'Letters appear one at a time. TAP for every letter — EXCEPT the letter X.' },
  { emoji: '🚫', title: 'Stop for X', body: 'When you see X, do NOT tap. This tests your ability to suppress automatic responses — a key skill affected by TBI.' },
  { emoji: '⚡', title: 'React fast', body: '60-second session. Wrong taps on X and missed non-X letters both count against your score.' },
];

export default function GoNoGoScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [stimulus, setStimulus] = useState('');
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [correctInhibitions, setCorrectInhibitions] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'go' | 'nogo' | 'error' | null>(null);

  const stimulusRef = useRef('');
  const tappedRef = useRef(false);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const correctInhibRef = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem('tutorialGoNoGo').then(s => { if (!s) setPhase('tutorial'); });
    AsyncStorage.getItem('goNoGoBest').then(v => v && setBestScore(Number(v)));
    AsyncStorage.getItem('goNoGoHistory').then(v => v && setHistory(JSON.parse(v)));
  }, []);

  async function finishTutorial() {
    await AsyncStorage.setItem('tutorialGoNoGo', 'done');
    setPhase('idle');
  }

  function nextStimulus(): string {
    if (Math.random() < NOGO_CHANCE) return NOGO_STIMULUS;
    return LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }

  function startGame() {
    hitsRef.current = 0; missesRef.current = 0;
    falseAlarmsRef.current = 0; correctInhibRef.current = 0;
    setHits(0); setMisses(0); setFalseAlarms(0); setCorrectInhibitions(0);
    setTimeLeft(SESSION_SECONDS);
    setFeedback(null);
    setPhase('playing');

    const timerInterval = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { clearInterval(timerInterval); return 0; } return p - 1; });
    }, 1000);

    let stimulusInterval: ReturnType<typeof setInterval>;

    function showNext() {
      // Score previous stimulus
      const prev = stimulusRef.current;
      if (prev) {
        if (prev === NOGO_STIMULUS) {
          if (!tappedRef.current) { correctInhibRef.current += 1; setCorrectInhibitions(correctInhibRef.current); }
          else { falseAlarmsRef.current += 1; setFalseAlarms(falseAlarmsRef.current); }
        } else {
          if (tappedRef.current) { hitsRef.current += 1; setHits(hitsRef.current); }
          else { missesRef.current += 1; setMisses(missesRef.current); }
        }
      }
      tappedRef.current = false;
      const s = nextStimulus();
      stimulusRef.current = s;
      setStimulus(s);
      setFeedback(s === NOGO_STIMULUS ? 'nogo' : 'go');
    }

    showNext();
    stimulusInterval = setInterval(showNext, STIMULUS_MS + ISI_MS);

    setTimeout(() => {
      clearInterval(timerInterval);
      clearInterval(stimulusInterval);
      setStimulus('');
      stimulusRef.current = '';
      finishGame();
    }, SESSION_SECONDS * 1000);
  }

  async function finishGame() {
    const h = hitsRef.current;
    const fa = falseAlarmsRef.current;
    const ci = correctInhibRef.current;
    const totalGo = h + missesRef.current;
    const accuracy = totalGo > 0 ? Math.round((h / totalGo) * 100) : 0;
    const inhibScore = Math.round((ci / Math.max(ci + fa, 1)) * 100);
    const score = Math.round((accuracy + inhibScore) / 2);

    setHits(h); setFalseAlarms(fa); setCorrectInhibitions(ci);
    setPhase('result');

    const newBest = score > bestScore ? score : bestScore;
    setBestScore(newBest);
    await AsyncStorage.setItem('goNoGoBest', String(newBest));
    const newHistory = [...history, score].slice(-7);
    setHistory(newHistory);
    await AsyncStorage.setItem('goNoGoHistory', JSON.stringify(newHistory));
    await AsyncStorage.setItem('goNoGoLast', String(score));
  }

  function handleTap() {
    if (phase !== 'playing' || !stimulusRef.current) return;
    tappedRef.current = true;
  }

  const currentStep = TUTORIAL_STEPS[tutorialStep];

  if (phase === 'tutorial') {
    return (
      <View style={styles.tutorialContainer}>
        <Text style={styles.tutorialEmoji}>{currentStep.emoji}</Text>
        <Text style={styles.tutorialTitle}>{currentStep.title}</Text>
        <Text style={styles.tutorialBody}>{currentStep.body}</Text>
        <View style={styles.tutorialDots}>
          {TUTORIAL_STEPS.map((_, i) => <View key={i} style={[styles.dot, i === tutorialStep && styles.dotActive]} />)}
        </View>
        <TouchableOpacity style={styles.primaryButton}
          onPress={() => tutorialStep < TUTORIAL_STEPS.length - 1 ? setTutorialStep(tutorialStep + 1) : finishTutorial()}>
          <Text style={styles.primaryButtonText}>{tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next →' : "Let's Start!"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={finishTutorial} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip tutorial</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'idle') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Go / No-Go</Text>
        <Text style={styles.subtitle}>Inhibitory Control · Impulse Suppression</Text>
        <View style={styles.ruleCard}>
          <Text style={styles.ruleRow}>✅ TAP for any letter</Text>
          <Text style={styles.ruleRow}>🚫 DO NOT tap for X</Text>
          <Text style={styles.ruleNote}>60 seconds · score = combined accuracy</Text>
        </View>
        <Text style={styles.bestLabel}>Best score: {bestScore}%</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={startGame}>
          <Text style={styles.primaryButtonText}>Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'playing') {
    const isNogo = stimulus === NOGO_STIMULUS;
    return (
      <View style={styles.container}>
        <View style={styles.playHeader}>
          <Text style={styles.timer}>{timeLeft}s</Text>
          <Text style={styles.liveStats}>✓{hits} ✗{misses} ⛔{falseAlarms}</Text>
        </View>
        <View style={styles.ruleReminder}>
          <Text style={styles.ruleReminderText}>TAP all letters  ·  NOT X</Text>
        </View>
        <View style={[styles.stimulusBox, isNogo && styles.stimulusBoxNogo]}>
          <Text style={[styles.stimulusText, isNogo && styles.stimulusTextNogo]}>{stimulus}</Text>
        </View>
        <TouchableOpacity style={styles.tapButton} onPress={handleTap} activeOpacity={0.6}>
          <Text style={styles.tapButtonText}>TAP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalGo = hits + misses;
  const goAccuracy = totalGo > 0 ? Math.round((hits / totalGo) * 100) : 0;
  const totalNogo = correctInhibitions + falseAlarms;
  const inhibAccuracy = totalNogo > 0 ? Math.round((correctInhibitions / totalNogo) * 100) : 0;
  const overall = Math.round((goAccuracy + inhibAccuracy) / 2);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Session Complete</Text>
      <View style={styles.resultsCard}>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Overall score</Text><Text style={[styles.resultValue, { color: '#a87eb8' }]}>{overall}%</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Go accuracy (tapped correctly)</Text><Text style={styles.resultValue}>{goAccuracy}%</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Inhibition accuracy (stopped for X)</Text><Text style={styles.resultValue}>{inhibAccuracy}%</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>False alarms (tapped X)</Text><Text style={styles.resultValue}>{falseAlarms}</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Best score</Text><Text style={[styles.resultValue, { color: '#a87eb8' }]}>{bestScore}%</Text></View>
      </View>
      {history.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Last {history.length} sessions</Text>
          <View style={styles.bars}>
            {history.map((s, i) => (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barLabel}>{s}%</Text>
                <View style={[styles.bar, { height: Math.max((s / 100) * 80, 6) }]} />
              </View>
            ))}
          </View>
        </View>
      )}
      <TouchableOpacity style={styles.primaryButton} onPress={startGame}>
        <Text style={styles.primaryButtonText}>Play Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628', padding: 24, paddingTop: 56 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 16, color: '#a87eb8' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#a87eb8', marginTop: 4, marginBottom: 24 },
  ruleCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, marginBottom: 24, gap: 10 },
  ruleRow: { fontSize: 18, color: '#ffffff', fontWeight: '600' },
  ruleNote: { fontSize: 13, color: '#8899aa', marginTop: 4 },
  bestLabel: { fontSize: 14, color: '#a87eb8', marginBottom: 28 },
  primaryButton: { backgroundColor: '#a87eb8', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  skipButton: { padding: 12, alignItems: 'center', marginTop: 8 },
  skipText: { fontSize: 14, color: '#445566' },
  playHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timer: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  liveStats: { fontSize: 15, color: '#8899aa' },
  ruleReminder: { backgroundColor: '#1a2e4a', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 24 },
  ruleReminderText: { fontSize: 14, color: '#8899aa' },
  stimulusBox: { width: 140, height: 140, borderRadius: 24, backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 32, borderWidth: 2, borderColor: '#2a4a6a' },
  stimulusBoxNogo: { borderColor: '#cc6666', backgroundColor: '#3a1a1a' },
  stimulusText: { fontSize: 72, fontWeight: 'bold', color: '#ffffff' },
  stimulusTextNogo: { color: '#cc6666' },
  tapButton: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#a87eb8', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  tapButtonText: { fontSize: 28, fontWeight: 'bold', color: '#0a1628' },
  resultsCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 18, marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a4a6a' },
  resultLabel: { fontSize: 13, color: '#8899aa', flex: 1 },
  resultValue: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  historyCard: { backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center' },
  historyTitle: { fontSize: 13, color: '#8899aa', marginBottom: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 90 },
  barWrapper: { alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 10, color: '#a87eb8' },
  bar: { width: 28, backgroundColor: '#a87eb8', borderRadius: 4 },
  tutorialContainer: { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', padding: 36 },
  tutorialEmoji: { fontSize: 72, marginBottom: 24 },
  tutorialTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  tutorialBody: { fontSize: 17, color: '#aabbcc', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  tutorialDots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a4a6a' },
  dotActive: { backgroundColor: '#a87eb8' },
});
