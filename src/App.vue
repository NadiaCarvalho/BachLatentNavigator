<script setup>
import { ref, computed } from 'vue';

// --- IMPORTS ---
import PhraseSelector from './components/PhraseSelector.vue';
import ScoreComparison from './components/ScoreComparison.vue';
import LatentNavigator from './components/LatentNavigator.vue';
import StrategyControls from './components/StrategyControls.vue';

import { substitutePhrase, setChordDict, getChordById } from './logic/latentStrategies.js'; 
import { playPhrase, stopPlayback, startAudioContext } from './logic/audioPlayback.js';

// --- DATA & DICTIONARY SETUP ---
// NOTE: Ensure your 45MB JSON file is in this path and structured correctly.
import latentJson from './data/chords_bach_short.json'; 
const chordDict = latentJson.chords; 
setChordDict(chordDict); 

// Example phrases to populate the PhraseSelector (using chord IDs from the data)
const demoPhrases = [
  // These sequences mimic the three-chord sequences used in the paper's figures
  { id: 'bwv184-1', name: 'BWV 184.5 Cadence (vi-V-I)', chordIds: ["5838", "4524", "3823", "5833", "1787"] }, // Example V-vi-V (index 1 to 3) or vi-V-I (index 0 to 2)
  { id: 'bwv311-1', name: 'BWV 311 Half Cadence (i-V)', chordIds: ["1592", "1798", "5652", "1794", "1645"] },
  { id: 'short-test', name: 'A-B-C Test (3-Chord)', chordIds: ["5838", "4524", "1787"] },
];

// --- STATE MANAGEMENT ---
const currentPhrase = ref(demoPhrases[2]); 
const originalPhrase = ref(currentPhrase.value.chordIds); 
// Default selection is the middle chord B (index 2 in a 5-chord array, index 1 in a 3-chord array)
const selectedChordIndices = ref([2]); 

// Strategy controls state
const strategy = ref('knn');
const k = ref(5); 

// Ref to hold the visualization and original chord details
const currentSubstitutionDetails = ref({
    strategy: strategy.value,
    originalA: null, 
    originalB: null, 
    originalC: null,
    substitutedChordId: null,
    substitutedChord: null,
    geometricPoints: [], 
    kNeighbors: [] 
});


// --- CORE COMPUTED LOGIC ---

// Computes the generated phrase and updates visualization details
const generatedPhrase = computed(() => {
  const { generatedPhraseIds, substitutionDetails } = substitutePhrase(
    originalPhrase.value,
    selectedChordIndices.value,
    strategy.value,
    { k: k.value }
  );

  // Update the visualization details ref with the new results
  currentSubstitutionDetails.value = {
    ...substitutionDetails,
    // Look up the full chord object for the visualization
    substitutedChord: chordDict.find(c => c.id === substitutionDetails.substitutedChordId)
  };

  return generatedPhraseIds;
});


// Prepare coordinates (A, B, C objects) for LatentNavigator prop
const originalPhraseCoords = computed(() => {
    // Only return the three chords A, B, C involved in the substitution
    return [
        currentSubstitutionDetails.value.originalA,
        currentSubstitutionDetails.value.originalB,
        currentSubstitutionDetails.value.originalC,
    ].filter(coord => coord); 
});


// --- EVENT HANDLERS ---

function handlePhraseUpdate(newPhraseIds) {
  originalPhrase.value = newPhraseIds;
  // Reset selection to the middle chord
  selectedChordIndices.value = [Math.floor(newPhraseIds.length / 2)]; 
}

function toggleChordSelection(index) {
  // Enforce selecting only one chord (the target B) for the A-B-C experiment
  if (selectedChordIndices.value[0] === index) {
    selectedChordIndices.value = [];
  } else {
    selectedChordIndices.value = [index];
  }
}

function handlePlay(type) {
  // Call startAudioContext() on user interaction
  startAudioContext(); 
  
  // Determine which phrase to play
  const phraseToPlay = type === 'original' ? originalPhrase.value : generatedPhrase.value;
  
  // Pass the phrase IDs and the lookup function to the playback module
  playPhrase(phraseToPlay, getChordById);
}

function handleStop() {
  stopPlayback();
}
</script>

<template>
  <div id="app" class="app-container">
    <h1>🎶 Bach Chorale Latent Space Navigator</h1>
    
    <div class="control-row">
      <PhraseSelector 
        :phrases="demoPhrases"
        @update:phrase="handlePhraseUpdate"
      />
      <StrategyControls 
        v-model:strategy="strategy"
        v-model:k="k"
      />
      
      <div class="audio-controls">
          <button @click="handlePlay('original')" class="btn-play-original">
              ▶️ Play Original
          </button>
          <button @click="handlePlay('generated')" class="btn-play-generated">
              ▶️ Play Generated
          </button>
          <button @click="handleStop" class="btn-stop">
              ⏹ Stop
          </button>
      </div>
    </div>

    <ScoreComparison
      :original="originalPhrase"
      :generated="generatedPhrase"
      :selected-indices="selectedChordIndices"
      @select-chord="toggleChordSelection"
    />

    <LatentNavigator
      :all-latents="chordDict"
      :original-phrase-coords="originalPhraseCoords"
      :substitution-details="currentSubstitutionDetails"
    />
  </div>
</template>

<style>
/* Basic styles */
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: sans-serif;
}
.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.audio-controls button {
    padding: 8px 12px;
    margin-left: 10px;
    cursor: pointer;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #fff;
    transition: background-color 0.2s;
}
.audio-controls button:hover {
    background-color: #eee;
}
</style>