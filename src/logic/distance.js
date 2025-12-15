// distance.js

/**
 * Calculates the Euclidean distance between two vectors.
 * @param {number[]} a - The first latent vector.
 * @param {number[]} b - The second latent vector.
 * @returns {number} The Euclidean distance.
 */
export function euclidean(a, b) {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension for distance calculation.');
    }
  
    let sumOfSquares = 0;
    for (let i = 0; i < a.length; i++) {
      sumOfSquares += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sumOfSquares);
  }
  
  /**
   * Subtracts vector b from vector a (a - b).
   * @param {number[]} a 
   * @param {number[]} b 
   * @returns {number[]} Resulting vector.
   */
  export function subtract(a, b) {
    return a.map((val, i) => val - b[i]);
  }
  
  /**
   * Scales a vector by a scalar value t.
   * @param {number[]} v - The vector.
   * @param {number} t - The scalar value (e.g., 0.5 for midpoint).
   * @returns {number[]} The scaled vector.
   */
  export function scale(v, t) {
    return v.map(val => val * t);
  }
  
  /**
   * Adds two vectors (a + b).
   * @param {number[]} a 
   * @param {number[]} b 
   * @returns {number[]} The resulting vector.
   */
  export function add(a, b) {
    return a.map((val, i) => val + b[i]);
  }
  
  /**
   * Calculates the magnitude (Euclidean norm) of a vector.
   * @param {number[]} v - The vector.
   * @returns {number} The magnitude.
   */
  export function magnitude(v) {
    return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  }
  
  /**
   * Calculates the dot product of two vectors.
   * @param {number[]} a 
   * @param {number[]} b 
   * @returns {number} The dot product.
   */
  export function dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
  
  /**
   * Calculates the angle (in radians) between two vectors.
   * The angle is calculated using the formula: angle = arccos( (A · B) / (|A| * |B|) )
   * @param {number[]} a - Vector A.
   * @param {number[]} b - Vector B.
   * @returns {number} The angle in radians.
   */
  export function angleBetween(a, b) {
    const dot = dotProduct(a, b);
    const magA = magnitude(a);
    const magB = magnitude(b);
  
    // Avoid division by zero
    if (magA === 0 || magB === 0) return Infinity;
  
    // Clamp the argument for acos to [-1, 1] to prevent NaN due to floating point inaccuracies
    const cosTheta = Math.min(1, Math.max(-1, dot / (magA * magB)));
    return Math.acos(cosTheta);
  }
  
  /**
   * Finds the nearest neighbor to a target vector from a list of all potential chords.
   * @param {number[]} targetZ - The latent vector of the chord to substitute (B.z).
   * @param {Array<Object>} allLatents - The global dictionary of all chords with their Z vectors.
   * @param {number} k - The number of neighbors to retrieve.
   * @param {string} metric - The distance metric to use (e.g., 'euclidean').
   * @returns {Array<Object>} The k nearest neighbor chord objects, ordered by distance.
   */
  export function knn(targetZ, allLatents, k, metric = 'euclidean') {
    const distanceFn = (metric === 'euclidean') ? euclidean : null; 
  
    if (!distanceFn) {
      throw new Error(`Unsupported distance metric: ${metric}`);
    }
  
    // Calculate distance from the target to every other chord
    const distances = allLatents.map(chord => ({
      ...chord,
      distance: distanceFn(targetZ, chord.z),
    }));
  
    // Sort by distance (ascending)
    distances.sort((a, b) => a.distance - b.distance);
    
    // The first element is the target itself (distance 0), so we skip it.
    // We return the k closest *unique* candidates (the k nearest neighbors).
    return distances.slice(1, k + 1);
  }