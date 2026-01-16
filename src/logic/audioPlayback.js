// src/logic/audioPlayback.js

import * as Tone from 'tone';

/**
 * Converts a MIDI pitch class string (e.g., "60-64-67") 
 * into an array of Tone.js note names (e.g., ["C4", "E4", "G4"]).
 */
function midiToNoteNames(pitchclassString) {
  if (!pitchclassString) return [];
  
  // Split string "60-64-67" into [60, 64, 67]
  const midiNotes = pitchclassString.split('-').map(Number);
  
  const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  return midiNotes.map(midi => {
    const noteName = PITCH_CLASSES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${noteName}${octave}`;
  });
}

const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "fatsawtooth", // 'Fat' adds multiple detuned voices
    count: 3,            // Number of detuned oscillators
    spread: 30           // How much they are detuned from each other
  },
  envelope: {
    attack: 0.1,    // Organs have a slightly slower build-up
    decay: 0.3,
    sustain: 1,     // Organs sustain at full volume as long as the key is held
    release: 0.8    // A bit of "ring" after the key is released
  }
}).toDestination();

// Add a Filter to remove the "buzz" and make it "woody/mellow"
const filter = new Tone.Filter(1500, "lowpass").toDestination();
synth.connect(filter);

// Set volume lower to account for the richer harmonic content
synth.volume.value = -18;

// Constants for timing
const CHORD_DURATION = '0.5s'; // How long each chord sounds
const CHORD_INTERVAL = '0.5s'; // Time between the start of successive chords

/**
 * Initializes Tone.js audio context. 
 * This must be called from a user-initiated event (like a button click)
 * because browsers block audio until user interaction.
 */
export async function startAudioContext() {
  if (Tone.context.state !== 'running') {
    // Check if the context is suspended and start it
    await Tone.start();
    console.log('Tone.js audio context started.');
  }
}

/**
 * Plays a sequence of chords.
 * @param {Array<string>} phraseIds - The list of chord IDs to play.
 * @param {Function} getChordById - Function to retrieve chord data (including pitchclass) by ID.
 */
export function playPhrase(phraseIds, getChordById) {
  // Ensure the audio context is running (although handled by the button click wrapper, 
  // it's a good safety check)
  startAudioContext();
  
  // Stop any previous playback and clear the transport schedule
  Tone.Transport.stop();
  Tone.Transport.cancel();
  
  // Schedule the sequence
  phraseIds.forEach((id, index) => {
    const chordData = getChordById(id);
    
    // Check for valid chord data
    if (!chordData || !chordData.pitchclass || chordData.pitchclass.length === 0) {
      console.warn(`Skipping missing or empty chord ID: ${id}`);
      return;
    }
    
    const notes = midiToNoteNames(chordData.pitchclass);  // e.g., ["C4", "E4", "G4"]
    // Calculate the start time for this chord
    const time = index * Tone.Time(CHORD_INTERVAL).toSeconds();
    
    // Schedule the event
    Tone.Transport.schedule(time => {
      // Trigger the notes
      synth.triggerAttackRelease(notes, CHORD_DURATION, time);
    }, time);
  });
  
  // Start the transport scheduler
  Tone.Transport.start();
}

/**
 * Stops any currently playing audio.
 */
export function stopPlayback() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
}

/**
 * 
 * @param {*} chord 
 */
export function setNextLatentChord(chord) {
  queuedChord = chord; // The mouse updates this constantly
}

/**
 * 
 */
export function initializeInstrumentTransport() {
  Tone.Transport.bpm.value = 80;
  
  // The "Tactus": Trigger the most recently sampled chord every quarter note
  Tone.Transport.scheduleRepeat((time) => {
      if (queuedChord) {
          const notes = midiToFrequencies(queuedChord.pitchclass);
          synth.triggerAttackRelease(notes, "4n", time);
      }
  }, "4n");
  
  Tone.Transport.start();
}