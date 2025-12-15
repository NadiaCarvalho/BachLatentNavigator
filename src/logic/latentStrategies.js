// latentStrategies.js

import { knn, add, scale, subtract, angleBetween, euclidean } from './distance.js';

// Global variable to store the chord dictionary loaded from the JSON
let globalChordDict = [];

/**
 * Sets the global chord dictionary for use across all strategy functions.
 * This is crucial for initializing the application data.
 * @param {Array<Object>} dict - The full array of chord objects.
 */
export function setChordDict(dict) {
  globalChordDict = dict;
}

/**
 * Gets a chord object (including its latent vector z) from the global dictionary by ID.
 * @param {string} id - The chord ID.
 * @returns {Object|null} The chord object with 'id', 'z', and other properties.
 */
export function getChordById(id) {
  if (globalChordDict)
    return globalChordDict.find(chord => chord.id === id);
  return null;
}

// --- STRATEGY 1: K-NEAREST NEIGHBORS (Paper §2.2) ---

/**
 * Implements the k-Nearest Neighbors substitution strategy.
 * Finds the nearest chord (B'') to the target chord B in the latent space from k candidates.
 * @param {Object} B - The target chord object {id, z}.
 * @param {number} k - The number of neighbors to consider.
 * @returns {string} The ID of the best substitution chord (B').
 */
function knnSubstitution(B, k) {
  // We use knn to find the k closest chords, then select the absolute closest (index 0).
  const neighbors = knn(B.z, globalChordDict, k);
  
  const closestNeighbor = neighbors[0]; 

  if (closestNeighbor) {
    return closestNeighbor.id;
  }
  return B.id; // Fallback
}


// --- STRATEGY 2: LINEAR INTERPOLATION (Paper §2.1) ---

/**
 * Implements the traditional Linear Interpolation substitution strategy.
 * Samples a chord nearest to the midpoint between the previous chord (A) and 
 * the sequential chord (C).
 * @param {Object} A - The previous chord object.
 * @param {Object} C - The sequential chord object.
 * @returns {{id: string, geometricPoint: number[]}} The substitution ID and the interpolated point.
 */
function linearInterpolation(A, C) {
  // Use t=0.5 for the midpoint, as described in the paper's experiment setup for [A, B, C].
  // Formula: p = (1 - t) * p0 + t * p1
  const interpolatedPoint = add(scale(A.z, 0.5), scale(C.z, 0.5));
  
  // Find the chord nearest to the interpolated point
  const distances = globalChordDict.map(chord => ({
    ...chord,
    distance: euclidean(interpolatedPoint, chord.z),
  }));

  distances.sort((a, b) => a.distance - b.distance);
  
  // The nearest chord (distances[0]) is the sampled chord
  const nearestChord = distances[0]; 

  if (nearestChord) {
    return {
      id: nearestChord.id, 
      geometricPoint: interpolatedPoint,
    };
  }
  return { id: C.id, geometricPoint: interpolatedPoint }; // Fallback
}


// --- STRATEGY 3: K-NN WITH ANGULAR ALIGNMENT (Paper §2.3) ---

/**
 * Implements the k-Nearest Neighbors combined with Angular Alignment strategy.
 * Finds the candidate neighbor of B that has the least angular deviation relative to the vector AB.
 * @param {Object} A - The previous chord object.
 * @param {Object} B - The target chord object.
 * @param {number} k - The number of neighbors to screen for the best angle.
 * @returns {{id: string, kNeighbors: Array<Object>}} The substitution ID and the screened neighbors.
 */
function knnAngularAlignment(A, B, k) {
  // 1. Get the k nearest neighbors of B (the candidates)
  const neighbors = knn(B.z, globalChordDict, k); 

  // 2. Determine the original vector AB
  const vectorAB = subtract(B.z, A.z); 

  let bestCandidate = null;
  let bestAngle = Infinity;

  // 3. Assess the angular disparity between vectors from A to candidates (AC') and vector AB
  neighbors.forEach(candidate => {
    const vectorAC = subtract(candidate.z, A.z);
    const angle = angleBetween(vectorAB, vectorAC);

    if (angle < bestAngle) {
      bestAngle = angle;
      bestCandidate = candidate;
    }
  });

  if (bestCandidate) {
    return { 
      id: bestCandidate.id, 
      kNeighbors: neighbors, // Pass candidates for the dotted circle visualization
    };
  }
  
  // Fallback: use the original chord B
  return { id: B.id, kNeighbors: neighbors }; 
}


// --- MAIN ORCHESTRATION FUNCTION ---

/**
 * The main orchestration function for substituting chords in a phrase.
 * @param {Array<string>} originalPhraseIds - The original list of chord IDs.
 * @param {Array<number>} targetIndices - The indices to substitute.
 * @param {string} strategy - 'linear', 'knn', or 'angular'.
 * @param {Object} params - Strategy parameters (e.g., { k: 5 }).
 * @returns {{generatedPhraseIds: Array<string>, substitutionDetails: Object}}
 */
export function substitutePhrase(originalPhraseIds, targetIndices, strategy, params) {
  const generatedPhraseIds = [...originalPhraseIds];
  const fullPhrase = originalPhraseIds.map(id => getChordById(id)).filter(c => c);
  
  // Structure to hold all necessary visualization details
  const details = {
      strategy: strategy,
      originalA: null, 
      originalB: null, 
      originalC: null,
      substitutedChordId: null,
      geometricPoints: [], // For Linear Interpolation midpoint
      kNeighbors: [] // For k-NN/Angular candidates
  };

  // Only apply logic if one chord is selected, and it's not the first or last chord 
  // (to ensure context [A, B, C] exists), matching the paper's experimental setup.
  const i = targetIndices[0]; 
  const phraseLength = originalPhraseIds.length;
  const k = params.k || 5;

  if (targetIndices.length === 1 && i > 0 && i < phraseLength - 1) {
    const A = fullPhrase[i - 1]; // Previous chord
    const B = fullPhrase[i];     // Target chord
    const C = fullPhrase[i + 1]; // Sequential chord
    
    // Ensure all three contextual chords (A, B, C) are valid
    if (A && B && C) {
        details.originalA = A;
        details.originalB = B;
        details.originalC = C;
        
        let substitutionResult = { id: B.id }; 

        if (strategy === 'knn') {
          substitutionResult.id = knnSubstitution(B, k);
          details.kNeighbors = knn(B.z, globalChordDict, k);
        } else if (strategy === 'linear') {
          const result = linearInterpolation(A, C);
          substitutionResult.id = result.id;
          details.geometricPoints = [result.geometricPoint];
        } else if (strategy === 'angular') {
          const result = knnAngularAlignment(A, B, k);
          substitutionResult.id = result.id;
          details.kNeighbors = result.kNeighbors;
        } 

        generatedPhraseIds[i] = substitutionResult.id;
        details.substitutedChordId = substitutionResult.id;
    }
  }

  // Return both the new phrase and the visualization details
  return { 
      generatedPhraseIds: generatedPhraseIds, 
      substitutionDetails: details 
  };
}