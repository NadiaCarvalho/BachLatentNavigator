# 🎼 Bach Chorale Latent Space Navigator

An interactive web application based on research into **Explainable AI (XAI)** for musical generation. This tool demonstrates how high-dimensional latent spaces of Variational Autoencoders (VAEs) can be navigated using geometric strategies to perform musically informed chord substitutions.



## 🌟 Features

- **Latent Substitution Logic:** Implements three core strategies for chord replacement:
    - **Linear Interpolation:** Finds the midpoint between neighboring chords in latent space.
    - **k-Nearest Neighbors (k-NN):** Samples the closest discrete chords based on Euclidean distance.
    - **Angular Alignment:** Aligns the directional vector of the substitution with the original musical intent.
- **Dynamic Score Rendering:** Real-time musical notation using **VexFlow**.
- **Interactive Visualization:** A 2D PCA projection of the high-dimensional latent space to provide a geometric "explanation" of the AI's decisions.
- **Audio Playback:** Built-in synthesis using **Tone.js** to hear the difference between original Bach and AI-generated variations.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or higher recommended)
- [NPM](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/bach-latent-navigator.git
   cd bach-latent-navigator
   

2. **Install dependencies:**
    ```bash
   npm install vexflow tone vue
   

3. **Prepare the Data:**

    Ensure your chords_bach_all.json (containing the latent vectors and pitch classes) is located in src/data/.

4. **Run the Development Server:**
    ```bash
   npm run dev
   

---

## 🛠 Project Architecture

The system is built as a modular Vue 3 application, separating mathematical logic from musical rendering.

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Orchestrator** | `App.vue` | Manages global state, strategy selection, and data flow. |
| **Notation Engine** | `VexFlow` | Translates chord IDs into SVG musical scores. |
| **Audio Engine** | `Tone.js` | Polyphonic synthesis and timing for phrase playback. |
| **Latent Logic** | `logic/distance.js` | Calculates Euclidean distance and Angular Similarity. |

---

## 📐 Geometric Strategies

This tool implements the three primary substitution methods discussed in the SMC research paper:

### 1. Linear Interpolation (Midpoint)
Calculates the high-dimensional midpoint $M$ between chords $A$ and $C$ ($M = \frac{A+C}{2}$). The system then identifies the discrete chord $B'$ in the dataset that minimizes the Euclidean distance to $M$.



### 2. k-Nearest Neighbors (k-NN)
Defines a neighborhood of size $k$ around the target chord $B$. This strategy allows for exploring variations that are "locally" similar to the original Bach chord.



### 3. Angular Alignment
A more advanced strategy that seeks a neighbor $B''$ which maximizes the cosine similarity between vectors $\vec{AB}$ and $\vec{AB''}$. This preserves the "harmonic direction" of the original musical sequence.

---

## 📖 References & Acknowledgments

This project is a functional implementation of the methodologies described in the following research paper:

* **Paper Title:** *Exploring Sampling Strategies in Latent Spaces for
                   Music Generation*
* **Authors:** Carvalho, Nádia and
                  Bernardes de Almeida, Gilberto
* **Publication:** Proceedings of the 21st Sound and Music Computing
                        Conference (SMC)
* **Link:** https://doi.org/10.5281/zenodo.14336029

If using this tool, please cite:

        @inproceedings{carvalho_2024_14336029,
            author       = {Carvalho, Nádia and Bernardes de Almeida, Gilberto},
            title        = {Exploring Sampling Strategies in Latent Spaces for Music Generation},
            booktitle    = {Proceedings of the 21st Sound and Music Computing Conference},
            year         = 2024,
            pages        = {74-81},
            publisher    = {Zenodo},
            month        = jul,
            venue        = {ESMAE, Porto, Portugal},
            doi          = {10.5281/zenodo.14336029},
            url          = {https://doi.org/10.5281/zenodo.14336029},
        }



The data used in this navigator is derived from the **JSB Chorales** dataset, a standard benchmark in music generation research.

---

## 📜 License

Distributed under the **MIT License**. This project is intended for research, educational purposes, and creative exploration of Latent Space navigation.

---
