<template>
  <div class="app">
    <aside class="sidebar">
      <h2>Latent Space</h2>
      <p>Click or drag to explore the latent space.</p>
      <div class="coords">
        x: {{ latentX.toFixed(2) }}, y: {{ latentY.toFixed(2) }}
      </div>
    </aside>

    <main class="main">
      <canvas
        ref="latentCanvas"
        width="400"
        height="400"
        @mousedown="startDrag"
      />
      <div ref="scoreEl" class="score"></div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Vex from 'vexflow';

/* Example latent data schema
   Replace this with your own JSON or import */
const latentData = {
  points: [
    { x: 0, y: 0, notes: ['c/4', 'e/4', 'g/4'] },
    { x: 1, y: 0, notes: ['d/4', 'f/4', 'a/4'] },
    { x: 0, y: 1, notes: ['e/4', 'g/4', 'b/4'] },
    { x: 1, y: 1, notes: ['f/4', 'a/4', 'c/5'] }
  ]
}

const latentX = ref(0.5)
const latentY = ref(0.5)
const latentCanvas = ref(null)
const scoreEl = ref(null)

let ctx = null
let dragging = false

function drawLatentSpace() {
  ctx.clearRect(0, 0, 400, 400)

  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, 400, 400)

  // latent points
  ctx.fillStyle = '#333'
  latentData.points.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x * 400, 400 - p.y * 400, 5, 0, Math.PI * 2)
    ctx.fill()
  })

  // current position
  ctx.fillStyle = 'red'
  ctx.beginPath()
  ctx.arc(latentX.value * 400, 400 - latentY.value * 400, 6, 0, Math.PI * 2)
  ctx.fill()
}

function nearestPoint(x, y) {
  let best = latentData.points[0]
  let bestDist = Infinity

  latentData.points.forEach(p => {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d < bestDist) {
      bestDist = d
      best = p
    }
  })

  return best
}

function drawScore(notes) {
  const VF = Vex.Flow
  scoreEl.value.innerHTML = ''

  const renderer = new VF.Renderer(
    scoreEl.value,
    VF.Renderer.Backends.SVG
  )

  renderer.resize(500, 160)
  const context = renderer.getContext()

  const stave = new VF.Stave(10, 40, 480)
  stave.addClef('treble').addTimeSignature('4/4')
  stave.setContext(context).draw()

  const vexNotes = notes.map(n =>
    new VF.StaveNote({
      clef: 'treble',
      keys: [n],
      duration: 'q'
    })
  )

  const voice = new VF.Voice({
    num_beats: vexNotes.length,
    beat_value: 4
  })

  voice.addTickables(vexNotes)
  new VF.Formatter().joinVoices([voice]).format([voice], 400)
  voice.draw(context, stave)
}

function updateFromEvent(e) {
  const rect = latentCanvas.value.getBoundingClientRect()

  latentX.value = Math.min(
    1,
    Math.max(0, (e.clientX - rect.left) / 400)
  )

  latentY.value = Math.min(
    1,
    Math.max(0, 1 - (e.clientY - rect.top) / 400)
  )

  drawLatentSpace()
  drawScore(nearestPoint(latentX.value, latentY.value).notes)
}

function startDrag(e) {
  dragging = true
  updateFromEvent(e)
}

function onMove(e) {
  if (dragging) updateFromEvent(e)
}

function stopDrag() {
  dragging = false
}

onMounted(() => {
  ctx = latentCanvas.value.getContext('2d')
  drawLatentSpace()
  drawScore(latentData.points[0].notes)

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100vh;
  font-family: system-ui, sans-serif;
}

.sidebar {
  padding: 16px;
  border-right: 1px solid #ddd;
}

.main {
  padding: 16px;
}

canvas {
  border: 1px solid #ccc;
  cursor: crosshair;
}

.coords {
  margin-top: 8px;
  font-size: 14px;
}

.score {
  margin-top: 16px;
}
</style>