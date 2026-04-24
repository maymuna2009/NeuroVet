import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert,
} from 'react-native';

type Resource = {
  type: 'call' | 'link';
  label: string;
  sublabel: string;
  value: string;
  urgent?: boolean;
};

const CRISIS_RESOURCES: Resource[] = [
  {
    type: 'call',
    label: 'Veterans Crisis Line',
    sublabel: 'Call 988, then press 1 · 24/7',
    value: '988',
    urgent: true,
  },
  {
    type: 'call',
    label: 'Veterans Crisis Line — Text',
    sublabel: 'Text 838255 · 24/7',
    value: 'sms:838255',
    urgent: true,
  },
];

const VA_RESOURCES: Resource[] = [
  {
    type: 'link',
    label: 'Portland VA Medical Center',
    sublabel: '3710 SW US Veterans Hospital Rd, Portland OR',
    value: 'https://www.va.gov/portland-health-care/',
  },
  {
    type: 'link',
    label: 'VA Polytrauma / TBI Care',
    sublabel: 'Find your nearest TBI Polytrauma center',
    value: 'https://www.polytrauma.va.gov/system-of-care/care-continuum/polytrauma-rehabilitation-centers/',
  },
  {
    type: 'link',
    label: 'VA TBI Resources',
    sublabel: 'Official VA TBI information and support',
    value: 'https://www.mentalhealth.va.gov/tbi/treatment.asp',
  },
  {
    type: 'link',
    label: 'My HealtheVet',
    sublabel: 'Manage VA appointments and health records',
    value: 'https://www.myhealth.va.gov',
  },
];

const RESEARCH_RESOURCES: Resource[] = [
  {
    type: 'link',
    label: 'CALM Trial (Mobile TBI Rehab)',
    sublabel: 'The VA research study this app is based on',
    value: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6314886/',
  },
  {
    type: 'link',
    label: 'GOALS Program (VA Cognitive Rehab)',
    sublabel: 'Goal-oriented attention training for veterans',
    value: 'https://www.research.va.gov/topics/tbi.cfm',
  },
  {
    type: 'link',
    label: 'BrainLine — TBI Resources',
    sublabel: 'Education and support for TBI survivors',
    value: 'https://www.brainline.org',
  },
];

async function handlePress(resource: Resource) {
  let url = '';
  if (resource.type === 'call') {
    url = resource.value.startsWith('sms:') ? resource.value : `tel:${resource.value}`;
  } else {
    url = resource.value;
  }

  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Cannot open', `Visit: ${resource.value}`);
  }
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <TouchableOpacity
      style={[styles.resourceCard, resource.urgent && styles.resourceCardUrgent]}
      onPress={() => handlePress(resource)}
      activeOpacity={0.75}
    >
      <View style={styles.resourceLeft}>
        <Text style={[styles.resourceLabel, resource.urgent && styles.resourceLabelUrgent]}>
          {resource.label}
        </Text>
        <Text style={styles.resourceSub}>{resource.sublabel}</Text>
      </View>
      <Text style={[styles.resourceIcon, resource.urgent && styles.resourceIconUrgent]}>
        {resource.type === 'call' ? '📞' : '→'}
      </Text>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ResourcesScreen() {
  const [aboutExpanded, setAboutExpanded] = useState(false);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Resources</Text>
      <Text style={styles.subtitle}>VA support · TBI care · Research</Text>

      {/* Crisis — always first, most prominent */}
      <Section title="Crisis Support">
        {CRISIS_RESOURCES.map((r, i) => <ResourceCard key={i} resource={r} />)}
        <Text style={styles.crisisNote}>
          If you are in crisis, call 988 and press 1 immediately.
        </Text>
      </Section>

      {/* VA Resources */}
      <Section title="VA Healthcare">
        {VA_RESOURCES.map((r, i) => <ResourceCard key={i} resource={r} />)}
      </Section>

      {/* Research */}
      <Section title="Research Behind This App">
        {RESEARCH_RESOURCES.map((r, i) => <ResourceCard key={i} resource={r} />)}
      </Section>

      {/* About */}
      <View style={styles.aboutCard}>
        <TouchableOpacity
          style={styles.aboutHeader}
          onPress={() => setAboutExpanded(!aboutExpanded)}
        >
          <Text style={styles.aboutTitle}>About NeuroVet</Text>
          <Text style={styles.aboutToggle}>{aboutExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {aboutExpanded && (
          <View style={styles.aboutBody}>
            <Text style={styles.aboutText}>
              NeuroVet was built to address a documented gap: the VA offers seven mobile apps for
              veterans with TBI, but none target cognitive rehabilitation — memory, attention, or
              processing speed.
            </Text>
            <Text style={styles.aboutText}>
              The three exercises are adapted from clinically validated neuropsychological tests
              used in VA TBI assessments: the Corsi Block Test (working memory), the Continuous
              Performance Test (sustained attention), and the Symbol Digit Modalities Test
              (processing speed).
            </Text>
            <Text style={styles.aboutText}>
              The weekly symptom check-in is adapted from the Cognitive Failures Questionnaire
              (CFQ), used in published TBI research with veteran populations.
            </Text>
            <Text style={styles.aboutText}>
              The mobile rehabilitation approach is grounded in the CALM trial (PMC 2019), which
              demonstrated that VA-validated cognitive rehab protocols are effective when delivered
              via smartphone.
            </Text>
            <Text style={styles.aboutSubhead}>Built by</Text>
            <Text style={styles.aboutText}>
              Maymuna Kabir, 11th grade, Westview High School, Portland, Oregon. 120+
              volunteer hours at the Portland VA Medical Center. Built for the 2026 Congressional
              App Challenge, Oregon's 1st District.
            </Text>
            <Text style={styles.aboutDisclaimer}>
              NeuroVet is a self-training and monitoring tool. It is not a medical device and does
              not provide clinical diagnosis or treatment. Always consult your VA provider for
              medical guidance.
            </Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a1628' },
  container: { padding: 24, paddingTop: 64, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#7eb8a4', marginTop: 6, marginBottom: 28 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#8899aa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  resourceCard: {
    backgroundColor: '#1a2e4a', borderRadius: 14, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#2a4a6a',
  },
  resourceCardUrgent: { borderColor: '#cc6666', backgroundColor: '#2a1a1a' },
  resourceLeft: { flex: 1, paddingRight: 12 },
  resourceLabel: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  resourceLabelUrgent: { color: '#ff9999' },
  resourceSub: { fontSize: 13, color: '#8899aa', marginTop: 3 },
  resourceIcon: { fontSize: 18, color: '#8899aa' },
  resourceIconUrgent: { color: '#cc6666' },
  crisisNote: { fontSize: 13, color: '#cc6666', marginTop: 8, textAlign: 'center' },
  aboutCard: { backgroundColor: '#1a2e4a', borderRadius: 16, borderWidth: 1, borderColor: '#2a4a6a', overflow: 'hidden' },
  aboutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  aboutTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  aboutToggle: { fontSize: 14, color: '#8899aa' },
  aboutBody: { paddingHorizontal: 18, paddingBottom: 20, gap: 12 },
  aboutSubhead: { fontSize: 13, fontWeight: '700', color: '#7eb8a4', marginTop: 4 },
  aboutText: { fontSize: 14, color: '#aabbcc', lineHeight: 22 },
  aboutDisclaimer: { fontSize: 12, color: '#445566', lineHeight: 18, marginTop: 8, fontStyle: 'italic' },
});
