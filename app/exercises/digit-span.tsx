import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const SHOW_MS = 900;
const GAP_MS = 300;

type Phase = 'tutorial' | 'idle' | 'showing' | 'input' | 'feedback' | 'result';
type Mode = 'forward' | 'backward';

const TUTORIAL_STEPS = [
  { emoji: '🔢', title: 'Digit Span', body: 'Digits appear one at a time on screen. Remember them in order.' },
  { emoji: '↩️', title: 'Repeat them back', body: 'After the sequence ends, tap the digits in the same order. In Backward mode, tap them in reverse.' },
  { emoji: '📈', title: 'Gets longer', body: 'Each correct trial adds one more digit. Your span score is the longest sequence you get right.' },
];

function randomDigits(length: number): number[] {
  const digits: number[] = [];
  for (let i = 0; i < length; i++) {
    let d: number;
    do { d = Math.floor(Math.random() * 10); }
    while (digits.length > 0 && d === digits[digits.length - 1]);
    digits.push(d);
  }
  return digits;
}

export default function DigitSpanScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [mode, setMode] = useState<Mode>('forward');
  const [sequence, setSequence] = useState<number[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [level, setLevel] = useState(3);
  const [score, setScore] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(true);
  const [bestForward, setBestForward] = useState(0);
  const [bestBackward, setBestBackward] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('tutorialDigitSpan').then(s => { if (!s) setPhase('tutorial'); });
    AsyncStorage.getItem('digitSpanBestForward').then(v => v && setBestForward(Number(v)));
    AsyncStorage.getItem('digitSpanBestBackward').then(v => v && setBestBackward(Number(v)));
  }, []);

  async function finishTutorial() {
    await AsyncStorage.setItem('tutorialDigitSpan', 'done');
    setPhase('idle');
  }

  function startGame(selectedMode: Mode) {
    setMode(selectedMode);
    setLevel(3);
    setScore(0);
    setUserInput([]);
    showSequence(randomDigits(3));
  }

  function showSequence(seq: number[]) {
    setSequence(seq);
    setUserInput([]);
    setPhase('showing');

    seq.forEach((digit, i) => {
      setTimeout(() => setShown(digit), i * (SHOW_MS + GAP_MS));
      setTimeout(() => setShown(null), i * (SHOW_MS + GAP_MS) + SHOW_MS);
    });

    setTimeout(() => {
      setShown(null);
      setPhase('input');
    }, seq.length * (SHOW_MS + GAP_MS));
  }

  function handleDigitTap(digit: number) {
    if (phase !== 'input') return;
    const newInput = [...userInput, digit];
    setUserInput(newInput);

    if (newInput.length === sequence.length) {
      const target = mode === 'forward' ? sequence : [...sequence].reverse();
      const correct = newInput.every((d, i) => d === target[i]);
      setLastCorrect(correct);
      setPhase('feedback');

      setTimeout(async () => {
        if (correct) {
          const newLevel = level + 1;
          setLevel(newLevel);
          setScore(newLevel - 1);
          showSequence(randomDigits(newLevel));
        } else {
          // Game over
          const finalScore = level - 1;
          setScore(finalScore);
          setPhase('result');
          const key = mode === 'forward' ? 'digitSpanBestForward' : 'digitSpanBestBackward';
          const currentBest = mode === 'forward' ? bestForward : bestBackward;
          if (finalScore > currentBest) {
            if (mode === 'forward') setBestForward(finalScore);
            else setBestBackward(finalScore);
            await AsyncStorage.setItem(key, String(finalScore));
          }
          await AsyncStorage.setItem(`digitSpanLast${mode === 'forward' ? 'Forward' : 'Backward'}`, String(finalScore));
          const histKey = `digitSpanHistory${mode === 'forward' ? 'Forward' : 'Backward'}`;
          const existing = await AsyncStorage.getItem(histKey);
          const hist = existing ? JSON.parse(existing) : [];
          await AsyncStorage.setItem(histKey, JSON.stringify([...hist, finalScore].slice(-7)));
        }
      }, 800);
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
        <Text style={styles.title}>Digit Span</Text>
        <Text style={styles.subtitle}>Verbal Working Memory · Wechsler Scale</Text>
        <View style={styles.modeCards}>
          <TouchableOpacity style={[styles.modeCard, { borderColor: '#7eb8a4' }]} onPress={() => startGame('forward')}>
            <Text style={styles.modeLabel}>Forward</Text>
            <Text style={styles.modeDesc}>Repeat digits{'\n'}in order →</Text>
            {bestForward > 0 && <Text style={[styles.modeBest, { color: '#7eb8a4' }]}>Best: {bestForward}</Text>}
            <Text style={[styles.modeStart, { color: '#7eb8a4' }]}>Start →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeCard, { borderColor: '#8aabcc' }]} onPress={() => startGame('backward')}>
            <Text style={styles.modeLabel}>Backward</Text>
            <Text style={styles.modeDesc}>Repeat digits{'\n'}in reverse ←</Text>
            {bestBackward > 0 && <Text style={[styles.modeBest, { color: '#8aabcc' }]}>Best: {bestBackward}</Text>}
            <Text style={[styles.modeStart, { color: '#8aabcc' }]}>Start →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Measures verbal working memory — different from the spatial Memory Grid.</Text>
          <Text style={styles.infoBenchmark}>Healthy adults: forward 7±1 · backward 5±1{'\n'}TBI typically reduces both by 2–3 digits</Text>
        </View>
      </View>
    );
  }

  const color = mode === 'forward' ? '#7eb8a4' : '#8aabcc';
  const target = mode === 'backward' ? [...sequence].reverse() : sequence;

  return (
    <View style={styles.container}>
      <View style={styles.playHeader}>
        <Text style={styles.playMode}>{mode === 'forward' ? 'Forward' : 'Backward'}</Text>
        <Text style={[styles.playSpan, { color }]}>Span: {score}</Text>
      </View>

      {/* Showing phase */}
      {phase === 'showing' && (
        <View style={styles.centered}>
          <Text style={styles.watchLabel}>Watch the digits</Text>
          <View style={[styles.digitDisplay, { borderColor: color }]}>
            <Text style={[styles.digitShown, { color }]}>{shown !== null ? shown : ''}</Text>
          </View>
          <Text style={styles.levelLabel}>Sequence length: {level}</Text>
        </View>
      )}

      {/* Input phase */}
      {(phase === 'input' || phase === 'feedback') && (
        <View style={styles.centered}>
          <Text style={styles.watchLabel}>
            {mode === 'forward' ? 'Tap in order →' : 'Tap in reverse ←'}
          </Text>
          <View style={styles.inputDisplay}>
            {Array.from({ length: sequence.length }, (_, i) => (
              <View key={i} style={[styles.inputSlot, userInput[i] !== undefined && { borderColor: color }]}>
                <Text style={[styles.inputSlotText, { color }]}>
                  {userInput[i] !== undefined ? userInput[i] : ''}
                </Text>
              </View>
            ))}
          </View>
          {phase === 'feedback' && (
            <Text style={[styles.feedbackText, { color: lastCorrect ? '#7eb8a4' : '#cc6666' }]}>
              {lastCorrect ? '✓ Correct!' : `✗ It was ${target.join(' ')}`}
            </Text>
          )}
          {phase === 'input' && (
            <View style={styles.keypad}>
              {[1,2,3,4,5,6,7,8,9,0].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.keypadButton, { borderColor: color }]}
                  onPress={() => handleDigitTap(d)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Result phase */}
      {phase === 'result' && (
        <View style={styles.centered}>
          <Text style={styles.resultTitle}>
            {mode === 'forward' ? 'Forward' : 'Backward'} Span: {score}
          </Text>
          <View style={styles.resultsCard}>
            <View style={styles.resultRow}><Text style={styles.resultLabel}>Your span</Text><Text style={[styles.resultValue, { color }]}>{score}</Text></View>
            <View style={styles.resultRow}><Text style={styles.resultLabel}>Best {mode}</Text><Text style={[styles.resultValue, { color }]}>{mode === 'forward' ? bestForward : bestBackward}</Text></View>
          </View>
          <Text style={styles.benchmark}>Healthy adult avg: {mode === 'forward' ? '7±1' : '5±1'} digits</Text>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={[styles.retryButton, { borderColor: color }]} onPress={() => startGame(mode)}>
              <Text style={[styles.retryText, { color }]}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.switchButton, { backgroundColor: color }]}
              onPress={() => startGame(mode === 'forward' ? 'backward' : 'forward')}>
              <Text style={styles.switchText}>Try {mode === 'forward' ? 'Backward' : 'Forward'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628', padding: 24, paddingTop: 56 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#7eb8a4', marginTop: 4, marginBottom: 24 },
  modeCards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modeCard: { flex: 1, backgroundColor: '#1a2e4a', borderRadius: 16, padding: 18, borderWidth: 1, gap: 8 },
  modeLabel: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  modeDesc: { fontSize: 13, color: '#8899aa', lineHeight: 20 },
  modeBest: { fontSize: 13, fontWeight: '600' },
  modeStart: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  infoBox: { backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16, gap: 8 },
  infoText: { fontSize: 13, color: '#aabbcc', lineHeight: 20 },
  infoBenchmark: { fontSize: 12, color: '#445566', lineHeight: 18 },
  playHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  playMode: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  playSpan: { fontSize: 18, fontWeight: 'bold' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  watchLabel: { fontSize: 16, color: '#aabbcc', marginBottom: 24 },
  digitDisplay: { width: 140, height: 140, borderRadius: 24, backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 16 },
  digitShown: { fontSize: 80, fontWeight: 'bold' },
  levelLabel: { fontSize: 14, color: '#8899aa' },
  inputDisplay: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  inputSlot: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#2a4a6a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2e4a' },
  inputSlotText: { fontSize: 20, fontWeight: 'bold' },
  feedbackText: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 280 },
  keypadButton: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  keypadText: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  resultTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  resultsCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 18, width: '100%', marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a4a6a' },
  resultLabel: { fontSize: 14, color: '#8899aa' },
  resultValue: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  benchmark: { fontSize: 12, color: '#445566', marginBottom: 24 },
  resultButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  retryButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  retryText: { fontSize: 15, fontWeight: '600' },
  switchButton: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  switchText: { fontSize: 15, fontWeight: 'bold', color: '#0a1628' },
  tutorialContainer: { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center', padding: 36 },
  tutorialEmoji: { fontSize: 72, marginBottom: 24 },
  tutorialTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  tutorialBody: { fontSize: 17, color: '#aabbcc', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  tutorialDots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a4a6a' },
  dotActive: { backgroundColor: '#7eb8a4' },
  primaryButton: { backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  skipButton: { padding: 12, alignItems: 'center', marginTop: 8 },
  skipText: { fontSize: 14, color: '#445566' },
});
