<script setup>
import { ref, onMounted, watch, computed } from 'vue';

const props = defineProps({
  allLatents: { type: Array, required: true },
  originalPhraseCoords: { type: Array, required: true },
  substitutionDetails: { type: Object, required: true },
});

const canvasRef = ref(null);
const width = 600;
const height = 400;
const padding = 0.1; // 10% padding so points aren't on the edge

// --- Computed Boundaries ---
const bounds = computed(() => {
  // 1. Create a safe array of points to focus on
  const activePoints = [];

  // Only push if the prop exists and is an array
  if (Array.isArray(props.originalPhraseCoords)) {
    activePoints.push(...props.originalPhraseCoords);
  }

  // Add the substitution if it exists
  if (props.substitutionDetails?.substitutedChord) {
    activePoints.push(props.substitutionDetails.substitutedChord);
  }

  // 2. Decide which points to use for the zoom boundaries
  // If we have active points, zoom to them. Otherwise, show all latents.
  const pointsToMeasure = activePoints.length > 0 ? activePoints : props.allLatents;

  // 3. Final safety check: if everything is empty, return default view
  if (!pointsToMeasure || pointsToMeasure.length === 0) {
    return { xMin: -15, xMax: -5, yMin: 14, yMax: 20 }; // Default PCA range
  }

  const xs = pointsToMeasure.map(p => p.z2D[0]);
  const ys = pointsToMeasure.map(p => p.z2D[1]);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const xRange = Math.max(xMax - xMin, 1); // Ensure range isn't zero
  const yRange = Math.max(yMax - yMin, 1);

  const zoomPadding = 0.4; // 40% padding for a nice "zoomed" feel

  return {
    xMin: xMin - (xRange * zoomPadding),
    xMax: xMax + (xRange * zoomPadding),
    yMin: yMin - (yRange * zoomPadding),
    yMax: yMax + (yRange * zoomPadding)
  };
});

// --- Dynamic Scaling Functions ---
// Use bounds.value instead of constants
const scaleX = (val) => {
  const { xMin, xMax } = bounds.value;
  return ((val - xMin) / (xMax - xMin)) * width;
};

const scaleY = (val) => {
  const { yMin, yMax } = bounds.value;
  return height - ((val - yMin) / (yMax - yMin)) * height;
};

// --- Drawing Utilities ---
function drawPoint(ctx, x, y, color, radius, label = '', isHexagon = false) {
  ctx.beginPath();
  if (isHexagon) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
  } else {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.stroke();

  if (label) {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(label, x + 8, y + 4);
  }
}

function drawLine(ctx, x1, y1, x2, y2, color, dashed = false, isArrow = false) {
  ctx.beginPath();
  if (dashed) ctx.setLineDash([5, 5]);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = dashed ? 1 : 2;
  ctx.stroke();
  ctx.setLineDash([]);

  if (isArrow) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(angle - Math.PI / 6), y2 - 10 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 10 * Math.cos(angle + Math.PI / 6), y2 - 10 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// --- Main Drawing Function ---
function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const { xMin, xMax, yMin, yMax } = bounds.value;
  ctx.clearRect(0, 0, width, height);

  // Draw Grid (Adjusted for zoom)
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  // (Grid logic remains same, it will scale with scaleX/Y)

  // 2. Draw background points (Only if they are within bounds)
  props.allLatents.forEach(chord => {
    const x = chord.z2D[0];
    const y = chord.z2D[1];
    if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
      drawPoint(ctx, scaleX(x), scaleY(y), '#b0b0ff33', 2);
    }
  });

  if (!props.originalPhraseCoords || props.originalPhraseCoords.length < 3) {
    console.log("Waiting for coordinates...");
    return;
  };
  const [A, B, C] = props.originalPhraseCoords;
  const details = props.substitutionDetails;
  const BPrime = details.substitutedChord;

  if (!A || !B || !C) return;

  const [ax, ay] = [scaleX(A.z2D[0]), scaleY(A.z2D[1])];
  const [bx, by] = [scaleX(B.z2D[0]), scaleY(B.z2D[1])];
  const [cx, cy] = [scaleX(C.z2D[0]), scaleY(C.z2D[1])];

  // 3. Strategy Specific Overlays
  if (details.strategy === 'linear') {
    // Draw path A -> C and the geometric midpoint
    drawLine(ctx, ax, ay, cx, cy, '#333');
    const midX = (ax + cx) / 2;
    const midY = (ay + cy) / 2;
    drawPoint(ctx, midX, midY, '#28a745', 6, 'Midpoint', true);
  }

  else if (details.strategy === 'knn' || details.strategy === 'angular') {
    // Draw k-NN search radius
    const neighbors = details.kNeighbors || [];
    if (neighbors.length > 0) {
      const lastNeighbor = neighbors[neighbors.length - 1];
      const radius = Math.sqrt(
        Math.pow(scaleX(lastNeighbor.z2D[0]) - bx, 2) +
        Math.pow(scaleY(lastNeighbor.z2D[1]) - by, 2)
      );
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#ff000044';
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (details.strategy === 'angular') {
      // Draw Vector AB and Alignment Vectors
      drawLine(ctx, ax, ay, bx, by, '#28a745', false, true); // Target Vector
      neighbors.forEach(n => {
        drawLine(ctx, ax, ay, scaleX(n.z2D[0]), scaleY(n.z2D[1]), '#90ee9088', true);
      });
    }
  }

  // 4. Draw Core Chords
  drawPoint(ctx, ax, ay, '#6f42c1', 6, 'A');
  drawPoint(ctx, cx, cy, '#6f42c1', 6, 'C');
  drawPoint(ctx, bx, by, '#ffc107', 6, 'B');

  if (BPrime && BPrime.id !== B.id) {
    const label = details.strategy === 'linear' ? "B'" : "B''";
    drawPoint(ctx, scaleX(BPrime.z2D[0]), scaleY(BPrime.z2D[1]), '#dc3545', 7, label);
  }
}

watch([() => props.allLatents, () => props.substitutionDetails], draw, { deep: true });
watch(() => props.originalPhraseCoords, (newVal) => {
  if (newVal && newVal.length > 0) {
    draw(); // Redraw whenever the parent sends new coordinates
  }
}, { deep: true });
onMounted(draw);
</script>

<template>
  <div class="latent-navigator">
    <pre style="font-size: 10px; color: red;">
      Coords Received: {{ originalPhraseCoords ? 'YES' : 'UNDEFINED' }}
      Length: {{ originalPhraseCoords?.length }}
    </pre>
    <div class="canvas-header">
      <h3>Latent Space Visualization (PCA Projection)</h3>
      <div class="legend">
        <span class="dot purple"></span> A, C
        <span class="dot yellow"></span> B (Target)
        <span class="dot red"></span> Substituted
        <span class="dot green"></span> Vector/Midpoint
      </div>
    </div>
    <div class="canvas-wrapper">
      <canvas ref="canvasRef" :width="width" :height="height"></canvas>
    </div>
  </div>
</template>

<style scoped>
.latent-navigator {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.canvas-wrapper {
  background: #fafafa;
  border: 1px solid #eee;
  display: flex;
  justify-content: center;
}

.legend {
  font-size: 0.8rem;
  display: flex;
  gap: 10px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid #333;
}

.purple {
  background: #6f42c1;
}

.yellow {
  background: #ffc107;
}

.red {
  background: #dc3545;
}

.green {
  background: #28a745;
}
</style>