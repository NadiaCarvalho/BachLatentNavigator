<script setup>
import { ref } from 'vue';
import PhraseNavigator from './cviews/PhraseNavigatior.vue';
import LatentInstrument from './cviews/LatentInstrument.vue';

const currentMode = ref('instrument'); // Toggle state
</script>

<template>
  <div class="main-container">
    <header class="app-header">
      <div class="mode-tabs">
        <button 
          @click="currentMode = 'navigator'" 
          :class="{ active: currentMode === 'navigator' }"
        >
          🔍 Phrase Navigator
        </button>
        <button 
          @click="currentMode = 'instrument'" 
          :class="{ active: currentMode === 'instrument' }"
        >
          🎻 Gestural Instrument
        </button>
      </div>
    </header>

    <main class="content-area">
      <PhraseNavigator v-if="currentMode === 'navigator'" />
      <LatentInstrument v-else />
    </main>
  </div>
</template>

<style scoped>
.app-header {
  background: #2c3e50;
  padding: 1rem;
  display: flex;
  justify-content: center;
}
.mode-tabs button {
  padding: 10px 20px;
  margin: 0 10px;
  cursor: pointer;
  border: none;
  background: #34495e;
  color: white;
  border-radius: 4px;
}
.mode-tabs button.active {
  background: #42b983;
}
.content-area {
  padding: 20px;
}
</style>