// src/logic/audioPlayback.js

import * as Tone from 'tone';

// Tone.js Synth Setup: Using a simple PolySynth with a clear, organ-like tone 
// (appropriate for Bach chorales) for polyphonic playback.
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "sine" 
  },
  envelope: {
    attack: 0.05,
    decay: 0.2,
    sustain: 0.5,
    release: 1
  }
}).toDestination();

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
    
    const notes = chordData.pitchclass; // e.g., ["C4", "E4", "G4"]
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