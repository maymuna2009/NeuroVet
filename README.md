# NeuroVet

Daily cognitive training for veterans living with traumatic brain injury. Free,
works with no account and no internet connection, and keeps every piece of data
on the device.

More than 509,000 service members have sustained a TBI since 2000. The VA runs
the Polytrauma System of Care for rehabilitation, but whether a veteran receives
it depends on how far they live from a center and how long the waitlist runs.
The VA's own mobile apps for TBI handle symptom tracking, coping and relaxation.
NeuroVet trains the cognitive skills themselves.

Built by Maymuna Kabir, a high school student in Portland, Oregon, after nearly
130 hours volunteering at the Portland VA Medical Center.

Landing page: https://sites.google.com/view/neurovet/home

## The seven exercises

Each one is adapted from a neuropsychological instrument clinicians already use,
so a score means something to a provider and not only inside this app.

| Exercise | Adapted from | Trains |
|---|---|---|
| Memory Grid | Corsi Block Test | Spatial working memory |
| Digit Span | Digit Span | Verbal working memory |
| Focus Filter | Continuous Performance Test | Sustained attention |
| Go No Go | Go/No-Go paradigm | Inhibitory control |
| Speed Match | Symbol Digit Modalities Test | Processing speed |
| Trail Making | Trail Making Test | Cognitive flexibility |
| Prospective Memory | Prospective memory task | Remembering to act later |

Source for each lives in `app/exercises/`.

## How it works

**Adaptive difficulty.** Every exercise reads the user's last five sessions and
sets the starting level from that recent average, the way a therapist adjusts in
a clinic. Capacity after a brain injury moves between a good day and a hard one,
and a fixed level is wrong on both.

**Weekly check-in.** Adapted from the Cognitive Failures Questionnaire. Tracks
symptoms over time with color-coded severity zones.

**Progress.** Charts every exercise over time alongside mood, sleep and the
weekly symptom score.

**Sharing on the user's terms.** A plain-language summary goes out through the
operating system's share sheet, so the veteran picks the recipient every time.
Nothing is sent anywhere automatically.

**Resources.** One tap to the Veterans Crisis Line, the Portland VA Medical
Center, and VA TBI care centers.

## Privacy

All data stays on the device in local storage. There is no account, no server,
no analytics and no network call that carries user data. The app runs with the
device offline.

## Stack

TypeScript and React Native, one codebase for iOS and Android, built with Expo.

```
npm install
npx expo start        # development
npx expo run:ios      # iOS build
npx expo run:android  # Android build
npm run lint
```

## Open-source dependencies

Everything below is third-party open-source software used under its own license.
All application code, exercise logic, scoring, adaptive difficulty and interface
design is my own work.

**Framework and runtime**

| Package | Version | Purpose |
|---|---|---|
| expo | ~54.0.33 | Build toolchain and native runtime |
| react | 19.1.0 | UI library |
| react-dom | 19.1.0 | React renderer for web |
| react-native | 0.81.5 | Native mobile framework |
| react-native-web | ~0.21.0 | React Native components on web |
| typescript | ~5.9.2 | Language and type checking |

**Navigation and routing**

| Package | Version | Purpose |
|---|---|---|
| expo-router | ~6.0.23 | File-based routing |
| @react-navigation/native | ^7.1.8 | Navigation core |
| @react-navigation/bottom-tabs | ^7.4.0 | Bottom tab bar |
| @react-navigation/elements | ^2.6.3 | Shared navigation UI |
| react-native-screens | ~4.16.0 | Native screen primitives |
| react-native-safe-area-context | ~5.6.0 | Safe area insets |

**Storage**

| Package | Version | Purpose |
|---|---|---|
| @react-native-async-storage/async-storage | 2.2.0 | On-device persistence for all user data |

**Interaction and animation**

| Package | Version | Purpose |
|---|---|---|
| react-native-gesture-handler | ~2.28.0 | Touch handling in the exercises |
| react-native-reanimated | ~4.1.1 | Animation |
| react-native-worklets | 0.5.1 | Worklet runtime for Reanimated |
| expo-haptics | ~15.0.8 | Haptic feedback on taps |

**Interface and system**

| Package | Version | Purpose |
|---|---|---|
| @expo/vector-icons | ^15.0.3 | Icon set |
| expo-font | ~14.0.11 | Font loading |
| expo-image | ~3.0.11 | Image component |
| expo-symbols | ~1.0.8 | SF Symbols on iOS |
| expo-splash-screen | ~31.0.13 | Launch screen |
| expo-status-bar | ~3.0.9 | Status bar control |
| expo-system-ui | ~6.0.9 | System UI theming |
| expo-constants | ~18.0.13 | Build-time constants |
| expo-linking | ~8.0.11 | Deep links and outbound links |
| expo-web-browser | ~15.0.10 | In-app browser for resources |
| expo-notifications | ~0.32.16 | Local exercise reminders |

**Development only**

| Package | Version | Purpose |
|---|---|---|
| eslint | ^9.25.0 | Linting |
| eslint-config-expo | ~10.0.0 | Expo lint rules |
| @types/react | ~19.1.0 | React type definitions |
| jimp | ^1.6.1 | Icon asset generation |

## AI disclosure

I used Claude, an AI assistant by Anthropic, as a coding tool while building
this. I was learning React Native and TypeScript at the same time, so I used it
for first drafts of components, for explanations of framework concepts, and to
help trace bugs.

Every decision about what the app should be is mine. I chose the seven exercises
and the instrument each one adapts, after reading the research on cognitive
rehabilitation after brain injury. I designed the adaptive difficulty logic, the
weekly check-in, the scoring and the severity zones. I chose to keep all data on
the device. I designed the interface, tested every exercise, and fixed the bugs
testing found. If I did not understand something, I did not paste it in.

## License

MIT. See [LICENSE](LICENSE).
