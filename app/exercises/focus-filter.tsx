import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const SESSION_SECONDS = 60;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TARGET_CHANCE = 0.30;

const FOCUS_INTERVALS = { beginner: 2000, normal: 1500, advanced: 1000 };

function getAdaptiveInterval(history: number[]): number {
  if (history.length < 3) return FOCUS_INTERVALS.beginner;
  const avg = history.slice(-5).reduce((a, b) => a + b, 0) / Math.min(history.length, 5);
  if (avg > 80) return FOCUS_INTERVALS.advanced;
  if (avg >= 60) return FOCUS_INTERVALS.normal;
  return FOCUS_INTERVALS.beginner;
}

type Phase = 'tutorial' | 'idle' | 'playing' | 'result';

function pickTarget(): string {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function nextLetter(target: string): string {
  if (Math.random() < TARGET_CHANCE) return target;
  // Pick any letter except the target
  const others = LETTERS.filter(l => l !== target);
  return others[Math.floor(Math.random() * others.length)];
}

export default function FocusFilterScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [target, setTarget] = useState('X');
  const [currentLetter, setCurrentLetter] = useState('');
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [hits, setHits] = useState(0);         // tapped on target ✓
  const [misses, setMisses] = useState(0);      // target shown, not tapped
  const [falseAlarms, setFalseAlarms] = useState(0); // tapped on non-target
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  // Refs let us read current state inside setInterval callbacks
  const currentLetterRef = useRef('');
  const targetRef = useRef('X');
  const tappedRef = useRef(false); // was the current letter tapped?
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);

  const [tutorialStep, setTutorialStep] = useState(0);

  const TUTORIAL_STEPS = [
    { emoji: '🎯', title: 'Find your target', body: 'A target letter appears at the top of the screen. Remember it — that is the only letter you should tap for.' },
    { emoji: '⚡', title: 'Tap fast', body: 'Letters flash one at a time. Tap the big TAP button the moment you see your target letter.' },
    { emoji: '🚫', title: 'Ignore the rest', body: 'If it is not your target letter, do nothing. False taps count against your score. Stay focused for 60 seconds.' },
  ];

  useEffect(() => {
    AsyncStorage.getItem('focusBestAccuracy').then(v => v && setBestAccuracy(Number(v)));
    AsyncStorage.getItem('focusHistory').then(v => v && setHistory(JSON.parse(v)));
    AsyncStorage.getItem('tutorialFocusFilter').then(seen => {
      if (!seen) setPhase('tutorial');
    });
  }, []);

  async function finishTutorial() {
    await AsyncStorage.setItem('tutorialFocusFilter', 'done');
    setPhase('idle');
  }

  function startGame() {
    const t = pickTarget();
    setTarget(t);
    targetRef.current = t;
    setTimeLeft(SESSION_SECONDS);
    setHits(0); setMisses(0); setFalseAlarms(0);
    hitsRef.current = 0; missesRef.current = 0; falseAlarmsRef.current = 0;
    tappedRef.current = false;
    setCurrentLetter('');
    setPhase('playing');

    // Countdown timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerInterval); return 0; }
        return prev - 1;
      });
    }, 1000);

    const intervalMs = getAdaptiveInterval(history);

    // Letter flasher
    const letterInterval = setInterval(() => {
      // Score the previous letter before replacing it
      if (currentLetterRef.current === targetRef.current && !tappedRef.current) {
        missesRef.current += 1;
        setMisses(missesRef.current);
      }
      tappedRef.current = false;

      const letter = nextLetter(targetRef.current);
      currentLetterRef.current = letter;
      setCurrentLetter(letter);
    }, intervalMs);

    // End game after SESSION_SECONDS
    setTimeout(() => {
      clearInterval(timerInterval);
      clearInterval(letterInterval);
      setCurrentLetter('');
      currentLetterRef.current = '';
      finishGame();
    }, SESSION_SECONDS * 1000);
  }

  async function finishGame() {
    const h = hitsRef.current;
    const m = missesRef.current;
    const f = falseAlarmsRef.current;
    const totalTargets = h + m;
    const accuracy = totalTargets > 0 ? Math.round((h / totalTargets) * 100) : 0;

    setHits(h); setMisses(m); setFalseAlarms(f);
    setPhase('result');

    const newBest = accuracy > bestAccuracy ? accuracy : bestAccuracy;
    setBestAccuracy(newBest);
    await AsyncStorage.setItem('focusBestAccuracy', String(newBest));

    const newHistory = [...history, accuracy].slice(-7);
    setHistory(newHistory);
    await AsyncStorage.setItem('focusHistory', JSON.stringify(newHistory));
    await AsyncStorage.setItem('focusLastAccuracy', String(accuracy));
  }

  function handleTap() {
    if (phase !== 'playing' || !currentLetterRef.current) return;
    tappedRef.current = true;
    if (currentLetterRef.current === targetRef.current) {
      hitsRef.current += 1;
      setHits(hitsRef.current);
    } else {
      falseAlarmsRef.current += 1;
      setFalseAlarms(falseAlarmsRef.current);
    }
  }

  const totalTargets = hits + misses;
  const accuracy = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : 0;
  const isTarget = currentLetter === target;
  const currentStep = TUTORIAL_STEPS[tutorialStep];

  if (phase === 'tutorial') {
    return (
      <View style={styles.tutorialContainer}>
        <Text style={styles.tutorialEmoji}>{currentStep.emoji}</Text>
        <Text style={styles.tutorialTitle}>{currentStep.title}</Text>
        <Text style={styles.tutorialBody}>{currentStep.body}</Text>
        <View style={styles.tutorialDots}>
          {TUTORIAL_STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === tutorialStep && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={() => tutorialStep < TUTORIAL_STEPS.length - 1 ? setTutorialStep(tutorialStep + 1) : finishTutorial()}
        >
          <Text style={styles.tutorialButtonText}>
            {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next →' : "Let's Start!"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={finishTutorial} style={styles.tutorialSkip}>
          <Text style={styles.tutorialSkipText}>Skip tutorial</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Focus Filter</Text>
      <Text style={styles.subtitle}>Continuous Performance Test · Sustained Attention</Text>

      {/* Idle state */}
      {phase === 'idle' && (
        <View style={styles.centered}>
          <Text style={styles.instructions}>
            A target letter will be shown at the top.{'\n'}
            Tap the button ONLY when you see that letter.{'\n'}
            Ignore all other letters.{'\n\n'}
            Session: 60 seconds
          </Text>
          <Text style={styles.bestLabel}>Best accuracy: {bestAccuracy}%</Text>
          <Text style={styles.adaptiveLabel}>
            {'Speed: '}
            {getAdaptiveInterval(history) === FOCUS_INTERVALS.beginner && 'Slow (building up)'}
            {getAdaptiveInterval(history) === FOCUS_INTERVALS.normal && 'Normal'}
            {getAdaptiveInterval(history) === FOCUS_INTERVALS.advanced && 'Fast (advanced)'}
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Playing state */}
      {phase === 'playing' && (
        <View style={styles.centered}>
          {/* Target reminder */}
          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>Tap when you see:</Text>
            <Text style={styles.targetLetter}>{target}</Text>
          </View>

          {/* Timer */}
          <Text style={styles.timer}>{timeLeft}s</Text>

          {/* Flashing letter */}
          <View style={[styles.letterBox, isTarget && styles.letterBoxTarget]}>
            <Text style={[styles.letter, isTarget && styles.letterTarget]}>
              {currentLetter}
            </Text>
          </View>

          {/* Big tap button */}
          <TouchableOpacity style={styles.tapButton} onPress={handleTap} activeOpacity={0.6}>
            <Text style={styles.tapButtonText}>TAP</Text>
          </TouchableOpacity>

          {/* Live stats */}
          <View style={styles.liveStats}>
            <Text style={styles.liveStat}>✓ {hits}</Text>
            <Text style={styles.liveStat}>✗ {misses}</Text>
            <Text style={styles.liveStat}>! {falseAlarms}</Text>
          </View>
        </View>
      )}

      {/* Result state */}
      {phase === 'result' && (
        <View style={styles.centered}>
          <Text style={styles.resultTitle}>Session Complete</Text>

          <View style={styles.resultsCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Accuracy</Text>
              <Text style={styles.resultValue}>{accuracy}%</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Hits (correct taps)</Text>
              <Text style={styles.resultValue}>{hits}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Misses (target not tapped)</Text>
              <Text style={styles.resultValue}>{misses}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>False alarms (wrong taps)</Text>
              <Text style={styles.resultValue}>{falseAlarms}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Best accuracy</Text>
              <Text style={styles.resultValue}>{bestAccuracy}%</Text>
            </View>
          </View>

          {/* History bars */}
          {history.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>Last {history.length} sessions (accuracy %)</Text>
              <View style={styles.bars}>
                {history.map((s, i) => {
                  const barHeight = Math.max((s / 100) * 80, 8);
                  return (
                    <View key={i} style={styles.barWrapper}>
                      <Text style={styles.barLabel}>{s}</Text>
                      <View style={[styles.bar, { height: barHeight }]} />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628', padding: 24, paddingTop: 56 },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#7eb8a4', marginTop: 6, marginBottom: 24, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  instructions: { fontSize: 16, color: '#ccddcc', textAlign: 'center', lineHeight: 26, marginBottom: 20 },
  bestLabel: { fontSize: 14, color: '#7eb8a4', marginBottom: 28 },
  targetBox: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, minWidth: 140 },
  targetLabel: { fontSize: 13, color: '#8899aa' },
  targetLetter: { fontSize: 52, fontWeight: 'bold', color: '#7eb8a4', marginTop: 4 },
  timer: { fontSize: 22, color: '#ffffff', fontWeight: 'bold', marginBottom: 20 },
  letterBox: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center',
    marginBottom: 32, borderWidth: 2, borderColor: '#2a4a6a',
  },
  letterBoxTarget: { borderColor: '#7eb8a4', backgroundColor: '#1a3a2a' },
  letter: { fontSize: 64, fontWeight: 'bold', color: '#ffffff' },
  letterTarget: { color: '#7eb8a4' },
  tapButton: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#7eb8a4', alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  tapButtonText: { fontSize: 28, fontWeight: 'bold', color: '#0a1628' },
  liveStats: { flexDirection: 'row', gap: 24 },
  liveStat: { fontSize: 18, color: '#8899aa', fontWeight: '600' },
  resultTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  resultsCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a4a6a' },
  resultLabel: { fontSize: 14, color: '#8899aa' },
  resultValue: { fontSize: 16, fontWeight: 'bold', color: '#7eb8a4' },
  historyCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 24 },
  historyTitle: { fontSize: 13, color: '#8899aa', marginBottom: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  barWrapper: { alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 11, color: '#7eb8a4' },
  bar: { width: 28, backgroundColor: '#7eb8a4', borderRadius: 4 },
  startButton: { backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  startButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  adaptiveLabel: { fontSize: 13, color: '#7eb8a4', marginBottom: 20 },
  tutorialContainer: { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', padding: 36 },
  tutorialEmoji: { fontSize: 72, marginBottom: 24 },
  tutorialTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  tutorialBody: { fontSize: 17, color: '#aabbcc', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  tutorialDots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a4a6a' },
  dotActive: { backgroundColor: '#8aabcc' },
  tutorialButton: { backgroundColor: '#8aabcc', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, marginBottom: 16 },
  tutorialButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  tutorialSkip: { padding: 8 },
  tutorialSkipText: { fontSize: 14, color: '#445566' },
});
