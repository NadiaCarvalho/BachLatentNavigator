<script setup>
import { ref, watch, isRef } from 'vue';

// --- IMPORTS ---
import { setNextLatentChord  } from './../logic/audioPlayback.js'; // startRhythmicTransport

const blendWeight = ref(0.7); // 0 = Pure Proximity, 1 = Pure Direction
let lastLatentPoint = null;

function handleInteraction(event) {
    // 1. Get 2D Coordinates from Mouse/Touch
    const coords = getCanvasCoords(event);
    
    // 2. Project to 256D (using your PCA/UMAP matrix)
    const currentTarget = project2DTo256D(coords.x, coords.y);

    // 3. Calculate the Motion Vector (Velocity)
    let motionVector = [/* zeros */];
    if (lastLatentPoint) {
        motionVector = currentTarget.map((val, i) => val - lastLatentPoint[i]);
    }

    // 4. Find Neighbors (k-NN)
    const neighbors = findKNearest(currentTarget, 10);

    // 5. Filter by Angular Alignment
    const bestChord = neighbors.reduce((best, curr) => {
        const neighborVec = curr.latent.map((val, i) => val - currentTarget[i]);
        const alignment = calculateCosineSimilarity(motionVector, neighborVec);
        
        // Blend score: Distance vs Direction
        const score = (1 - blendWeight.value) * curr.distance + (blendWeight.value * (1 - alignment));
        return score < best.score ? { chord: curr, score } : best;
    }, { chord: null, score: Infinity });

    // 6. Update Audio Buffer
    setNextLatentChord(bestChord.chord);
    lastLatentPoint = currentTarget;
}
</script>

<template>
  <div id="app-latent-instrument" class="app-container">
    <h1>🎶 Bach Chorale Latent Instrument</h1>

    <div class="control-row">

    </div>
    
    <p>This is where we will implement the Canvas and Angular Displacement logic.</p>
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