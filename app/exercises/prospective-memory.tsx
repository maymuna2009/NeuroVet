import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Cue appears 4 times in 90s at random intervals among distractors
const SESSION_SECONDS = 90;
const STIMULUS_MS = 1200;
const ISI_MS = 400;
const CUE_SYMBOL = '🎯';
const CUE_COUNT = 4;
const DISTRACTOR_SYMBOLS = ['■', '●', '▲', '◆', '★', '✦', '◉', '▼'];

type Phase = 'tutorial' | 'idle' | 'playing' | 'result';

const TUTORIAL_STEPS = [
  { emoji: '🎯', title: 'Prospective Memory', body: `Remember the target: ${CUE_SYMBOL}\n\nSymbols will flash on screen. When you see ${CUE_SYMBOL}, tap the CUE button immediately.` },
  { emoji: '🔵', title: 'Ignore the others', body: 'All other symbols are distractors. Only tap when you see the target. This tests your ability to remember future intentions — a core TBI challenge.' },
  { emoji: '⏱️', title: '90 seconds', body: `The target appears ${CUE_COUNT} times. Each time you catch it scores a hit. Missing it scores a miss.` },
];

function buildStimSequence(): string[] {
  const total = Math.floor((SESSION_SECONDS * 1000) / (STIMULUS_MS + ISI_MS));
  const seq: string[] = Array.from({ length: total }, () =>
    DISTRACTOR_SYMBOLS[Math.floor(Math.random() * DISTRACTOR_SYMBOLS.length)]
  );
  // Insert cues at spaced random positions
  const positions = new Set<number>();
  const spacing = Math.floor(total / (CUE_COUNT + 1));
  for (let i = 0; i < CUE_COUNT; i++) {
    let pos: number;
    do { pos = spacing * (i + 1) + Math.floor(Math.random() * spacing * 0.6 - spacing * 0.3); }
    while (pos < 0 || pos >= total || positions.has(pos));
    positions.add(pos);
    seq[pos] = CUE_SYMBOL;
  }
  return seq;
}

export default function ProspectiveMemoryScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [stimulus, setStimulus] = useState('');
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const stimulusRef = useRef('');
  const tappedRef = useRef(false);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const seqRef = useRef<string[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem('tutorialProspectiveMemory').then(s => { if (!s) setPhase('tutorial'); });
    AsyncStorage.getItem('prospectiveBest').then(v => v && setBestScore(Number(v)));
    AsyncStorage.getItem('prospectiveHistory').then(v => v && setHistory(JSON.parse(v)));
  }, []);

  async function finishTutorial() {
    await AsyncStorage.setItem('tutorialProspectiveMemory', 'done');
    setPhase('idle');
  }

  function startGame() {
    hitsRef.current = 0; missesRef.current = 0; falseAlarmsRef.current = 0;
    setHits(0); setMisses(0); setFalseAlarms(0);
    setTimeLeft(SESSION_SECONDS);
    seqRef.current = buildStimSequence();
    indexRef.current = 0;
    tappedRef.current = false;
    setPhase('playing');

    const timerInterval = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { clearInterval(timerInterval); return 0; } return p - 1; });
    }, 1000);

    let stimInterval: ReturnType<typeof setInterval>;

    function showNext() {
      // Score previous
      const prev = stimulusRef.current;
      if (prev === CUE_SYMBOL) {
        if (tappedRef.current) { hitsRef.current += 1; setHits(hitsRef.current); }
        else { missesRef.current += 1; setMisses(missesRef.current); }
      }
      tappedRef.current = false;

      if (indexRef.current >= seqRef.current.length) return;
      const s = seqRef.current[indexRef.current++];
      stimulusRef.current = s;
      setStimulus(s);
    }

    showNext();
    stimInterval = setInterval(showNext, STIMULUS_MS + ISI_MS);

    setTimeout(() => {
      clearInterval(timerInterval);
      clearInterval(stimInterval);
      setStimulus('');
      stimulusRef.current = '';
      finishGame();
    }, SESSION_SECONDS * 1000);
  }

  async function finishGame() {
    const h = hitsRef.current;
    const m = missesRef.current;
    const fa = falseAlarmsRef.current;
    const score = Math.round((h / CUE_COUNT) * 100) - fa * 10;
    const finalScore = Math.max(0, score);

    setHits(h); setMisses(m); setFalseAlarms(fa);
    setPhase('result');

    const newBest = finalScore > bestScore ? finalScore : bestScore;
    setBestScore(newBest);
    await AsyncStorage.setItem('prospectiveBest', String(newBest));
    const newHistory = [...history, finalScore].slice(-7);
    setHistory(newHistory);
    await AsyncStorage.setItem('prospectiveHistory', JSON.stringify(newHistory));
    await AsyncStorage.setItem('prospectiveLast', String(finalScore));
  }

  function handleCueTap() {
    if (phase !== 'playing') return;
    if (stimulusRef.current === CUE_SYMBOL) {
      tappedRef.current = true;
    } else {
      falseAlarmsRef.current += 1;
      setFalseAlarms(falseAlarmsRef.current);
    }
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
        <Text style={styles.title}>Prospective Memory</Text>
        <Text style={styles.subtitle}>Future Intention Memory · Daily Planning</Text>
        <View style={styles.ruleCard}>
          <Text style={styles.cueReminder}>Remember this target:</Text>
          <Text style={styles.cueSymbol}>{CUE_SYMBOL}</Text>
          <Text style={styles.ruleNote}>Tap the CUE button when you see it appear.{'\n'}Ignore all other symbols. 90 seconds.</Text>
        </View>
        <Text style={styles.bestLabel}>Best score: {bestScore}%</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={startGame}>
          <Text style={styles.primaryButtonText}>Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'playing') {
    const isCue = stimulus === CUE_SYMBOL;
    return (
      <View style={styles.container}>
        <View style={styles.playHeader}>
          <Text style={styles.timer}>{timeLeft}s</Text>
          <Text style={styles.liveStats}>✓{hits} ✗{misses} ⚠️{falseAlarms}</Text>
        </View>
        <View style={styles.cueReminderRow}>
          <Text style={styles.cueReminderText}>Tap when you see: </Text>
          <Text style={styles.cueReminderSymbol}>{CUE_SYMBOL}</Text>
        </View>
        <View style={[styles.stimulusBox, isCue && styles.stimulusBoxCue]}>
          <Text style={styles.stimulusText}>{stimulus}</Text>
        </View>
        <TouchableOpacity style={[styles.cueButton, isCue && styles.cueButtonActive]} onPress={handleCueTap} activeOpacity={0.6}>
          <Text style={styles.cueButtonText}>CUE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = Math.max(0, Math.round((hits / CUE_COUNT) * 100) - falseAlarms * 10);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Session Complete</Text>
      <View style={styles.resultsCard}>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Score</Text><Text style={[styles.resultValue, { color: '#7eb8a4' }]}>{score}%</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Targets caught</Text><Text style={styles.resultValue}>{hits} / {CUE_COUNT}</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Missed targets</Text><Text style={styles.resultValue}>{misses}</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>False alarms (−10% each)</Text><Text style={styles.resultValue}>{falseAlarms}</Text></View>
        <View style={styles.resultRow}><Text style={styles.resultLabel}>Best score</Text><Text style={[styles.resultValue, { color: '#7eb8a4' }]}>{bestScore}%</Text></View>
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
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#7eb8a4', marginTop: 4, marginBottom: 24 },
  ruleCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center', gap: 8 },
  cueReminder: { fontSize: 15, color: '#aabbcc' },
  cueSymbol: { fontSize: 64 },
  ruleNote: { fontSize: 14, color: '#8899aa', textAlign: 'center', lineHeight: 20 },
  bestLabel: { fontSize: 14, color: '#7eb8a4', marginBottom: 28 },
  primaryButton: { backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  skipButton: { padding: 12, alignItems: 'center', marginTop: 8 },
  skipText: { fontSize: 14, color: '#445566' },
  playHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timer: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  liveStats: { fontSize: 15, color: '#8899aa' },
  cueReminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  cueReminderText: { fontSize: 15, color: '#8899aa' },
  cueReminderSymbol: { fontSize: 28 },
  stimulusBox: { width: 140, height: 140, borderRadius: 24, backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 32, borderWidth: 2, borderColor: '#2a4a6a' },
  stimulusBoxCue: { borderColor: '#7eb8a4', backgroundColor: '#1a3a2a' },
  stimulusText: { fontSize: 56 },
  cueButton: { width: 160, height: 80, borderRadius: 20, backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderWidth: 2, borderColor: '#2a4a6a' },
  cueButtonActive: { backgroundColor: '#7eb8a4', borderColor: '#7eb8a4' },
  cueButtonText: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  resultsCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 18, marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a4a6a' },
  resultLabel: { fontSize: 13, color: '#8899aa', flex: 1 },
  resultValue: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  historyCard: { backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center' },
  historyTitle: { fontSize: 13, color: '#8899aa', marginBottom: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 90 },
  barWrapper: { alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 10, color: '#7eb8a4' },
  bar: { width: 28, backgroundColor: '#7eb8a4', borderRadius: 4 },
  tutorialContainer: { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', padding: 36 },
  tutorialEmoji: { fontSize: 72, marginBottom: 24 },
  tutorialTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  tutorialBody: { fontSize: 17, color: '#aabbcc', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  tutorialDots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a4a6a' },
  dotActive: { backgroundColor: '#7eb8a4' },
});
