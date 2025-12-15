<template>
    <div class="phrase-score-container" :class="{ 'readonly': props.readonly }">
        <div ref="scoreEl" class="score-canvas"></div>
        <div v-if="!props.readonly" class="click-hint">Click a chord to select it for substitution.</div>
        <div v-else class="noclick-hint"></div>
    </div>
</template>

<script setup>
import { onMounted, watch, ref } from 'vue'
import * as VF from 'vexflow'
import { getChordById } from '../logic/latentStrategies.js'

// Props
const props = defineProps({
    phrase: { type: Array, required: true },
    selectedIndices: { type: Array, default: () => [] },
    readonly: { type: Boolean, default: false }
})

const emit = defineEmits(['select-chord'])
const scoreEl = ref(null)
// Renderer instance must be outside renderPhrase to persist redraws
let renderer = null;

/* =========================
   Utilities
========================= */

function toVexFlowKeys(pitchClass) {
    if (!pitchClass || pitchClass.length === 0) return ['c/4'];

    return pitchClass.map(note => {
        return note.toLowerCase().replace('b', 'b');
    });
}

/* =========================
   Rendering
========================= */

function renderPhrase() {
    if (!scoreEl.value) return;
    scoreEl.value.innerHTML = ''

    // 1. Initialize/Get Renderer using the direct VF access
    if (!renderer) {
        // Using VF.Renderer and VF.Renderer.Backends
        renderer = new VF.Renderer(
            scoreEl.value,
            VF.Renderer.Backends.SVG
        );
    }

    const width = Math.max(600, props.phrase.length * 100)
    const height = 220;
    renderer.resize(width, height)
    const context = renderer.getContext()

    context.clear();

    // Calculate the total duration (since all are 'q' notes, it's just the length)
    const totalBeats = props.phrase.length;
    const timeSignature = `${totalBeats}/4`;

    // 2. Setup Stave (Staff) using VF.Stave
    let stave = new VF.Stave(10, 60, width - 20)
    stave.addClef('treble').addTimeSignature(timeSignature)
    stave.setContext(context).draw()

    // 3. Create Notes
    const notes = props.phrase.map((chordId, i) => {
        const chordData = getChordById(chordId);

        //console.log(chordId, chordData.pitchclass);

        if (!chordData || !chordData.pitchclass) {
            return new VF.StaveNote({ keys: ['c/4'], duration: 'qr' });
        }

        const keys = toVexFlowKeys(chordData.pitchclass);

        // Use VF.StaveNote
        const note = new VF.StaveNote({
            clef: 'treble',
            keys,
            duration: 'q'
        });

        // Add accidentals
        chordData.pitchclass.forEach((originalNote, noteIndex) => {
            if (originalNote.includes('#')) {
                note.addModifier(new VF.Accidental('#'), noteIndex); // Use VF.Accidental
            } else if (originalNote.includes('b')) {
                note.addModifier(new VF.Accidental('b'), noteIndex); // Use VF.Accidental
            }
        });

        // --- Highlighting Logic ---
        let fillColor = '#000';
        let stemColor = '#000';

        const isSelected = props.selectedIndices.includes(i);
        const isSubstituted = props.readonly && props.phrase[i] !== chordId;

        if (!props.readonly && isSelected) {
            fillColor = '#007bff';
            stemColor = '#007bff';
        } else if (isSubstituted) {
            fillColor = '#cc0000';
            stemColor = '#cc0000';
        }

        note.setStyle({ fillStyle: fillColor, strokeStyle: stemColor });

        // --- Prepare for Click Handler ---
        if (!props.readonly) {
            note.setAttribute('data-chord-index', i);
        }

        return note
    })

    // 4. Voice and Formatting
    const voice = new VF.Voice({ // <-- CORRECTED: Use VF.Voice directly
        // The voice must match the total duration of notes added.
        num_beats: notes.length,
        beat_value: 4 // The value of a beat is a quarter note
    });

    console.log(notes.length);

    voice.addTickables(notes);

    // 4.5. Validation and Formatting
    // Validate the voice to make sure the time signature is met.
    // This is often the step that triggers the "Too many ticks" error if the Voice duration
    // doesn't match the stave's bar (4/4 = 4 beats).
    try {
        // If you have more than 4 notes, you must relax the strictness
        // or set the time signature on the stave to match the phrase length.

        // For a single long phrase, use 'soft' format:
        new VF.Formatter().joinVoices([voice]).format([voice], width - 60);

        // Draw the Voice
        voice.draw(context, stave);

    } catch (e) {
        // If it fails, log the error and try a different formatting.
        console.error("VexFlow Formatting Error:", e);
        // You might try to omit the Formatter altogether if you only have one voice
        // voice.draw(context, stave);
    }

    // 5. Attach Click Listeners directly to the SVG elements
    if (!props.readonly) {
        const svg = scoreEl.value.querySelector('svg');
        if (svg) {
            svg.querySelectorAll('[data-chord-index]').forEach(element => {
                const index = element.getAttribute('data-chord-index');
                const clickableElement = element.closest('g');

                if (clickableElement && index !== null) {
                    clickableElement.style.cursor = 'pointer';

                    clickableElement.addEventListener('click', () => {
                        emit('select-chord', Number(index));
                    }, { once: true });
                }
            });
        }
    }
}

onMounted(renderPhrase)
watch(() => [props.phrase, props.selectedIndices], renderPhrase, { deep: true })
</script>

<style scoped>
.phrase-score-container {
    border: 1px solid #ddd;
    padding: 0.5rem;
    min-width: 350px;
}

.score-canvas svg {
    cursor: default;
}

.phrase-score-container:not(.readonly) .score-canvas svg {
    cursor: pointer;
}

.click-hint {
    font-size: 0.8em;
    color: #666;
    margin-top: 5px;
    text-align: center;
}

.noclick-hint {
    height: 1.2em;
}
</style>