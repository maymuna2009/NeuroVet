import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const GRID_SIZE = 4;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const FEEDBACK_MS = 800;

type Phase = 'tutorial' | 'idle' | 'showing' | 'input' | 'feedback_correct' | 'result';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_SETTINGS = {
  easy:   { startLevel: 3, highlightMs: 900, gapMs: 400 },
  medium: { startLevel: 4, highlightMs: 650, gapMs: 300 },
  hard:   { startLevel: 5, highlightMs: 450, gapMs: 200 },
};

function randomSequence(length: number): number[] {
  const all = Array.from({ length: TILE_COUNT }, (_, i) => i);
  return all.sort(() => Math.random() - 0.5).slice(0, length);
}

export default function MemoryGridScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [level, setLevel] = useState(3);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userTaps, setUserTaps] = useState<number[]>([]);
  const [litTile, setLitTile] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const TUTORIAL_STEPS = [
    { emoji: '👀', title: 'Watch the tiles', body: 'Some tiles will light up one by one. Pay close attention to the order.' },
    { emoji: '👆', title: 'Tap them back', body: 'After the sequence finishes, tap the same tiles in the same order.' },
    { emoji: '📈', title: 'It gets longer', body: 'Each correct round adds one more tile. Your score is the longest sequence you complete.' },
  ];

  useEffect(() => {
    AsyncStorage.getItem('memoryGridBest').then(v => v && setBestScore(Number(v)));
    AsyncStorage.getItem('memoryGridHistory').then(v => v && setHistory(JSON.parse(v)));
    AsyncStorage.getItem('tutorialMemoryGrid').then(seen => {
      if (!seen) setPhase('tutorial');
    });
  }, []);

  async function finishTutorial() {
    await AsyncStorage.setItem('tutorialMemoryGrid', 'done');
    setPhase('idle');
  }

  function showSequence(seq: number[]) {
    const { highlightMs, gapMs } = DIFFICULTY_SETTINGS[difficulty];
    setPhase('showing');
    setUserTaps([]);
    seq.forEach((tileIndex, i) => {
      setTimeout(() => setLitTile(tileIndex), i * (highlightMs + gapMs));
      setTimeout(() => setLitTile(null), i * (highlightMs + gapMs) + highlightMs);
    });
    setTimeout(() => setPhase('input'), seq.length * (highlightMs + gapMs));
  }

  function startGame() {
    const startLevel = DIFFICULTY_SETTINGS[difficulty].startLevel;
    setLevel(startLevel);
    setScore(0);
    const seq = randomSequence(startLevel);
    setSequence(seq);
    showSequence(seq);
  }

  function handleTileTap(tileIndex: number) {
    if (phase !== 'input') return;
    const newTaps = [...userTaps, tileIndex];
    setUserTaps(newTaps);
    const pos = newTaps.length - 1;
    if (newTaps[pos] !== sequence[pos]) { endGame(level - 1); return; }
    if (newTaps.length === sequence.length) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setScore(newLevel - 1);
      setPhase('feedback_correct');
      setTimeout(() => {
        const newSeq = randomSequence(newLevel);
        setSequence(newSeq);
        showSequence(newSeq);
      }, FEEDBACK_MS);
    }
  }

  async function endGame(finalScore: number) {
    setPhase('result');
    setScore(finalScore);
    setLitTile(null);
    const newBest = finalScore > bestScore ? finalScore : bestScore;
    setBestScore(newBest);
    await AsyncStorage.setItem('memoryGridBest', String(newBest));
    const newHistory = [...history, finalScore].slice(-7);
    setHistory(newHistory);
    await AsyncStorage.setItem('memoryGridHistory', JSON.stringify(newHistory));
    await AsyncStorage.setItem('memoryGridLast', String(finalScore));
  }

  function getTileStyle(index: number) {
    if (litTile === index) return [styles.tile, styles.tileLit];
    if (userTaps.includes(index) && phase === 'input') return [styles.tile, styles.tileTapped];
    return [styles.tile];
  }

  const gameActive = phase !== 'idle' && phase !== 'result' && phase !== 'tutorial';
  const currentStep = TUTORIAL_STEPS[tutorialStep];

  // Tutorial screen
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
          onPress={() => {
            if (tutorialStep < TUTORIAL_STEPS.length - 1) {
              setTutorialStep(tutorialStep + 1);
            } else {
              finishTutorial();
            }
          }}
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Memory Grid</Text>
      <Text style={styles.subtitle}>Corsi Block Test · Working Memory</Text>

      {!gameActive && (
        <View style={styles.diffRow}>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.diffButton, difficulty === d && styles.diffButtonActive]}
              onPress={() => setDifficulty(d)}
            >
              <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!gameActive && (
        <Text style={styles.diffHint}>
          {difficulty === 'easy'   && 'Start at 3 tiles · slow flash'}
          {difficulty === 'medium' && 'Start at 4 tiles · medium flash'}
          {difficulty === 'hard'   && 'Start at 5 tiles · fast flash'}
        </Text>
      )}

      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreNum}>{score}</Text>
          <Text style={styles.scoreLabel}>This game</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreNum}>{bestScore}</Text>
          <Text style={styles.scoreLabel}>Best ever</Text>
        </View>
      </View>

      <Text style={styles.status}>
        {phase === 'idle'             && 'Watch the sequence, then repeat it'}
        {phase === 'showing'          && `Watch — sequence length ${level}`}
        {phase === 'input'            && `Your turn — tap ${sequence.length} tiles`}
        {phase === 'feedback_correct' && '✓ Correct! Next round...'}
        {phase === 'result'           && `Game over — memory span: ${score}`}
      </Text>

      <View style={styles.grid}>
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <TouchableOpacity key={i} style={getTileStyle(i)} onPress={() => handleTileTap(i)} activeOpacity={0.7} />
        ))}
      </View>

      {(phase === 'idle' || phase === 'result') && (
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>{phase === 'idle' ? 'Start' : 'Play Again'}</Text>
        </TouchableOpacity>
      )}

      {history.length > 0 && !gameActive && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Last {history.length} games</Text>
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
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');
const GRID_WIDTH = Math.min(width - 48, 340);
const TILE_SIZE = (GRID_WIDTH - 12) / GRID_SIZE;

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a1628' },
  container: { alignItems: 'center', paddingTop: 56, paddingBottom: 40, padding: 24 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 16, color: '#7eb8a4' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#7eb8a4', marginTop: 6, marginBottom: 20 },
  diffRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  diffButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#1a2e4a', borderWidth: 1, borderColor: '#2a4a6a' },
  diffButtonActive: { backgroundColor: '#7eb8a4', borderColor: '#7eb8a4' },
  diffText: { fontSize: 14, color: '#8899aa', fontWeight: '600' },
  diffTextActive: { color: '#0a1628' },
  diffHint: { fontSize: 13, color: '#445566', marginBottom: 20 },
  scoreRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  scoreBox: { backgroundColor: '#1a2e4a', borderRadius: 12, padding: 16, alignItems: 'center', minWidth: 90 },
  scoreNum: { fontSize: 32, fontWeight: 'bold', color: '#7eb8a4' },
  scoreLabel: { fontSize: 12, color: '#8899aa', marginTop: 4 },
  status: { fontSize: 15, color: '#ccddcc', marginBottom: 20, textAlign: 'center', minHeight: 22 },
  grid: { width: GRID_WIDTH, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: TILE_SIZE - 8, height: TILE_SIZE - 8, backgroundColor: '#1a2e4a', borderRadius: 10, borderWidth: 1, borderColor: '#2a4a6a' },
  tileLit: { backgroundColor: '#7eb8a4', borderColor: '#9ed8c4' },
  tileTapped: { backgroundColor: '#2a5a8a', borderColor: '#4a8aba' },
  startButton: { marginTop: 28, backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  startButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  historyCard: { marginTop: 32, backgroundColor: '#1a2e4a', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center' },
  historyTitle: { fontSize: 14, color: '#8899aa', marginBottom: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  barWrapper: { alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 11, color: '#7eb8a4' },
  bar: { width: 28, backgroundColor: '#7eb8a4', borderRadius: 4 },
  tutorialContainer: {
    flex: 1, backgroundColor: '#0a1628', alignItems: 'center',
    justifyContent: 'center', padding: 36,
  },
  tutorialEmoji: { fontSize: 72, marginBottom: 24 },
  tutorialTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  tutorialBody: { fontSize: 17, color: '#aabbcc', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  tutorialDots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2a4a6a' },
  dotActive: { backgroundColor: '#7eb8a4' },
  tutorialButton: {
    backgroundColor: '#7eb8a4', paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 14, marginBottom: 16,
  },
  tutorialButtonText: { fontSize: 18, fontWeight: 'bold', color: '#0a1628' },
  tutorialSkip: { padding: 8 },
  tutorialSkipText: { fontSize: 14, color: '#445566' },
});
