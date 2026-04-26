import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const PLAY_WIDTH = width - 32;
const PLAY_HEIGHT = height * 0.52;
const ERROR_PENALTY = 5; // seconds per error

type Phase = 'tutorial' | 'idle' | 'playing' | 'result';
type Part = 'A' | 'B';

// Part A: numbers 1–13 (13 targets fits on screen comfortably)
const PART_A_TARGETS = Array.from({ length: 13 }, (_, i) => String(i + 1));

// Part B: alternating 1,A,2,B,3,C... (13 items)
const PART_B_TARGETS = ['1','A','2','B','3','C','4','D','5','E','6','F','7'];

const TUTORIAL_STEPS = [
  { emoji: '🔢', title: 'Trail Making — Part A', body: 'Numbers 1–13 are scattered on screen. Tap them in order as fast as possible: 1 → 2 → 3 ...' },
  { emoji: '🔡', title: 'Trail Making — Part B', body: 'Alternate between numbers and letters: 1 → A → 2 → B → 3 → C ... Much harder — this tests cognitive flexibility.' },
  { emoji: '⏱️', title: 'Speed matters', body: 'Your score is the time to complete. Wrong taps add a 5-second penalty. Try to improve your time each session.' },
];

function generatePositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const minDist = 68;
  const btnRadius = 26;
  const margin = btnRadius + 4;

  for (let i = 0; i < count; i++) {
    let pos: { x: number; y: number };
    let attempts = 0;
    do {
      pos = {
        x: margin + Math.random() * (PLAY_WIDTH - margin * 2),
        y: margin + Math.random() * (PLAY_HEIGHT - margin * 2),
      };
      attempts++;
    } while (
      attempts < 100 &&
      positions.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < minDist)
    );
    positions.push(pos);
  }
  return positions;
}

export default function TrailMakingScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [part, setPart] = useState<Part>('A');
  const [targets, setTargets] = useState<string[]>([]);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastTap, setLastTap] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [bestA, setBestA] = useState<number | null>(null);
  const [bestB, setBestB] = useState<number | null>(null);
  const [resultTime, setResultTime] = useState(0);
  const [resultErrors, setResultErrors] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const errorsRef = useRef<number>(0);
  const partRef = useRef<Part>('A');
  const bestARef = useRef<number | null>(null);
  const bestBRef = useRef<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('tutorialTrailMaking').then(seen => {
      if (!seen) setPhase('tutorial');
    });
    AsyncStorage.getItem('trailBestA').then(v => { if (v) { setBestA(Number(v)); bestARef.current = Number(v); } });
    AsyncStorage.getItem('trailBestB').then(v => { if (v) { setBestB(Number(v)); bestBRef.current = Number(v); } });
  }, []);

  async function finishTutorial() {
    await AsyncStorage.setItem('tutorialTrailMaking', 'done');
    setPhase('idle');
  }

  function startGame(selectedPart: Part) {
    setPart(selectedPart);
    partRef.current = selectedPart;
    errorsRef.current = 0;
    const t = selectedPart === 'A' ? PART_A_TARGETS : PART_B_TARGETS;
    setTargets(t);
    setPositions(generatePositions(t.length));
    setNextIndex(0);
    setErrors(0);
    setElapsed(0);
    setLastTap(null);
    setPhase('playing');
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);
  }

  function handleTap(label: string, index: number) {
    if (phase !== 'playing') return;
    if (index === nextIndex) {
      setLastTap(label);
      setLastCorrect(true);
      if (nextIndex === targets.length - 1) {
        finishGame();
      } else {
        setNextIndex(nextIndex + 1);
      }
    } else {
      setLastTap(label);
      setLastCorrect(false);
      errorsRef.current += 1;
      setErrors(errorsRef.current);
    }
  }

  async function finishGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const finalErrors = errorsRef.current;
    const penalizedTime = totalTime + finalErrors * ERROR_PENALTY;
    const currentPart = partRef.current;
    const currentBest = currentPart === 'A' ? bestARef.current : bestBRef.current;

    setResultTime(penalizedTime);
    setResultErrors(finalErrors);
    setPhase('result');

    const key = currentPart === 'A' ? 'trailBestA' : 'trailBestB';
    if (currentBest === null || penalizedTime < currentBest) {
      if (currentPart === 'A') { setBestA(penalizedTime); bestARef.current = penalizedTime; }
      else { setBestB(penalizedTime); bestBRef.current = penalizedTime; }
      await AsyncStorage.setItem(key, String(penalizedTime));
    }
    await AsyncStorage.setItem(`trailLast${currentPart}`, String(penalizedTime));

    const histKey = `trailHistory${currentPart}`;
    const existing = await AsyncStorage.getItem(histKey);
    const hist = existing ? JSON.parse(existing) : [];
    await AsyncStorage.setItem(histKey, JSON.stringify([...hist, penalizedTime].slice(-7)));
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const currentStep = TUTORIAL_STEPS[tutorialStep];

  // Tutorial
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

  // Idle
  if (phase === 'idle') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Trail Making</Text>
        <Text style={styles.subtitle}>Executive Function · Cognitive Flexibility</Text>

        <View style={styles.partCards}>
          <TouchableOpacity style={[styles.partCard, { borderColor: '#7eb8a4' }]} onPress={() => startGame('A')}>
            <Text style={styles.partLabel}>Part A</Text>
            <Text style={styles.partDesc}>Numbers only{'\n'}1 → 2 → 3 ...</Text>
            {bestA !== null && <Text style={[styles.partBest, { color: '#7eb8a4' }]}>Best: {bestA}s</Text>}
            <Text style={[styles.partStart, { color: '#7eb8a4' }]}>Start →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.partCard, { borderColor: '#8aabcc' }]} onPress={() => startGame('B')}>
            <Text style={styles.partLabel}>Part B</Text>
            <Text style={styles.partDesc}>Numbers + letters{'\n'}1 → A → 2 → B ...</Text>
            {bestB !== null && <Text style={[styles.partBest, { color: '#8aabcc' }]}>Best: {bestB}s</Text>}
            <Text style={[styles.partStart, { color: '#8aabcc' }]}>Start →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Lower time = better executive function.{'\n'}
            Each wrong tap adds 5 seconds.
          </Text>
          <Text style={styles.infoBenchmark}>
            Clinical benchmarks:{'\n'}
            Part A healthy adult: 20–40s · TBI: 50–90s{'\n'}
            Part B healthy adult: 45–90s · TBI: 120–180s
          </Text>
        </View>
      </View>
    );
  }

  // Playing
  if (phase === 'playing') {
    const nextLabel = targets[nextIndex];
    const color = part === 'A' ? '#7eb8a4' : '#8aabcc';

    return (
      <View style={styles.container}>
        <View style={styles.playHeader}>
          <Text style={styles.playPart}>Part {part}</Text>
          <Text style={styles.playTimer}>{elapsed}s</Text>
          <Text style={styles.playErrors}>✗ {errors}</Text>
        </View>

        <View style={styles.playTarget}>
          <Text style={styles.playTargetLabel}>Next:</Text>
          <Text style={[styles.playTargetValue, { color }]}>{nextLabel}</Text>
        </View>

        {lastTap && (
          <Text style={[styles.playFeedback, { color: lastCorrect ? '#7eb8a4' : '#cc6666' }]}>
            {lastCorrect ? `✓ ${lastTap}` : `✗ Not ${nextLabel}`}
          </Text>
        )}

        {/* Play field */}
        <View style={styles.playField}>
          {targets.map((label, i) => {
            const done = i < nextIndex;
            const isNext = i === nextIndex;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.node,
                  { left: positions[i]?.x - 26, top: positions[i]?.y - 26 },
                  done && styles.nodeDone,
                  isNext && { borderColor: color, borderWidth: 2 },
                ]}
                onPress={() => handleTap(label, i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.nodeLabel, done && styles.nodeLabelDone, isNext && { color }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // Result
  const color = part === 'A' ? '#7eb8a4' : '#8aabcc';
  const best = part === 'A' ? bestA : bestB;
  const isNewBest = best !== null && resultTime <= best;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Part {part} Complete</Text>

      {isNewBest && <Text style={styles.newBest}>⭐ New best time!</Text>}

      <View style={styles.resultsCard}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Time (with penalties)</Text>
          <Text style={[styles.resultValue, { color }]}>{resultTime}s</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Raw time</Text>
          <Text style={styles.resultValue}>{resultTime - resultErrors * ERROR_PENALTY}s</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Errors (×5s each)</Text>
          <Text style={styles.resultValue}>{resultErrors}</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Best time</Text>
          <Text style={[styles.resultValue, { color }]}>{best}s</Text>
        </View>
      </View>

      <Text style={styles.benchmark}>
        {part === 'A'
          ? 'Healthy adult avg: 20–40s · TBI avg: 50–90s'
          : 'Healthy adult avg: 45–90s · TBI avg: 120–180s'}
      </Text>

      <View style={styles.resultButtons}>
        <TouchableOpacity style={[styles.retryButton, { borderColor: color }]} onPress={() => startGame(part)}>
          <Text style={[styles.retryButtonText, { color }]}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.switchButton, { backgroundColor: color }]}
          onPress={() => startGame(part === 'A' ? 'B' : 'A')}>
          <Text style={styles.switchButtonText}>Try Part {part === 'A' ? 'B' : 'A'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628', padding: 20, paddingTop: 56 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#7eb8a4', marginTop: 4, marginBottom: 24 },

  partCards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  partCard: { flex: 1, backgroundColor: '#1a2e4a', borderRadius: 16, padding: 18, borderWidth: 1, gap: 8 },
  partLabel: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  partDesc: { fontSize: 13, color: '#8899aa', lineHeight: 20 },
  partBest: { fontSize: 13, fontWeight: '600' },
  partStart: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },

  infoBox: { backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16, gap: 8 },
  infoText: { fontSize: 13, color: '#aabbcc', lineHeight: 20 },
  infoBenchmark: { fontSize: 12, color: '#445566', lineHeight: 18 },

  playHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  playPart: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  playTimer: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  playErrors: { fontSize: 16, color: '#cc6666', fontWeight: '600' },
  playTarget: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  playTargetLabel: { fontSize: 14, color: '#8899aa' },
  playTargetValue: { fontSize: 32, fontWeight: 'bold' },
  playFeedback: { fontSize: 13, fontWeight: '600', marginBottom: 8, height: 20 },

  playField: { width: PLAY_WIDTH, height: PLAY_HEIGHT, backgroundColor: '#111e30', borderRadius: 16, position: 'relative', overflow: 'hidden' },
  node: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a4a6a' },
  nodeDone: { backgroundColor: '#0d1f35', borderColor: '#1a2e4a' },
  nodeLabel: { fontSize: 17, fontWeight: 'bold', color: '#ffffff' },
  nodeLabelDone: { color: '#2a4a6a' },

  newBest: { fontSize: 16, color: '#c8a87e', fontWeight: 'bold', marginBottom: 12 },
  resultsCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#2a4a6a' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a4a6a' },
  resultLabel: { fontSize: 14, color: '#8899aa' },
  resultValue: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  benchmark: { fontSize: 12, color: '#445566', textAlign: 'center', marginBottom: 24 },
  resultButtons: { flexDirection: 'row', gap: 12 },
  retryButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  retryButtonText: { fontSize: 15, fontWeight: '600' },
  switchButton: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  switchButtonText: { fontSize: 15, fontWeight: 'bold', color: '#0a1628' },

  tutorialContainer: { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', padding: 36 },
  tutorialEmoji: { fontSize: 72, marginBottom: 24 },
  tutorialTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  tutorialBody: { fontSize: 17, color: '#aabbcc', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  tutorialDots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a4a6a' },
  dotActive: { backgroundColor: '#7eb8a4' },
  tutorialButton: { backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, marginBottom: 16 },
  tutorialButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  tutorialSkip: { padding: 8 },
  tutorialSkipText: { fontSize: 14, color: '#445566' },
});
