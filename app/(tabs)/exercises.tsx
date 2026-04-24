import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const EXERCISES = [
  {
    route: '/exercises/memory-grid',
    name: 'Memory Grid',
    tag: 'Corsi Block Test',
    skill: 'Working Memory',
    description: 'Watch a sequence of tiles flash, then tap them back in order. Gets harder as you improve.',
    color: '#7eb8a4',
  },
  {
    route: '/exercises/focus-filter',
    name: 'Focus Filter',
    tag: 'Continuous Performance Test',
    skill: 'Sustained Attention',
    description: 'A target letter flashes on screen. Tap only when you see it. 60-second session.',
    color: '#8aabcc',
  },
  {
    route: '/exercises/speed-match',
    name: 'Speed Match',
    tag: 'Symbol Digit Modalities Test',
    skill: 'Processing Speed',
    description: 'Match symbols to digits as fast as possible. The cognitive domain most affected by TBI blast injuries.',
    color: '#c8a87e',
  },
];

export default function ExercisesScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Exercises</Text>
      <Text style={styles.subtitle}>Daily brain training · 5 min total</Text>

      {EXERCISES.map(ex => (
        <TouchableOpacity
          key={ex.route}
          style={styles.card}
          onPress={() => router.push(ex.route as any)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardName}>{ex.name}</Text>
              <Text style={styles.cardTag}>{ex.tag}</Text>
            </View>
            <View style={[styles.skillBadge, { borderColor: ex.color }]}>
              <Text style={[styles.skillText, { color: ex.color }]}>{ex.skill}</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>{ex.description}</Text>
          <Text style={[styles.cardArrow, { color: ex.color }]}>Start →</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Why these exercises?</Text>
        <Text style={styles.infoText}>
          Both tests are used in VA clinical settings to assess TBI-related cognitive symptoms.
          Regular practice builds memory span and attention endurance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a1628' },
  container: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#7eb8a4', marginTop: 6, marginBottom: 32 },
  card: {
    backgroundColor: '#1a2e4a',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a4a6a',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardName: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  cardTag: { fontSize: 12, color: '#8899aa', marginTop: 3 },
  skillBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  skillText: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 14, color: '#aabbcc', lineHeight: 20, marginBottom: 16 },
  cardArrow: { fontSize: 15, fontWeight: 'bold' },
  infoCard: {
    backgroundColor: '#0d1f35',
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1a2e4a',
  },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#7eb8a4', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#667788', lineHeight: 20 },
});
