// Background music: a chiptune town theme arranged in sections. Melody and bass lines for
// each section have equal length so the two voices stay aligned.

// Note frequency lookup
export const NOTE_FREQS: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  Bb3: 233.08, Eb4: 311.13, Ab3: 207.65,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50,
  Bb4: 466.16, Eb5: 622.25, Ab4: 415.30, Db5: 554.37, Gb4: 369.99,
  R: 0, // rest
};

export interface MelodyNote { note: string; duration: number; }

// ============================================================
// 3-MINUTE BGM — Structured as Intro → A → B → A' → C → A'' → Outro
// Inspired by Pokemon town themes (Littleroot, Pallet, Twinleaf)
// Total duration: ~180 seconds
// ============================================================

// INTRO — gentle opening, 8 bars (~8s)
const INTRO_MELODY: MelodyNote[] = [
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'E5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'G5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'C5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
  { note: 'G5', duration: 0.5 }, { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
];

const INTRO_BASS: MelodyNote[] = [
  { note: 'C3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
  { note: 'G3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'A3', duration: 1.0 }, { note: 'F3', duration: 1.0 },
  { note: 'G3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
];

// SECTION A — bouncy main theme (~24s, 3 repetitions of 8-bar phrase)
const A_PHRASE: MelodyNote[] = [
  // Bar 1-2: bright opening motif
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  // Bar 3-4: stepping down
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'G4', duration: 0.5 },
  // Bar 5-6: rising again
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.375 }, { note: 'E5', duration: 0.125 },
  { note: 'G5', duration: 0.5 },
  // Bar 7-8: resolution
  { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'C5', duration: 0.5 },
];

const A_BASS: MelodyNote[] = [
  { note: 'C4', duration: 0.5 }, { note: 'G4', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G4', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'D4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
];

// A' variation — same melody, different ending
const A_PRIME_PHRASE: MelodyNote[] = [
  // Bar 1-4: same as A
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'G4', duration: 0.5 },
  // Bar 5-6: build up
  { note: 'C5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'A5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'C5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  // Bar 7-8: triumphant resolution
  { note: 'G5', duration: 0.375 }, { note: 'A5', duration: 0.125 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.5 },
];

// SECTION B — contrasting section, more melodic/flowing (~24s)
const B_PHRASE: MelodyNote[] = [
  // Bar 1-2: legato flowing melody in F major feel
  { note: 'F5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'C5', duration: 0.5 }, { note: 'A4', duration: 0.5 },
  // Bar 3-4
  { note: 'Bb4', duration: 0.5 }, { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'F5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
  // Bar 5-6: reaching higher
  { note: 'G5', duration: 0.5 }, { note: 'F5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 }, { note: 'F5', duration: 0.5 },
  // Bar 7-8: gentle descent back to C
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
];

const B_BASS: MelodyNote[] = [
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'Bb3', duration: 0.5 }, { note: 'F3', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'Ab3', duration: 0.5 }, { note: 'Eb4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
];

// SECTION C — bridge / development, more adventurous (~24s)
const C_PHRASE: MelodyNote[] = [
  // Syncopated, more playful rhythm
  // Bar 1-2
  { note: 'G4', duration: 0.125 }, { note: 'A4', duration: 0.125 }, { note: 'C5', duration: 0.25 },
  { note: 'E5', duration: 0.5 },
  { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.5 },
  // Bar 3-4
  { note: 'A5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  // Bar 5-6: call and response
  { note: 'A5', duration: 0.375 }, { note: 'R', duration: 0.125 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'F5', duration: 0.375 }, { note: 'R', duration: 0.125 },
  { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  // Bar 7-8: building back to A
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.5 },
  { note: 'E5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.5 },
];

const C_BASS: MelodyNote[] = [
  { note: 'C4', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'D4', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
  { note: 'D4', duration: 0.5 }, { note: 'A3', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'D4', duration: 0.5 },
  { note: 'G3', duration: 0.5 }, { note: 'C4', duration: 0.5 },
];

// A'' final variation — same as A but with slight embellishments
const A_DOUBLE_PRIME: MelodyNote[] = [
  // Bar 1-2: opening with grace notes
  { note: 'G5', duration: 0.125 }, { note: 'E5', duration: 0.125 }, { note: 'D5', duration: 0.125 }, { note: 'C5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.5 },
  // Bar 3-4
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.125 }, { note: 'E5', duration: 0.125 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'G4', duration: 0.5 },
  // Bar 5-6: soaring variation
  { note: 'C5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.125 }, { note: 'A5', duration: 0.125 }, { note: 'G5', duration: 0.25 },
  { note: 'E5', duration: 0.375 }, { note: 'D5', duration: 0.125 },
  { note: 'C5', duration: 0.5 },
  // Bar 7-8: final resolution with flourish
  { note: 'D5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'A5', duration: 0.25 },
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.125 }, { note: 'D5', duration: 0.125 },
  { note: 'C5', duration: 0.5 },
];

// OUTRO — winds down back to intro feel for crossfade (~8s)
const OUTRO_MELODY: MelodyNote[] = [
  { note: 'E5', duration: 0.5 }, { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'G5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'R', duration: 0.5 },
  { note: 'C5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
  { note: 'G5', duration: 0.5 }, { note: 'E5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
];

const OUTRO_BASS: MelodyNote[] = [
  { note: 'C3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'A3', duration: 1.0 }, { note: 'F3', duration: 1.0 },
  { note: 'C3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'F3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
];

// TRANSITION phrases — short linking passages between sections (~4s each)
const TRANSITION_1: MelodyNote[] = [
  // Ascending run into next section
  { note: 'C5', duration: 0.25 }, { note: 'D5', duration: 0.25 },
  { note: 'E5', duration: 0.25 }, { note: 'G5', duration: 0.25 },
  { note: 'A5', duration: 0.5 }, { note: 'G5', duration: 0.5 },
  { note: 'E5', duration: 0.5 }, { note: 'R', duration: 0.5 },
  { note: 'D5', duration: 0.75 }, { note: 'R', duration: 0.25 },
];

const TRANSITION_1_BASS: MelodyNote[] = [
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'A3', duration: 0.5 }, { note: 'E4', duration: 0.5 },
  { note: 'F3', duration: 0.5 }, { note: 'G3', duration: 0.5 },
  { note: 'C4', duration: 0.5 }, { note: 'G3', duration: 0.5 },
];

const TRANSITION_2: MelodyNote[] = [
  // Descending, calming
  { note: 'G5', duration: 0.25 }, { note: 'E5', duration: 0.25 },
  { note: 'D5', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'A4', duration: 0.5 }, { note: 'R', duration: 0.25 }, { note: 'C5', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
  { note: 'R', duration: 1.0 },
];

const TRANSITION_2_BASS: MelodyNote[] = [
  { note: 'G3', duration: 0.5 }, { note: 'F3', duration: 0.5 },
  { note: 'E3', duration: 0.5 }, { note: 'D3', duration: 0.5 },
  { note: 'C3', duration: 1.0 },
  { note: 'G3', duration: 0.5 }, { note: 'C3', duration: 0.5 },
];

// D SECTION — dreamy/contemplative, provides contrast before final return (~8s)
const D_PHRASE: MelodyNote[] = [
  { note: 'E5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'C5', duration: 0.5 },
  { note: 'A4', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'G4', duration: 0.5 }, { note: 'A4', duration: 0.5 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'E5', duration: 0.5 }, { note: 'D5', duration: 0.5 },
  { note: 'C5', duration: 0.75 }, { note: 'R', duration: 0.25 },
  { note: 'D5', duration: 0.5 }, { note: 'E5', duration: 0.5 },
];

const D_BASS: MelodyNote[] = [
  { note: 'A3', duration: 1.0 }, { note: 'E3', duration: 1.0 },
  { note: 'F3', duration: 1.0 }, { note: 'C3', duration: 1.0 },
  { note: 'A3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
  { note: 'F3', duration: 1.0 }, { note: 'G3', duration: 1.0 },
];

// Full arrangement: ~180s (3 minutes)
// Intro(8) → A(6.5) → A(6.5) → T1(4) → B(6) → B(6) → A'(6.5) → T2(4) →
// C(6) → C(6) → T1(4) → A''(6.5) → D(8) → D(8) → T2(4) →
// B(6) → A(6.5) → A'(6.5) → T1(4) → C(6) → A''(6.5) →
// D(8) → B(6) → A(6.5) → Outro(8)
// Total: ~3 minutes (sections are 8s, transitions 4s)
export const FULL_MELODY: MelodyNote[] = [
  ...INTRO_MELODY,          // 8s
  ...A_PHRASE,               // 6.5s
  ...A_PHRASE,               // 6.5s (repeat for familiarity)
  ...TRANSITION_1,           // 4s
  ...B_PHRASE,               // 6s
  ...B_PHRASE,               // 6s (repeat)
  ...A_PRIME_PHRASE,          // 6.5s
  ...TRANSITION_2,           // 4s
  ...C_PHRASE,               // 6s
  ...C_PHRASE,               // 6s (repeat)
  ...TRANSITION_1,           // 4s
  ...A_DOUBLE_PRIME,          // 6.5s
  ...D_PHRASE,               // 8s
  ...D_PHRASE,               // 8s (repeat - dreamy section lingers)
  ...TRANSITION_2,           // 4s
  ...B_PHRASE,               // 6s
  ...A_PHRASE,               // 6.5s
  ...A_PRIME_PHRASE,          // 6.5s
  ...TRANSITION_1,           // 4s
  ...C_PHRASE,               // 6s
  ...A_DOUBLE_PRIME,          // 6.5s
  ...D_PHRASE,               // 8s
  ...B_PHRASE,               // 6s (final B before home stretch)
  ...A_PHRASE,               // 6.5s (return home)
  ...OUTRO_MELODY,           // 8s
];

export const FULL_BASS: MelodyNote[] = [
  ...INTRO_BASS,
  ...A_BASS,
  ...A_BASS,
  ...TRANSITION_1_BASS,
  ...B_BASS,
  ...B_BASS,
  ...A_BASS,
  ...TRANSITION_2_BASS,
  ...C_BASS,
  ...C_BASS,
  ...TRANSITION_1_BASS,
  ...A_BASS,
  ...D_BASS,
  ...D_BASS,
  ...TRANSITION_2_BASS,
  ...B_BASS,
  ...A_BASS,
  ...A_BASS,
  ...TRANSITION_1_BASS,
  ...C_BASS,
  ...A_BASS,
  ...D_BASS,
  ...B_BASS,
  ...A_BASS,
  ...OUTRO_BASS,
];

export function totalDuration(notes: readonly MelodyNote[]): number {
  return notes.reduce((sum, n) => sum + n.duration, 0);
}
