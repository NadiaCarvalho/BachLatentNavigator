<script setup>
import PhraseScore from './PhraseScore.vue'

const props = defineProps({
  original: { type: Array, required: true },
  generated: { type: Array, required: true },
  selectedIndices: { type: Array, default: () => [] }
})

const emit = defineEmits(['select-chord'])

function handleChordSelection(index) {
  emit('select-chord', index)
}
</script>

<template>
  <div class="score-comparison-container">
    <div class="score-column">
      <h3 class="score-title">Original Bach Phrase (A, B, C...)</h3>
      <PhraseScore
        :phrase="original"
        :selected-indices="selectedIndices"
        :readonly="false"
        @select-chord="handleChordSelection"
      />
    </div>

    <div class="score-column">
      <h3 class="score-title">Generated Phrase (A, B', C...)</h3>
      <PhraseScore
        :phrase="generated"
        :selected-indices="[]"
        :readonly="true"
      />
    </div>
  </div>
</template>

<style scoped>
.score-comparison-container {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  border-bottom: 2px solid #ccc;
  padding-bottom: 20px;
}

.score-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-title {
  margin-top: 0;
  color: #333;
  font-family: sans-serif;
}
</style>