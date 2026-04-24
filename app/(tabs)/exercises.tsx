import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GRID_SIZE = 4;             // 4x4 grid
const TILE_COUNT = GRID_SIZE * GRID_SIZE; // 16 tiles
const HIGHLIGHT_MS = 700;        // how long each tile stays lit
const GAP_MS = 300;              // pause between highlights
const FEEDBACK_MS = 800;         // how long "Correct!" shows

type Phase = 'idle' | 'showing' | 'input' | 'feedback_correct' | 'result';

// Pick `length` unique random tile indices from 0–15
function randomSequence(length: number): number[] {
  const all = Array.from({ length: TILE_COUNT }, (_, i) => i);
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, length);
}

export default function ExercisesScreen() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(3);           // sequence length
  const [sequence, setSequence] = useState<number[]>([]);
  const [userTaps, setUserTaps] = useState<number[]>([]);
  const [litTile, setLitTile] = useState<number | null>(null);
  const [score, setScore] = useState(0);           // best level reached this game
  const [bestScore, setBestScore] = useState(0);   // all-time best

  // Load all-time best score on mount
  useEffect(() => {
    AsyncStorage.getItem('memoryGridBest').then(val => {
      if (val) setBestScore(Number(val));
    });
  }, []);

  // Flash the sequence one tile at a time
  function showSequence(seq: number[]) {
    setPhase('showing');
    setUserTaps([]);

    seq.forEach((tileIndex, i) => {
      const onTime = i * (HIGHLIGHT_MS + GAP_MS);
      const offTime = onTime + HIGHLIGHT_MS;

      setTimeout(() => setLitTile(tileIndex), onTime);
      setTimeout(() => setLitTile(null), offTime);
    });

    // After all tiles shown, let user tap
    const totalTime = seq.length * (HIGHLIGHT_MS + GAP_MS);
    setTimeout(() => setPhase('input'), totalTime);
  }

  function startGame() {
    setLevel(3);
    setScore(0);
    const seq = randomSequence(3);
    setSequence(seq);
    showSequence(seq);
  }

  function handleTileTap(tileIndex: number) {
    if (phase !== 'input') return;

    const newTaps = [...userTaps, tileIndex];
    setUserTaps(newTaps);

    const position = newTaps.length - 1;

    // Wrong tile tapped
    if (newTaps[position] !== sequence[position]) {
      endGame(level - 1); // score = last successfully completed level
      return;
    }

    // Correct so far — check if sequence is complete
    if (newTaps.length === sequence.length) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setScore(newLevel - 1);
      setPhase('feedback_correct');

      // Brief pause then show next (longer) sequence
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

    if (finalScore > bestScore) {
      setBestScore(finalScore);
      await AsyncStorage.setItem('memoryGridBest', String(finalScore));
    }
    await AsyncStorage.setItem('memoryGridLast', String(finalScore));
  }

  function getTileStyle(index: number) {
    const isLit = litTile === index;
    const isTapped = userTaps.includes(index) && phase === 'input';
    if (isLit) return [styles.tile, styles.tileLit];
    if (isTapped) return [styles.tile, styles.tileTapped];
    return [styles.tile];
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Memory Grid</Text>
      <Text style={styles.subtitle}>Corsi Block Test · Working Memory</Text>

      {/* Score row */}
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

      {/* Status message */}
      <Text style={styles.status}>
        {phase === 'idle' && 'Watch the sequence, then repeat it'}
        {phase === 'showing' && `Watch — sequence length ${level}`}
        {phase === 'input' && `Your turn — tap ${sequence.length} tiles`}
        {phase === 'feedback_correct' && '✓ Correct! Next round...'}
        {phase === 'result' && `Game over — memory span: ${score}`}
      </Text>

      {/* 4×4 Grid */}
      <View style={styles.grid}>
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={getTileStyle(i)}
            onPress={() => handleTileTap(i)}
            activeOpacity={0.7}
          />
        ))}
      </View>

      {/* Start / Play again button */}
      {(phase === 'idle' || phase === 'result') && (
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>
            {phase === 'idle' ? 'Start' : 'Play Again'}
          </Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

const { width } = Dimensions.get('window');
const GRID_WIDTH = Math.min(width - 48, 340);
const TILE_SIZE = (GRID_WIDTH - 12) / GRID_SIZE; // 3px gap each side

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    alignItems: 'center',
    paddingTop: 64,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#7eb8a4',
    marginTop: 6,
    marginBottom: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  scoreBox: {
    backgroundColor: '#1a2e4a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  scoreNum: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7eb8a4',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginTop: 4,
  },
  status: {
    fontSize: 15,
    color: '#ccddcc',
    marginBottom: 24,
    textAlign: 'center',
    minHeight: 22,
  },
  grid: {
    width: GRID_WIDTH,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: TILE_SIZE - 8,
    height: TILE_SIZE - 8,
    backgroundColor: '#1a2e4a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a4a6a',
  },
  tileLit: {
    backgroundColor: '#7eb8a4',
    borderColor: '#9ed8c4',
  },
  tileTapped: {
    backgroundColor: '#2a5a8a',
    borderColor: '#4a8aba',
  },
  startButton: {
    marginTop: 32,
    backgroundColor: '#7eb8a4',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },
});
