import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const SESSION_SECONDS = 60;

// 6 symbol-digit pairs used throughout the session
const SYMBOL_MAP: { symbol: string; digit: string }[] = [
  { symbol: '★', digit: '1' },
  { symbol: '♦', digit: '2' },
  { symbol: '●', digit: '3' },
  { symbol: '▲', digit: '4' },
  { symbol: '■', digit: '5' },
  { symbol: '♥', digit: '6' },
];

type Phase = 'idle' | 'playing' | 'result';

function randomPair() {
  return SYMBOL_MAP[Math.floor(Math.random() * SYMBOL_MAP.length)];
}

export default function SpeedMatchScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentPair, setCurrentPair] = useState(SYMBOL_MAP[0]);
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [avgReactionMs, setAvgReactionMs] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  // Refs for use inside timer callbacks
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const pairShownAtRef = useRef<number>(0); // timestamp when current symbol appeared

  useEffect(() => {
    AsyncStorage.getItem('speedMatchBest').then(v => v && setBestScore(Number(v)));
    AsyncStorage.getItem('speedMatchHistory').then(v => v && setHistory(JSON.parse(v)));
  }, []);

  function startGame() {
    correctRef.current = 0;
    wrongRef.current = 0;
    reactionTimesRef.current = [];
    setCorrect(0); setWrong(0); setAvgReactionMs(0);
    setFeedback(null);
    setTimeLeft(SESSION_SECONDS);
    setPhase('playing');

    const first = randomPair();
    setCurrentPair(first);
    pairShownAtRef.current = Date.now();

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerInterval); return 0; }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      clearInterval(timerInterval);
      finishGame();
    }, SESSION_SECONDS * 1000);
  }

  async function finishGame() {
    const c = correctRef.current;
    const times = reactionTimesRef.current;
    const avg = times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

    setCorrect(c);
    setWrong(wrongRef.current);
    setAvgReactionMs(avg);
    setPhase('result');

    const newBest = c > bestScore ? c : bestScore;
    setBestScore(newBest);
    await AsyncStorage.setItem('speedMatchBest', String(newBest));
    await AsyncStorage.setItem('speedMatchAvgReaction', String(avg));

    const newHistory = [...history, c].slice(-7);
    setHistory(newHistory);
    await AsyncStorage.setItem('speedMatchHistory', JSON.stringify(newHistory));
    await AsyncStorage.setItem('speedMatchLast', String(c));
  }

  function handleAnswer(digit: string) {
    if (phase !== 'playing') return;

    const reactionMs = Date.now() - pairShownAtRef.current;
    const isCorrect = digit === currentPair.digit;

    if (isCorrect) {
      correctRef.current += 1;
      setCorrect(correctRef.current);
      reactionTimesRef.current = [...reactionTimesRef.current, reactionMs];
      setFeedback('correct');
    } else {
      wrongRef.current += 1;
      setWrong(wrongRef.current);
      setFeedback('wrong');
    }

    // Show next symbol after brief feedback flash
    setTimeout(() => {
      setFeedback(null);
      const next = randomPair();
      setCurrentPair(next);
      pairShownAtRef.current = Date.now();
    }, 300);
  }


  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Speed Match</Text>
      <Text style={styles.subtitle}>Symbol Digit Test · Processing Speed</Text>

      {/* IDLE */}
      {phase === 'idle' && (
        <View style={styles.centered}>
          <Text style={styles.instructions}>
            A key shows which digit matches each symbol.{'\n'}
            A symbol appears — tap its matching digit{'\n'}
            as fast as you can.{'\n\n'}
            60 seconds · as many as possible
          </Text>

          {/* Key preview */}
          <View style={styles.keyCard}>
            <Text style={styles.keyTitle}>Symbol Key</Text>
            <View style={styles.keyRow}>
              {SYMBOL_MAP.map(pair => (
                <View key={pair.digit} style={styles.keyPair}>
                  <Text style={styles.keySymbol}>{pair.symbol}</Text>
                  <Text style={styles.keyDigit}>{pair.digit}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.bestLabel}>Best score: {bestScore} correct</Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PLAYING */}
      {phase === 'playing' && (
        <View style={styles.centered}>
          {/* Compact key reminder at top */}
          <View style={styles.keyCardSmall}>
            <View style={styles.keyRow}>
              {SYMBOL_MAP.map(pair => (
                <View key={pair.digit} style={styles.keyPairSmall}>
                  <Text style={styles.keySymbolSmall}>{pair.symbol}</Text>
                  <Text style={styles.keyDigitSmall}>{pair.digit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Timer + live score */}
          <View style={styles.statsRow}>
            <Text style={styles.timer}>{timeLeft}s</Text>
            <Text style={styles.liveScore}>✓ {correct}  ✗ {wrong}</Text>
          </View>

          {/* Current symbol */}
          <View style={[
            styles.symbolBox,
            feedback === 'correct' && styles.symbolBoxCorrect,
            feedback === 'wrong'   && styles.symbolBoxWrong,
          ]}>
            <Text style={styles.symbolText}>{currentPair.symbol}</Text>
          </View>

          {/* Digit buttons */}
          <View style={styles.digitGrid}>
            {SYMBOL_MAP.map(pair => (
              <TouchableOpacity
                key={pair.digit}
                style={styles.digitButton}
                onPress={() => handleAnswer(pair.digit)}
                activeOpacity={0.7}
              >
                <Text style={styles.digitButtonText}>{pair.digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* RESULT */}
      {phase === 'result' && (
        <View style={styles.centered}>
          <Text style={styles.resultTitle}>Session Complete</Text>

          <View style={styles.resultsCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Correct answers</Text>
              <Text style={styles.resultValue}>{correct}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Wrong answers</Text>
              <Text style={styles.resultValue}>{wrong}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Avg reaction time</Text>
              <Text style={styles.resultValue}>{avgReactionMs} ms</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Best score ever</Text>
              <Text style={styles.resultValue}>{bestScore} correct</Text>
            </View>
          </View>

          <Text style={styles.benchmarkNote}>
            Clinical benchmark: healthy adults average 55–70 correct in 60s.{'\n'}
            TBI typically reduces this to 30–45.
          </Text>

          {history.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>Last {history.length} sessions</Text>
              <View style={styles.bars}>
                {history.map((s, i) => {
                  const maxScore = Math.max(...history, 1);
                  const barHeight = Math.max((s / maxScore) * 80, 8);
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a1628' },
  container: { padding: 24, paddingTop: 56, paddingBottom: 40, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#8aabcc', marginTop: 6, marginBottom: 24, textAlign: 'center' },
  centered: { width: '100%', alignItems: 'center' },
  instructions: { fontSize: 16, color: '#ccddcc', textAlign: 'center', lineHeight: 26, marginBottom: 24 },
  keyCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 16, width: '100%', marginBottom: 24 },
  keyCardSmall: { backgroundColor: '#1a2e4a', borderRadius: 12, padding: 10, width: '100%', marginBottom: 16 },
  keyTitle: { fontSize: 13, color: '#8899aa', marginBottom: 12, textAlign: 'center' },
  keyRow: { flexDirection: 'row', justifyContent: 'space-around' },
  keyPair: { alignItems: 'center', gap: 4 },
  keySymbol: { fontSize: 28, color: '#ffffff' },
  keyDigit: { fontSize: 16, color: '#7eb8a4', fontWeight: 'bold' },
  keyPairSmall: { alignItems: 'center', gap: 2 },
  keySymbolSmall: { fontSize: 18, color: '#ffffff' },
  keyDigitSmall: { fontSize: 12, color: '#7eb8a4', fontWeight: 'bold' },
  bestLabel: { fontSize: 14, color: '#7eb8a4', marginBottom: 28 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  timer: { fontSize: 22, color: '#ffffff', fontWeight: 'bold' },
  liveScore: { fontSize: 18, color: '#8899aa', fontWeight: '600' },
  symbolBox: {
    width: 140, height: 140, borderRadius: 24,
    backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center',
    marginBottom: 32, borderWidth: 2, borderColor: '#2a4a6a',
  },
  symbolBoxCorrect: { backgroundColor: '#1a3a2a', borderColor: '#7eb8a4' },
  symbolBoxWrong: { backgroundColor: '#3a1a1a', borderColor: '#cc6666' },
  symbolText: { fontSize: 72, color: '#ffffff' },
  digitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 320 },
  digitButton: {
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: '#1a2e4a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a4a6a',
  },
  digitButtonText: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  resultTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  resultsCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, width: '100%', marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a4a6a' },
  resultLabel: { fontSize: 14, color: '#8899aa' },
  resultValue: { fontSize: 16, fontWeight: 'bold', color: '#8aabcc' },
  benchmarkNote: { fontSize: 13, color: '#445566', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  historyCard: { backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 24 },
  historyTitle: { fontSize: 13, color: '#8899aa', marginBottom: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  barWrapper: { alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 11, color: '#8aabcc' },
  bar: { width: 28, backgroundColor: '#8aabcc', borderRadius: 4 },
  startButton: { backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  startButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
});
