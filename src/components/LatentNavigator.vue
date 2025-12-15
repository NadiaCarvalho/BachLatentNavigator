<script setup>
import { computed, ref, onMounted, watch } from 'vue';

const props = defineProps({
  // The entire dataset of chords (contains z, z2D, id, etc.)
  allLatents: { type: Array, required: true },
  // The three original chord objects: [A, B, C]
  originalPhraseCoords: { type: Array, required: true },
  // Details about the substitution result and path geometry
  substitutionDetails: { type: Object, required: true },
  
  // Hardcoded PCA plot boundaries from the paper's figures (approximate)
  xMin: { type: Number, default: -12.5 }, 
  xMax: { type: Number, default: -7 },
  yMin: { type: Number, default: 15.5 },
  yMax: { type: Number, default: 18.5 }
});

const canvasRef = ref(null);
const width = 600;
const height = 400;

// --- Coordinate Scaling Logic ---

// Computed map function to convert latent coordinates (z2D) to canvas pixels (x)
const scaleX = computed(() => {
  const rangeX = props.xMax - props.xMin;
  return (x2D) => ((x2D - props.xMin) / rangeX) * width;
});

// Computed map function to convert latent coordinates (z2D) to canvas pixels (y)
const scaleY = computed(() => {
  const rangeY = props.yMax - props.yMin;
  // Canvas Y is inverted (0 at top)
  return (y2D) => height - ((y2D - props.yMin) / rangeY) * height;
});

// Watch for data changes to redraw the visualization
watch([() => props.substitutionDetails, () => props.originalPhraseCoords], () => {
  drawCanvas();
}, { deep: true });

onMounted(() => {
  drawCanvas();
});


// --- Drawing Utility Functions ---

function drawPoint(ctx, x, y, color, radius, style = 'circle') {
  ctx.beginPath();
  if (style === 'hexagon') {
    // Simplified hexagon for the midpoint (Fig 1)
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    ctx.closePath();
  } else {
    // Default circle
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'black';
  ctx.stroke();
}

function drawLabeledPoint(ctx, x, y, color, radius, label, offset = 10) {
  // Draw the point (e.g., A, B, C)
  drawPoint(ctx, x, y, color, radius);
  
  // Draw text label (A, B, C, B', etc.)
  ctx.fillStyle = 'black';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(label, x + offset, y + 5);
}

function drawVector(ctx, startX, startY, endX, endY, color, width, isDashed = false) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    
    if (isDashed) {
        ctx.setLineDash([5, 5]);
    } else {
        ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset for safety
    
    // Draw simple arrowhead (optional, for angular alignment)
    if (width > 1) {
        const angle = Math.atan2(endY - startY, endX - startX);
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -5);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// --- Strategy Visualization Functions ---

// Visualization for Linear Interpolation (Fig. 1)
function drawLinearPath(ctx, A, C, interpolatedPoint) {
  const ax = scaleX.value(A.z2D[0]);
  const ay = scaleY.value(A.z2D[1]);
  const cx = scaleX.value(C.z2D[0]);
  const cy = scaleY.value(C.z2D[1]);
  
  // 1. Draw line segment A to C (Linear Interpolation Path)
  drawVector(ctx, ax, ay, cx, cy, 'black', 2);

  // 2. Draw Midpoint (Dark Green Hexagon)
  // CRITICAL: We can't project the high-D point accurately without the PCA model.
  // We approximate the visualization by projecting the high-D interpolated point's Z2D coords.
  
  // NOTE: 'interpolatedPoint' in substitutionDetails is the high-D vector. 
  // For simplicity, we use the midpoint of the 2D coordinates for the visualization.
  const midX = (ax + cx) / 2;
  const midY = (ay + cy) / 2;
  
  drawPoint(ctx, midX, midY, 'darkgreen', 7, 'hexagon');
}

// Visualization for k-NN and Angular Alignment (Fig. 2 & 3)
function drawKnnNeighbors(ctx, B, neighbors) {
  if (neighbors.length === 0) return;

  const Bx = scaleX.value(B.z2D[0]);
  const By = scaleY.value(B.z2D[1]);
  
  // Find the farthest neighbor in the set to determine the radius of the dotted circle
  let maxDistance = 0;
  neighbors.forEach(n => {
      const dx = scaleX.value(n.z2D[0]) - Bx;
      const dy = scaleY.value(n.z2D[1]) - By;
      maxDistance = Math.max(maxDistance, Math.sqrt(dx * dx + dy * dy));
  });

  // Draw the dotted red circle around B (Fig 2, 3)
  ctx.beginPath();
  ctx.arc(Bx, By, maxDistance + 5, 0, Math.PI * 2); // Added padding (+5)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]); // Reset line style
}

// Visualization for Angular Alignment (Fig. 3)
function drawAngularPath(ctx, A, B, neighbors) {
  const ax = scaleX.value(A.z2D[0]);
  const ay = scaleY.value(A.z2D[1]);
  const bx = scaleX.value(B.z2D[0]);
  const by = scaleY.value(B.z2D[1]);

  // 1. Draw original vector AB (dark green arrow)
  // This represents the direction we aim to align to.
  drawVector(ctx, ax, ay, bx, by, 'darkgreen', 3);

  // 2. Highlight k-Neighbors and draw vectors (light green arrows)
  neighbors.forEach(candidate => {
    const cx = scaleX.value(candidate.z2D[0]);
    const cy = scaleY.value(candidate.z2D[1]);
    
    // Draw candidate vector AC' (light green arrow)
    drawVector(ctx, ax, ay, cx, cy, '#90EE90', 1); // Light green
  });
  
  // Re-draw the dotted red circle over the vectors
  drawKnnNeighbors(ctx, B, neighbors); 
}


// --- Main Drawing Loop ---

function drawCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // 1. Setup and Clear
  ctx.clearRect(0, 0, width, height);
  drawGridAndLabels(ctx);

  // 2. Draw all discrete chords (Blue Circles)
  props.allLatents.forEach(chord => {
    if (chord.z2D) {
        const x = scaleX.value(chord.z2D[0]);
        const y = scaleY.value(chord.z2D[1]);
        drawPoint(ctx, x, y, 'mediumslateblue', 5); // Blue circles (Fig 1-3)
    }
  });

  // 3. Identify Key Chords
  const [A, B, C] = props.originalPhraseCoords;
  const BPrime = props.substitutionDetails.substitutedChord;
  const strategy = props.substitutionDetails.strategy;
  const neighbors = props.substitutionDetails.kNeighbors;

  let BPrimeLabel = (strategy === 'knn' || strategy === 'angular') ? "B''" : "B'";

  // 4. Draw Strategy-Specific Path/Area
  switch (strategy) {
    case 'linear':
      if (A && C) drawLinearPath(ctx, A, C, props.substitutionDetails.geometricPoints);
      break;
    case 'knn':
      if (B) drawKnnNeighbors(ctx, B, neighbors);
      break;
    case 'angular':
      if (A && B) drawAngularPath(ctx, A, B, neighbors);
      break;
  }
  
  // 5. Highlight Original and Substituted Chords (Drawn last to be on top)
  
  // Highlight A and C
  if (A && A.z2D) drawLabeledPoint(ctx, scaleX.value(A.z2D[0]), scaleY.value(A.z2D[1]), 'purple', 7, 'A');
  if (C && C.z2D) drawLabeledPoint(ctx, scaleX.value(C.z2D[0]), scaleY.value(C.z2D[1]), 'purple', 7, 'C');
  
  // Highlight original target B
  if (B && B.z2D) drawLabeledPoint(ctx, scaleX.value(B.z2D[0]), scaleY.value(B.z2D[1]), 'darkkhaki', 7, 'B', 15);
  
  // Highlight substituted chord B' / B''
  if (BPrime && BPrime.z2D) {
     drawLabeledPoint(ctx, scaleX.value(BPrime.z2D[0]), scaleY.value(BPrime.z2D[1]), 'red', 7, BPrimeLabel, 15);
  }
}


// Function to draw axes and grid lines
function drawGridAndLabels(ctx) {
    // Draw bounding box
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Draw grid lines (simplified)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    // Y-axis ticks
    for (let yVal = 16; yVal <= 18.5; yVal += 0.5) {
        const y = scaleY.value(yVal);
        drawVector(ctx, 0, y, width, y, '#ddd', 1);
        ctx.fillStyle = 'black';
        ctx.fillText(yVal.toFixed(1), 5, y - 2);
    }
    // X-axis ticks
    for (let xVal = -12; xVal <= -7; xVal += 1) {
        const x = scaleX.value(xVal);
        drawVector(ctx, x, 0, x, height, '#ddd', 1);
        ctx.fillStyle = 'black';
        ctx.fillText(xVal.toFixed(0), x + 5, height - 5);
    }
    
    // Axis Labels
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('PCA Dim. 1', width / 2, height - 15);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('PCA Dim. 2', 0, 0);
    ctx.restore();
}
</script>

<template>
  <div class="latent-navigator-container">
    <h3 class="navigator-title">Latent Space Navigator (2D PCA Projection)</h3>
    <canvas 
      ref="canvasRef" 
      :width="width" 
      :height="height" 
      style="border: 1px solid #ccc; background-color: white;"
    ></canvas>
    <div class="legend">
        <p>🔴 Substituted Chord (B' / B'') &nbsp; | &nbsp; 🟣 Original Chords (A, C) &nbsp; | &nbsp; 🟢 Midpoint (Linear) &nbsp; | &nbsp; 🟡 Original Target (B)</p>
    </div>
  </div>
</template>

<style scoped>
.latent-navigator-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #f8f8f8;
  border-radius: 6px;
  margin-top: 20px;
}
.navigator-title {
  margin-bottom: 10px;
  font-family: sans-serif;
}
.legend {
    margin-top: 10px;
    font-size: 0.9em;
    color: #555;
    text-align: center;
}
</style>