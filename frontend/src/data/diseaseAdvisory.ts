/**
 * FarmDoctor AI - Agricultural Advisory Knowledge Base
 * Provides practical agronomic advice, organic management, and prevention steps for crops.
 */

export interface DiseaseGuidance {
  description: string;
  symptoms: string[];
  organicControls: string[];
  preventivePractices: string[];
  caution: string;
}

export const DISEASE_ADVISORY_DB: Record<string, DiseaseGuidance> = {
  // Early Blight
  "Early blight": {
    description: "A common fungal disease caused by Alternaria species affecting leaves, stems, and fruits.",
    symptoms: [
      "Concentric dark brown rings resembling target boards on older leaves.",
      "Yellow halos developing around brown necrotic lesions.",
      "Premature leaf drop leading to fruit sunscald."
    ],
    organicControls: [
      "Prune and discard infected lower leaves immediately (do not compost).",
      "Apply copper-based organic fungicides or neem oil formulation early in the morning.",
      "Spray bio-control agents like Trichoderma harzianum or Bacillus subtilis."
    ],
    preventivePractices: [
      "Practice 3-year crop rotation avoiding other Solanaceous crops (potato, eggplant, pepper).",
      "Use drip irrigation rather than overhead sprinklers to keep foliage dry.",
      "Apply 2-3 inches of straw mulch around plant base to prevent soil spore splash."
    ],
    caution: "Do not apply synthetic systemic fungicides without confirmed extension diagnosis. Follow strictly labelled pre-harvest intervals."
  },

  // Late Blight
  "Late blight": {
    description: "A destructive water-mold disease caused by Phytophthora infestans that spreads rapidly in cool, moist weather.",
    symptoms: [
      "Dark water-soaked lesions on leaves rapidly expanding into large brown blotches.",
      "Delicate white fungal downy growth on the underside of leaves during humid mornings.",
      "Foul-smelling decaying foliage and firm brown rot on tubers/fruits."
    ],
    organicControls: [
      "Remove and safely burn or bury severely infected plants away from field borders.",
      "Apply preventative copper hydroxide sprays before humid rainy spells.",
      "Improve field drainage to eliminate standing moisture pockets."
    ],
    preventivePractices: [
      "Always use certified disease-free seed tubers and seedlings.",
      "Increase plant spacing to ensure generous canopy air circulation.",
      "Plant blight-resistant crop cultivars suited for your regional microclimate."
    ],
    caution: "Late blight can decimate entire field acreage within 7-10 days if unchecked. Notify local extension specialists immediately if observed."
  },

  // Powdery Mildew
  "Powdery mildew": {
    description: "A widespread fungal condition characterized by white talcum-powder-like coating on leaf surfaces.",
    symptoms: [
      "White to grayish powdery spots covering upper leaf surfaces and young shoots.",
      "Curling, yellowing, or browning of affected leaves.",
      "Stunted young growth and reduced photosynthetic yield."
    ],
    organicControls: [
      "Spray a dilute baking soda mixture (1 tbsp baking soda + 1 tsp horticultural oil per gallon water).",
      "Apply bio-fungicides containing Bacillus amyloliquefaciens.",
      "Spray potassium bicarbonate solutions to alter surface pH."
    ],
    preventivePractices: [
      "Avoid excess high-nitrogen fertilizers that generate susceptible tender foliage.",
      "Ensure plants receive full sunlight for at least 6-8 hours daily.",
      "Prune dense canopy branches to maximize interior airflow."
    ],
    caution: "Apply foliar sprays during evening or early morning to prevent leaf scorch in intense afternoon heat."
  },

  // Apple Scab
  "Apple scab": {
    description: "Caused by Venturia inaequalis, causing olive-green to black velvety scabs on apple leaves and fruit.",
    symptoms: [
      "Dull olive-green velvety spots turning dark brown or black.",
      "Leaves become distorted, puckered, and drop prematurely.",
      "Cork-like scabby lesions on developing fruit skin."
    ],
    organicControls: [
      "Rake and shred or compost fallen apple leaves in autumn to eliminate overwintering spore reservoirs.",
      "Apply liquid sulfur or copper formulations at green tip bud stage.",
      "Spray wettable sulfur early in spring following prolonged rainfall."
    ],
    preventivePractices: [
      "Prune apple trees during dormancy in an open-vase or central leader shape for sunlight penetration.",
      "Plant scab-immune or resistant rootstocks and varieties."
    ],
    caution: "Avoid sulfur sprays when ambient temperatures exceed 28°C (82°F) to prevent phytotoxic leaf burning."
  },

  // Black Rot
  "Black rot": {
    description: "A severe fungal infection impacting grapes and apples causing fruit mummification and necrotic leaf spots.",
    symptoms: [
      "Reddish-brown circular spots with dark borders on foliage.",
      "Berries shrivel into hard, black, wrinkled mummies that cling to vines.",
      "Tiny black fruiting bodies (pycnidia) visible inside lesions."
    ],
    organicControls: [
      "Remove all mummified fruit clusters during winter pruning.",
      "Apply sulfur-based or copper soap sprays from bud break through veraison."
    ],
    preventivePractices: [
      "Train vines on high trellis systems to elevate foliage above wet soil.",
      "Keep vineyard rows well weeded and mowed for good air circulation."
    ],
    caution: "Sanitation is the most critical control step. Leaving mummies on vines guarantees reinfection next season."
  },

  // Bacterial Spot
  "Bacterial spot": {
    description: "Caused by Xanthomonas species affecting peppers and tomatoes in warm, rainy climates.",
    symptoms: [
      "Small water-soaked circular to angular lesions with yellow margins.",
      "Lesions turn dark brown to black and centers may tear or drop out ('shot-hole').",
      "Rough, raised scabby blisters on fruit."
    ],
    organicControls: [
      "Apply fixed copper sprays combined with bio-fungicides.",
      "Remove severely damaged seedlings to protect nursery stock."
    ],
    preventivePractices: [
      "Never work in wet fields or touch foliage while plants are damp from rain or dew.",
      "Use hot water-treated seed and clean nursery trays with disinfectant.",
      "Avoid sprinkler irrigation; use bottom drip systems."
    ],
    caution: "Antibiotics are generally prohibited for crop use. Rely on preventative sanitation and copper bactericides."
  },

  // Healthy (No Disease)
  "Healthy (No Disease Detected)": {
    description: "The examined leaf exhibits robust cellular turgor, clean pigmentation, and no significant visual pathology.",
    symptoms: [
      "Uniform vibrant green chlorophyll coloration.",
      "Smooth margins and undamaged cuticle layer.",
      "No fungal down, bacterial halos, or necrotic lesions."
    ],
    organicControls: [
      "Maintain balanced organic soil amendments such as vermicompost or well-rotted farmyard manure.",
      "Apply prophylactic seaweed extract foliar spray every 15-20 days for micronutrient support."
    ],
    preventivePractices: [
      "Maintain consistent soil moisture without waterlogging root zones.",
      "Scout crop rows twice a week, checking leaf undersides for early pest presence.",
      "Maintain beneficial insect habitats (ladybugs, lacewings) around farm borders."
    ],
    caution: "Continue regular scouting. Early detection of emerging pest populations prevents catastrophic disease outbreaks."
  }
};

/**
 * Returns tailored advisory for any raw condition string
 */
export function getGuidanceForCondition(condition: string): DiseaseGuidance {
  // Check exact key
  if (DISEASE_ADVISORY_DB[condition]) {
    return DISEASE_ADVISORY_DB[condition];
  }

  // Partial match
  for (const [key, value] of Object.entries(DISEASE_ADVISORY_DB)) {
    if (condition.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Default fallback guidance
  return {
    description: `Visual indicators suggest symptoms related to ${condition}.`,
    symptoms: [
      "Abnormal discoloration, chlorosis, or necrotic spotting on leaf tissues.",
      "Potential reduction in photosynthetic efficiency."
    ],
    organicControls: [
      "Isolate or prune visibly damaged foliage to limit spread across neighboring rows.",
      "Apply preventative mild organic foliar sprays (neem cake extract or bio-fungicide)."
    ],
    preventivePractices: [
      "Avoid wetting leaves during evening watering; switch to root-zone drip lines.",
      "Ensure proper row-to-row spacing for cross-ventilation."
    ],
    caution: "This automated finding is preliminary decision support. Bring a physical leaf sample to your nearest Krishi Vigyan Kendra (KVK) or agricultural extension officer before taking chemical measures."
  };
}
