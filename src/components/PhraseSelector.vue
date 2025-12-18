<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  // The list of demo phrases defined in App.vue
  phrases: {
    type: Array,
    required: true,
    default: () => []
  },
  // The currently active phrase (to keep the dropdown in sync)
  modelValue: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'update:phrase']);

// Internal state for the select element
const selectedPhraseId = ref(props.phrases[0]?.id || '');

// When the user changes the selection in the dropdown
function handleChange(event) {
  const phraseId = event.target.value;
  const foundPhrase = props.phrases.find(p => p.id === phraseId);
  
  if (foundPhrase) {
    // Emit the whole phrase object for the parent's state
    emit('update:modelValue', foundPhrase);
    // Emit just the chord IDs for the substitution logic
    emit('update:phrase', foundPhrase.chordIds);
  }
}

// Watch for external changes to the active phrase to keep the dropdown synced
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    selectedPhraseId.value = newVal.id;
  }
}, { immediate: true });
</script>

<template>
  <div class="phrase-selector-container">
    <label for="phrase-select" class="selector-label">
      Bach Chorale Phrase:
    </label>
    
    <div class="select-wrapper">
      <select 
        id="phrase-select" 
        v-model="selectedPhraseId" 
        @change="handleChange"
        class="custom-select"
      >
        <option v-for="phrase in phrases" :key="phrase.id" :value="phrase.id">
          {{ phrase.name }} ({{ phrase.chordIds.length }} Chords)
        </option>
      </select>
      <span class="focus"></span>
    </div>
  </div>
</template>

<style scoped>
.phrase-selector-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 250px;
}

.selector-label {
  font-size: 0.9rem;
  font-weight: bold;
  color: #444;
}

/* Custom Select Styling */
.custom-select {
  appearance: none;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.95rem;
  cursor: pointer;
  width: 100%;
  outline: none;
  transition: border-color 0.2s;
}

.custom-select:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.select-wrapper {
  position: relative;
}

/* Arrow indicator */
.select-wrapper::after {
  content: "▼";
  font-size: 0.7rem;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  pointer-events: none;
}

.phrase-selector-container:hover .custom-select {
  border-color: #888;
}
</style>