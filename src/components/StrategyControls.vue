<script setup>
import { computed } from 'vue';

// Define the properties expected by the component (using v-model for two-way binding)
const props = defineProps({
  // v-model:strategy binding
  strategy: {
    type: String,
    required: true
  },
  // v-model:k binding
  k: {
    type: Number,
    required: true
  }
});

// Define the events this component can emit to update the parent state (App.vue)
const emit = defineEmits(['update:strategy', 'update:k']);

// Computed property for strategy (handles two-way binding for the select input)
const selectedStrategy = computed({
  get() {
    return props.strategy;
  },
  set(value) {
    emit('update:strategy', value);
  }
});

// Computed property for k (handles two-way binding for the range input)
const kValue = computed({
  get() {
    // Ensure k is always treated as a number for input type="range"
    return Number(props.k);
  },
  set(value) {
    // Emit the updated value as a Number
    emit('update:k', Number(value));
  }
});

// Determines if the k slider should be visible (only relevant for k-NN strategies)
const showKControl = computed(() => {
  return props.strategy === 'knn' || props.strategy === 'angular';
});
</script>

<template>
  <div class="strategy-controls">
    
    <div class="control-group">
      <label for="strategy-select" class="control-label">Sampling Strategy:</label>
      <select id="strategy-select" v-model="selectedStrategy" class="control-input">
        <option value="knn">k-Nearest Neighbors (k-NN)</option>
        <option value="angular">k-NN + Angular Alignment</option>
        <option value="linear">Traditional Linear Interpolation</option>
      </select>
    </div>

    <div v-if="showKControl" class="control-group k-control">
      <label for="k-slider" class="control-label">Number of Neighbors (k):</label>
      <input 
        id="k-slider" 
        type="range" 
        v-model="kValue" 
        min="1" 
        max="20" 
        step="1" 
        class="control-slider"
      />
      <span class="k-display">{{ kValue }}</span>
      <p class="description">
        $k$ is the number of neighbors screened around B for substitution.
      </p>
    </div>

    <div v-else class="control-group description">
      <p>Linear Interpolation does not require the parameter $k$.</p>
      <p>It samples the chord nearest to the midpoint of A and C.</p>
    </div>

  </div>
</template>

<style scoped>
.strategy-controls {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 10px;
  background-color: #f4f4f9;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.control-group {
  display: flex;
  flex-direction: column;
}

.control-label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.control-input,
.control-slider {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.k-control {
  min-width: 250px;
}

.k-slider {
  width: 100%;
  margin-top: 5px;
}

.k-display {
  font-weight: bold;
  color: #007bff;
  margin-top: 5px;
}

.description {
  font-size: 0.85em;
  color: #666;
  margin-top: 5px;
  line-height: 1.3;
}
</style>