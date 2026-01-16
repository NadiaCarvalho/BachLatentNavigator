<script setup>
import { ref, watch, isRef, computed } from 'vue';

// --- IMPORTS ---
import PhraseSelector from './../components/PhraseSelector.vue';
import ScoreComparison from './../components/ScoreComparison.vue';
import LatentNavigator from './../components/LatentNavigator.vue';
import StrategyControls from './../components/StrategyControls.vue';

import { substitutePhrase, setChordDict, getChordById } from './../logic/latentStrategies.js';
import { playPhrase, stopPlayback, startAudioContext } from './../logic/audioPlayback.js';

// --- DATA & DICTIONARY SETUP ---
import latentJson from './../data/chords_bach_all.json';
const chordDict = latentJson.chords;
setChordDict(chordDict);

import demoPhrases from '../data/phrases.json';

function getCoordPhrase(phraseIds, selectedIndex) {
  // 1. Get raw array of IDs
  const ids = isRef(phraseIds) ? phraseIds.value : phraseIds;
  const index = isRef(selectedIndex) ? selectedIndex.value[0] : selectedIndex;

  if (!Array.isArray(ids) || index === undefined) return [];

  // 2. Define the window [index-1, index, index+1]
  const targetIndices = [index - 1, index, index[0] + 1];

  // 3. Map to coordinates, ensuring we handle "out of bounds" for start/end of phrase
  return targetIndices
    .map(idx => {
      // Check if the neighbor exists (e.g., index 0 has no index -1)
      const id = ids[idx];
      if (!id) return null; 
      
      return chordDict.find(c => c.id === id);
    })
    .filter(coord => !!coord); // Remove nulls if at the start or end of a phrase
}

// --- STATE MANAGEMENT ---
const currentPhrase = ref(demoPhrases[0]);
const originalPhrase = ref(currentPhrase.value.chordIds);
// Default selection is the middle chord B (index 2 in a 5-chord array, index 1 in a 3-chord array)
const selectedChordIndices = ref([2]);
const originalPhraseCoords = ref(getCoordPhrase(originalPhrase.value, selectedChordIndices.value));

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
const currentRhythms = computed(() => {
  // If currentPhrase exists and has rhythms, use them. 
  // Otherwise, create an array of "4n" (quarter notes) matching the phrase length.
  if (currentPhrase.value && currentPhrase.value.rhythms) {
    return currentPhrase.value.rhythms;
  }
  
  // Fallback: Default to all quarter notes if rhythms are missing
  const length = currentPhrase.value?.chordIds?.length || 0;
  return new Array(length).fill("4n");
});

const generatedPhrase = ref([]);

watch(
  [originalPhrase, selectedChordIndices, strategy, k],
  () => {
    const { generatedPhraseIds, substitutionDetails } = substitutePhrase(
      originalPhrase.value,
      selectedChordIndices.value,
      strategy.value,
      { k: k.value }
    );

    // 1. Update the generated phrase ref
    generatedPhrase.value = generatedPhraseIds;

    // 2. Update the details ref
    currentSubstitutionDetails.value = {
      ...substitutionDetails,
      substitutedChord: chordDict.find(c => c.id === substitutionDetails.substitutedChordId)
    };

    originalPhraseCoords.value = getCoordPhrase(originalPhrase.value, selectedChordIndices.value);
  },
  { immediate: true } // Run immediately on setup to populate initial values
);



// --- EVENT HANDLERS ---

function handlePhraseUpdate(newPhraseIds) {
  originalPhrase.value = newPhraseIds;
  selectedChordIndices.value = [Math.floor(newPhraseIds.length / 2)];   // Reset selection to the middle chord
}

function toggleChordSelection(index) {
  // Enforce selecting only one chord (the target B) for the A-B-C experiment
  if (selectedChordIndices.value[0] === index.index) {
    selectedChordIndices.value = [];
  } else {
    selectedChordIndices.value = [index.index];
  }
}

function handlePlay(type) {
  // Call startAudioContext() on user interaction
  startAudioContext();

  // Determine which phrase to play
  const phraseToPlay = type === 'original' ? originalPhrase.value : generatedPhrase.value;

  // Pass the phrase IDs and the lookup function to the playback module
  playPhrase(phraseToPlay, currentRhythms.value, getChordById);
}

function handleStop() {
  stopPlayback();
}
</script>

<template>
  <div id="app-phrase-navigator" class="app-container">
    <h1>🎶 Bach Chorale Latent Space Navigator</h1>

    <div class="control-row">
      <PhraseSelector :phrases="demoPhrases" v-model="currentPhrase" @update:phrase="handlePhraseUpdate" />
      <StrategyControls v-model:strategy="strategy" v-model:k="k" />

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

    <ScoreComparison :original="originalPhrase" :generated="generatedPhrase" :selected-indices="selectedChordIndices" :rhythms="currentRhythms"
      @select-chord="toggleChordSelection" />

    <LatentNavigator :all-latents="chordDict" :original-phrase-coords="originalPhraseCoords"
      :substitution-details="currentSubstitutionDetails" />
  </div>
</template>

<style>
/* Basic styles */
.app-container {
  /*max-width: 1200px;*/
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