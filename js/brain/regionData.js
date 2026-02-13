/**
 * Static data for all brain regions.
 * Positions are in local brain-group coordinates (center ~ 0,0,0).
 * explodeDir is the direction each region moves during explosion.
 *
 * Colors matched to standard anatomical model conventions:
 *   Frontal = pink/salmon, Parietal = blue/teal, Temporal = yellow-green,
 *   Occipital = purple, Cerebellum = deep purple/magenta, Brain Stem = blue
 */

export const BRAIN_REGIONS = [
  // ============ Exterior Lobes ============
  {
    id: 'frontal_lobe',
    name: 'Frontal Lobe',
    color: 0xe8837c,     // salmon/pink — matches anatomical convention
    position: [0, 0.28, 0.48],
    scale: [1.15, 0.85, 0.9],
    explodeDir: [0, 0.3, 1],
    type: 'lobe',
    description:
      'The largest lobe, located at the front of the brain. It plays a key role in higher cognitive functions including planning, reasoning, judgment, and voluntary movement. It also houses Broca\'s area, essential for speech production.',
    functions: [
      'Executive function & decision making',
      'Voluntary motor control',
      'Speech production (Broca\'s area)',
      'Working memory',
      'Personality & emotional regulation',
      'Problem solving & planning'
    ],
    conditions: [
      'ADHD',
      'Depression',
      'Traumatic Brain Injury (TBI)',
      'Frontotemporal Dementia',
      'Schizophrenia'
    ]
  },
  {
    id: 'parietal_lobe',
    name: 'Parietal Lobe',
    color: 0x5ba3b5,     // teal/blue
    position: [0, 0.55, -0.28],
    scale: [1.05, 0.7, 0.85],
    explodeDir: [0, 1, -0.2],
    type: 'lobe',
    description:
      'Located behind the frontal lobe, the parietal lobe processes sensory information from the body, including touch, temperature, and pain. It is critical for spatial awareness and navigation.',
    functions: [
      'Somatosensory processing (touch, pain, temperature)',
      'Spatial awareness & navigation',
      'Hand-eye coordination',
      'Language processing (reading, writing)',
      'Mathematical cognition',
      'Body awareness (proprioception)'
    ],
    conditions: [
      'Gerstmann Syndrome',
      'Hemispatial Neglect',
      'Apraxia',
      'Alzheimer\'s Disease',
      'Sensory Processing Disorder'
    ]
  },
  {
    id: 'temporal_lobe_left',
    name: 'Temporal Lobe (Left)',
    color: 0xc4cc54,     // yellow-green
    position: [-0.62, -0.22, 0.18],
    scale: [0.55, 0.6, 0.85],
    explodeDir: [-1, -0.2, 0.2],
    type: 'lobe',
    description:
      'The left temporal lobe is vital for language comprehension (Wernicke\'s area), verbal memory, and auditory processing. It is dominant for language in most right-handed individuals.',
    functions: [
      'Language comprehension (Wernicke\'s area)',
      'Verbal memory',
      'Auditory processing',
      'Speech perception',
      'Semantic memory'
    ],
    conditions: [
      'Wernicke\'s Aphasia',
      'Temporal Lobe Epilepsy',
      'Auditory Processing Disorder',
      'Alzheimer\'s Disease'
    ]
  },
  {
    id: 'temporal_lobe_right',
    name: 'Temporal Lobe (Right)',
    color: 0xc4cc54,     // same yellow-green (matching pair)
    position: [0.62, -0.22, 0.18],
    scale: [0.55, 0.6, 0.85],
    explodeDir: [1, -0.2, 0.2],
    type: 'lobe',
    description:
      'The right temporal lobe specializes in non-verbal memory, music perception, facial recognition, and emotional processing. It complements the left temporal lobe\'s language functions.',
    functions: [
      'Facial recognition',
      'Music perception & processing',
      'Non-verbal memory',
      'Emotional processing',
      'Visual memory'
    ],
    conditions: [
      'Prosopagnosia (face blindness)',
      'Temporal Lobe Epilepsy',
      'Amusia (tone deafness)',
      'Right TLE'
    ]
  },
  {
    id: 'occipital_lobe',
    name: 'Occipital Lobe',
    color: 0x8b74c8,     // purple
    position: [0, 0.18, -0.72],
    scale: [0.85, 0.7, 0.6],
    explodeDir: [0, 0.2, -1],
    type: 'lobe',
    description:
      'Located at the back of the brain, the occipital lobe is the primary visual processing center. It interprets visual stimuli including color, shape, motion, and depth perception.',
    functions: [
      'Primary visual processing',
      'Color perception',
      'Motion detection',
      'Depth perception',
      'Visual pattern recognition',
      'Reading (visual word form)'
    ],
    conditions: [
      'Cortical Blindness',
      'Visual Agnosia',
      'Color Blindness (cortical)',
      'Charles Bonnet Syndrome',
      'Migraine with Aura'
    ]
  },
  {
    id: 'cerebellum',
    name: 'Cerebellum',
    color: 0x9c5a8a,     // deep magenta/purple
    position: [0, -0.45, -0.6],
    scale: [0.9, 0.55, 0.55],
    explodeDir: [0, -0.8, -0.8],
    type: 'lobe',
    description:
      'The "little brain" at the base, the cerebellum contains more neurons than the rest of the brain combined. It coordinates voluntary movement, balance, posture, and motor learning.',
    functions: [
      'Motor coordination & fine-tuning',
      'Balance & posture control',
      'Motor learning & adaptation',
      'Timing & rhythm',
      'Cognitive functions (emerging research)',
      'Emotional regulation'
    ],
    conditions: [
      'Ataxia',
      'Cerebellar Degeneration',
      'Dysarthria',
      'Multiple Sclerosis',
      'Alcohol-related Cerebellar Damage'
    ]
  },
  {
    id: 'brain_stem',
    name: 'Brain Stem',
    color: 0x4a8bc2,     // blue
    position: [0, -0.62, -0.15],
    scale: [0.3, 0.55, 0.3],
    explodeDir: [0, -1, 0],
    type: 'lobe',
    description:
      'The brain stem connects the brain to the spinal cord and controls vital involuntary functions. It includes the midbrain, pons, and medulla oblongata, regulating heartbeat, breathing, and consciousness.',
    functions: [
      'Heart rate regulation',
      'Breathing control',
      'Sleep/wake cycles',
      'Consciousness & alertness',
      'Relay of sensory/motor signals',
      'Reflexes (swallowing, coughing)'
    ],
    conditions: [
      'Locked-in Syndrome',
      'Brain Stem Stroke',
      'Sleep Apnea',
      'Cranial Nerve Palsies',
      'Brain Death'
    ]
  },

  // ============ Internal Structures ============
  {
    id: 'thalamus',
    name: 'Thalamus',
    color: 0xd4789a,
    position: [0, 0.05, -0.05],
    scale: [0.35, 0.25, 0.3],
    explodeDir: [0, 0.6, 0],
    type: 'internal',
    description:
      'The thalamus is the brain\'s central relay station, sitting atop the brain stem. Almost all sensory information (except smell) passes through the thalamus before reaching the cortex.',
    functions: [
      'Sensory relay to cortex',
      'Motor signal relay',
      'Consciousness & alertness regulation',
      'Sleep regulation',
      'Attention & focus',
      'Pain perception modulation'
    ],
    conditions: [
      'Thalamic Pain Syndrome',
      'Fatal Familial Insomnia',
      'Thalamic Stroke',
      'Absence Seizures',
      'Chronic Pain Disorders'
    ]
  },
  {
    id: 'hypothalamus',
    name: 'Hypothalamus',
    color: 0xd4956a,
    position: [0, -0.12, 0.1],
    scale: [0.2, 0.15, 0.2],
    explodeDir: [0, -0.6, 0.4],
    type: 'internal',
    description:
      'A small but critical structure below the thalamus, the hypothalamus regulates the endocrine system via the pituitary gland. It controls body temperature, hunger, thirst, circadian rhythms, and emotional responses.',
    functions: [
      'Hormone regulation (via pituitary gland)',
      'Body temperature control',
      'Hunger & thirst regulation',
      'Circadian rhythm management',
      'Emotional responses',
      'Autonomic nervous system control'
    ],
    conditions: [
      'Diabetes Insipidus',
      'Hypothalamic Obesity',
      'Growth Disorders',
      'Sleep Disorders',
      'Temperature Dysregulation'
    ]
  },
  {
    id: 'hippocampus',
    name: 'Hippocampus',
    color: 0x5aafa0,
    position: [-0.25, -0.12, 0.0],
    scale: [0.4, 0.15, 0.2],
    explodeDir: [-0.8, -0.4, 0.2],
    type: 'internal',
    description:
      'A seahorse-shaped structure in the medial temporal lobe, the hippocampus is essential for forming new memories and spatial navigation. Damage to the hippocampus severely impairs the ability to create new long-term memories.',
    functions: [
      'Memory formation (encoding)',
      'Memory consolidation',
      'Spatial navigation & mapping',
      'Learning & recall',
      'Contextual memory',
      'Emotional memory regulation'
    ],
    conditions: [
      'Alzheimer\'s Disease (early target)',
      'Amnesia (anterograde)',
      'PTSD',
      'Epilepsy',
      'Transient Global Amnesia'
    ]
  },
  {
    id: 'amygdala',
    name: 'Amygdala',
    color: 0xc46464,
    position: [-0.32, -0.18, 0.2],
    scale: [0.15, 0.15, 0.15],
    explodeDir: [-0.9, -0.5, 0.5],
    type: 'internal',
    description:
      'An almond-shaped cluster of nuclei located anterior to the hippocampus, the amygdala is the brain\'s emotional processing center. It plays a key role in fear responses, emotional memories, and social behavior.',
    functions: [
      'Fear processing & response',
      'Emotional memory formation',
      'Aggression regulation',
      'Social behavior & cues',
      'Reward processing',
      'Fight-or-flight activation'
    ],
    conditions: [
      'Anxiety Disorders',
      'PTSD',
      'Phobias',
      'Borderline Personality Disorder',
      'Autism Spectrum Disorder (amygdala theory)'
    ]
  },
  {
    id: 'corpus_callosum',
    name: 'Corpus Callosum',
    color: 0xd0d8e4,
    position: [0, 0.3, -0.05],
    scale: [0.6, 0.1, 0.7],
    explodeDir: [0, 0.8, 0],
    type: 'internal',
    description:
      'The largest white matter structure, the corpus callosum is a thick band of nerve fibers connecting the left and right cerebral hemispheres. It enables communication and coordination between the two halves of the brain.',
    functions: [
      'Inter-hemispheric communication',
      'Coordination of bilateral motor tasks',
      'Transfer of sensory information',
      'Integration of cognitive functions',
      'Unified consciousness'
    ],
    conditions: [
      'Agenesis of the Corpus Callosum',
      'Split-brain Syndrome (post-callosotomy)',
      'Multiple Sclerosis',
      'Alien Hand Syndrome',
      'Developmental Delays'
    ]
  },
  {
    id: 'basal_ganglia',
    name: 'Basal Ganglia',
    color: 0x7a7cc8,
    position: [0.2, -0.02, 0.05],
    scale: [0.3, 0.25, 0.25],
    explodeDir: [0.8, -0.3, 0.3],
    type: 'internal',
    description:
      'A group of subcortical nuclei deep within the cerebral hemispheres, the basal ganglia are essential for motor control, procedural learning, and habit formation. They modulate movement initiation and suppression.',
    functions: [
      'Voluntary motor control modulation',
      'Procedural learning & habits',
      'Motor planning & initiation',
      'Reward-based learning',
      'Eye movement control',
      'Cognitive flexibility'
    ],
    conditions: [
      'Parkinson\'s Disease',
      'Huntington\'s Disease',
      'Tourette Syndrome',
      'Dystonia',
      'OCD (basal ganglia circuit)'
    ]
  }
];
