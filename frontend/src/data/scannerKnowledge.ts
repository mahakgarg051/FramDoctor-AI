/**
 * FarmDoctor AI - Disease Knowledge Repository for Scanner Tabs
 * Provides verified agronomic knowledge across 6 tabs:
 * 1. About
 * 2. Symptoms
 * 3. Causes
 * 4. Prevention
 * 5. Management
 * 6. Next Steps
 */

export interface DiseaseTabInfo {
  about: string;
  symptoms: string[];
  causes: string[];
  prevention: string[];
  management: string[];
  nextSteps: string[];
  scientificName?: string;
  pathogenType?: string;
  isHealthy?: boolean;
}

export const SCANNER_KNOWLEDGE_DB: Record<string, DiseaseTabInfo> = {
  // Rice Leaf Blast (Magnaporthe oryzae)
  "Rice___Leaf_blast": {
    about:
      "Rice Blast is one of the most destructive fungal diseases of rice, caused by Magnaporthe oryzae (Pyricularia oryzae). It manifests as elliptical or spindle-shaped lesions with gray or whitish centers and reddish-brown borders on leaves, which coalesce and cause leaves to desiccate.",
    scientificName: "Magnaporthe oryzae (Pyricularia oryzae)",
    pathogenType: "Fungal",
    symptoms: [
      "Spindle-shaped or diamond-shaped lesions on leaf blades with gray centers and reddish-brown margins.",
      "Lesions enlarge and coalesce, causing entire leaves to desiccate and wither (blast-burn appearance).",
      "Collar blast lesions develop where the leaf blade joins the leaf sheath, causing the entire leaf to drop.",
      "Severe infections during vegetative tillering lead to severe stunting, reduced tillering, or total crop loss.",
    ],
    causes: [
      "Pathogen: Airborne conidia of the fungus Magnaporthe oryzae.",
      "Favorable Microclimate: Night temperatures of 20°C–26°C with prolonged leaf wetness (> 10–14 hours).",
      "High Relative Humidity: Humidity exceeding 90% during overcast or rainy weather.",
      "Agronomic Factors: Excessive nitrogen (urea) applications causing overly lush, tender foliage.",
    ],
    prevention: [
      "Cultivate blast-resistant rice varieties recommended for your agro-ecological zone (e.g., IR64-Sub1, Pusa 44 derivatives).",
      "Apply nitrogen in split applications balanced with potassium (MOP) rather than heavy single doses.",
      "Treat seeds with Tricyclazole 75% WP (2 g/kg seed) or Carbendazim (2 g/kg seed) prior to nursery sowing.",
      "Maintain optimal hill spacing (20 cm × 15 cm) to promote canopy airflow and accelerate foliage drying.",
    ],
    management: [
      "Foliar spray of Tricyclazole 75% WP @ 0.6 g/L or Isoprothiolane 40% EC @ 1.5 mL/L at the first appearance of leaf spots.",
      "Alternative systemic fungicide: Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1.0 mL/L water.",
      "Avoid spraying during peak midday heat; ensure comprehensive coverage on lower canopy leaves.",
      "Drain excess standing water temporarily if feasible to decrease microclimate canopy humidity.",
    ],
    nextSteps: [
      "Step 1: Scout surrounding field plots to delineate whether blast is localized or widespread.",
      "Step 2: Cease any planned top-dressing of urea until disease progression is halted.",
      "Step 3: Check district agro-meteorological advisories from your local Krishi Vigyan Kendra (KVK).",
      "Step 4: Re-scan affected leaves after 5–7 days to assess whether lesions have stopped expanding.",
    ],
  },

  // Rice Bacterial Leaf Blight (Xanthomonas oryzae)
  "Rice___Bacterial_leaf_blight": {
    about:
      "Bacterial Leaf Blight (BLB) of rice is a systemic vascular disease caused by Xanthomonas oryzae pv. oryzae. It produces water-soaked, undulating translucent streaks along leaf margins that rapidly turn pale yellow, wavy, and necrotic.",
    scientificName: "Xanthomonas oryzae pv. oryzae",
    pathogenType: "Bacterial",
    symptoms: [
      "Water-soaked stripes beginning at leaf tips and margins, undulating with irregular wavy edges.",
      "Lesions expand rapidly turning yellow-orange and eventually drying into a bleached straw-white color.",
      "Milky or amber bacterial ooze droplets visible on fresh lesions in early morning dew.",
      "Severe seedling infections result in 'kresek' (systemic wilting and seedling mortality).",
    ],
    causes: [
      "Pathogen: Systemic bacterial infection by Xanthomonas oryzae entering hydathodes or mechanical leaf wounds.",
      "High Temperatures & Monsoons: Temperatures of 25°C–34°C with strong winds and heavy rainfall.",
      "Excessive Nitrogen: High rates of nitrogen fertilizers without sufficient potassium supplementation.",
      "Cultural Practices: Clipping seedling tips during nursery transplanting, creating open bacterial infection courts.",
    ],
    prevention: [
      "Plant BLB-resistant or tolerant rice cultivars (e.g., Improved Samba Mahsuri / RP Bio-226, Pusa 1460).",
      "Never clip seedling foliage tips during transplanting.",
      "Apply balanced NPK fertilization with supplementary potash (MOP @ 20 kg/acre) to strengthen cell walls.",
      "Ensure proper irrigation management: avoid maintaining deep stagnant floodwaters.",
    ],
    management: [
      "Spray Copper Oxychloride 50% WP @ 2.5 g/L combined with Streptocycline @ 1 g per 10 L of water.",
      "Bio-control spray: Apply plant-probiotic Bacillus subtilis or Pseudomonas fluorescens @ 5 g/L.",
      "Withhold further nitrogen fertilizer top-dressing until lesion margins turn dry and cease spreading.",
      "Disinfect field implements before moving between infected and uninfected paddy fields.",
    ],
    nextSteps: [
      "Step 1: Check morning dew on leaf lesions for milky bacterial exudate to confirm bacterial vs fungal etiology.",
      "Step 2: Lower the field water level to a shallow 2–3 cm to restrict bacterial motility.",
      "Step 3: Consult local agricultural extension officers for registered regional bactericide recommendations.",
      "Step 4: Monitor nearby bunds and eliminate wild rice and grass weed reservoirs.",
    ],
  },

  // Rice Brown Spot (Bipolaris oryzae)
  "Rice___Brown_spot": {
    about:
      "Brown Spot of rice is caused by the fungal pathogen Bipolaris oryzae (Cochliobolus miyabeanus). It produces distinctive circular to oval reddish-brown spots with yellow halos across the leaf blades, historically associated with nutrient-deficient or moisture-stressed soils.",
    scientificName: "Bipolaris oryzae (Cochliobolus miyabeanus)",
    pathogenType: "Fungal",
    symptoms: [
      "Small circular to oval reddish-brown spots that expand to 5–10 mm with distinctive yellow halos.",
      "Centers of mature lesions become necrotic, grayish, or light brown with dark brown borders.",
      "Heavily infected leaves turn yellow prematurely, wither, and dry out.",
      "Discoloration on glumes and panicles ('pecky rice'), diminishing grain filling and milling quality.",
    ],
    causes: [
      "Pathogen: Bipolaris oryzae, aggravated by zinc, potassium, or silicon deficiencies in soil.",
      "Soil Fertility: Nutrient-depleted, sandy, or unamended acidic soils with low organic matter.",
      "Moisture Stress: Irregular irrigation, drought stress alternating with waterlogging.",
      "Inoculum: Seed-borne infection and infected stubble residues remaining from prior seasons.",
    ],
    prevention: [
      "Conduct soil testing and apply Zinc Sulphate (25 kg/ha) along with balanced NPK basal nutrition.",
      "Treat seeds before sowing with Carbendazim 50% WP @ 2 g/kg seed or Thiram @ 3 g/kg seed.",
      "Maintain consistent field moisture; avoid water stress during tillering and panicle initiation.",
      "Incorporate organic matter or green manure crops (e.g. Sesbania/Dhaincha) to improve soil structure.",
    ],
    management: [
      "Foliar spray of Mancozeb 75% WP @ 2.0 g/L or Propiconazole 25% EC @ 1.0 mL/L at first spot emergence.",
      "Foliar micronutrient spray: Apply 0.5% Zinc Sulphate + 1% Potassium Nitrate to replenish deficiency.",
      "Top-dress supplementary potassium (MOP @ 15 kg/acre) to fortify leaf cuticle and epidermal strength.",
      "Ensure clean field borders and remove weed grass hosts around field channels.",
    ],
    nextSteps: [
      "Step 1: Assess soil moisture and ensure field is not suffering from drought stress.",
      "Step 2: Plan soil micronutrient supplementation (zinc/potash) for immediate leaf uptake.",
      "Step 3: Inspect emerging panicles for glume spot discoloration before grain filling.",
      "Step 4: Log scan record in FarmDoctor to evaluate response after micronutrient spray.",
    ],
  },

  // Rice Healthy (Oryza sativa)
  "Rice___healthy": {
    about:
      "The scanned rice leaf exhibits vigorous vegetative growth with uniform emerald-green coloration, well-defined vascular venation, and no visible lesions of fungal or bacterial pathogens. Continue good agronomic practices to maintain crop health.",
    scientificName: "Oryza sativa",
    pathogenType: "None (Healthy Plant)",
    isHealthy: true,
    symptoms: [
      "Uniform vibrant emerald-green coloration across the leaf blade, midrib, and ligule.",
      "Zero necrotic spots, water-soaked margins, brown pustules, or foliar chlorosis.",
      "Erect, firm leaf posture indicating excellent cellular turgor and hydration.",
      "Clean, intact leaf margins with no insect chewing or bacterial ooze.",
    ],
    causes: [
      "Healthy, vigorous rice crop sustained by balanced nutrition and proper water management.",
    ],
    prevention: [
      "Maintain alternate wetting and drying (AWD) irrigation to encourage root aeration and water economy.",
      "Adhere strictly to recommended split-nitrogen scheduling across basal, active tillering, and panicle initiation.",
      "Conduct weekly field scouting during humid monsoon weather for early detection of airborne spores.",
      "Keep field bunds clear of weeds that harbor insect disease vectors like leafhoppers and plant hoppers.",
    ],
    management: [
      "No chemical fungicides or bactericides required.",
      "Maintain 2–5 cm shallow water depth during critical panicle initiation and flowering stages.",
      "Continue routine weekly field monitoring across different quadrants of the paddy field.",
    ],
    nextSteps: [
      "Step 1: Save this scan to your FarmDoctor field history for baseline crop growth tracking.",
      "Step 2: Review live weather and foliar spray advisories in the FarmDoctor Weather Hub.",
      "Step 3: Plan upcoming fertilizer top-dressing based on tillering stage milestones.",
      "Step 4: Keep soil well-aerated through intermittent drainage cycles.",
    ],
  },

  // Corn Common Rust (Matches reference image)
  "Corn_(maize)___Common_rust_": {
    about:
      "Common Rust is a fungal disease of maize (corn) caused by Puccinia sorghi. It commonly appears as reddish-brown, powdery pustules on the leaves and can reduce photosynthesis and yield if it spreads heavily.",
    scientificName: "Puccinia sorghi",
    pathogenType: "Fungal",
    symptoms: [
      "Small, oval to elongated cinnamon-brown powdery pustules (uredinia) scattered across both leaf surfaces.",
      "Pustules rupture the outer leaf epidermal layer, leaving rust-colored powdery spores on fingers when touched.",
      "In heavy infections, pustules coalesce, causing chlorosis, leaf blighting, and premature foliar senescence.",
      "Late in the season, pustules turn brownish-black as dark resting teliospores are formed.",
    ],
    causes: [
      "Pathogen: Puccinia sorghi (obligate biotrophic fungus).",
      "Favorable Temperatures: Moderate temperatures between 16°C and 25°C.",
      "Humidity: High relative humidity (> 95%) or prolonged night dew periods exceeding 6-8 hours.",
      "Dispersal: Spores travel hundreds of kilometers on wind currents and storm fronts.",
    ],
    prevention: [
      "Select and plant adapted corn hybrid cultivars carrying specific Rp resistance genes.",
      "Plant early in the spring to promote maturity past grain-fill before airborne spore showers arrive.",
      "Practice 2-3 year crop rotation with non-host legume or oilseed crops (soybeans, groundnut, pulses).",
      "Maintain balanced field nutrition; avoid late-stage excess nitrogen applications that prolong tender tissue susceptibility.",
    ],
    management: [
      "Routinely scout mid-canopy leaves weekly from the six-leaf whorl stage through tasseling.",
      "Maintain adequate plant spacing and row orientation to maximize field canopy airflow.",
      "Consider preventative foliar bio-fungicides (e.g. Bacillus subtilis formulations) during early rust detection.",
      "Fungicide intervention is only cost-effective on susceptible inbred seed corn or sweet corn if threshold (>5% ear leaf area) is breached before silking.",
    ],
    nextSteps: [
      "Step 1: Inspect 20 random plants across the field to estimate average pustule coverage percentage.",
      "Step 2: Check current crop growth stage; if past the blister/milk stage (R2-R3), economic yield impact is usually minimal.",
      "Step 3: Monitor 5-day weather forecast for prolonged cool, damp conditions that could accelerate spore germination.",
      "Step 4: Contact your local Krishi Vigyan Kendra (KVK) or extension agronomist before initiating any chemical application.",
    ],
  },

  // Corn Northern Leaf Blight
  "Corn_(maize)___Northern_Leaf_Blight": {
    about:
      "Northern Corn Leaf Blight (NCLB) is a serious fungal foliar disease caused by Exserohilum turcicum. It creates distinctive long, cigar-shaped grayish-green to tan lesions that can cause extensive defoliation.",
    scientificName: "Exserohilum turcicum",
    pathogenType: "Fungal",
    symptoms: [
      "Long, elliptical, cigar-shaped lesions measuring 2.5 to 15 cm in length.",
      "Lesions initially appear grayish-green and water-soaked, later turning tan and papery.",
      "Dark olive-green to black fungal sporulation visible within lesions during humid mornings.",
      "Lesions merge in severe infections, causing total leaf death resembling drought scorching.",
    ],
    causes: [
      "Pathogen: Exserohilum turcicum (syn. Helminthosporium turcicum).",
      "Environmental triggers: Temperatures between 18°C and 27°C with frequent rain or heavy dew.",
      "Overwintering: Survives as dormant mycelium and chlamydospores in infected corn residue.",
    ],
    prevention: [
      "Plant certified resistant corn hybrids featuring Ht1, Ht2, or polygenic resistance.",
      "Rotate fields away from corn for at least 1-2 years to allow residue decomposition.",
      "Perform deep post-harvest tillage where soil conservation practices permit to bury residue.",
    ],
    management: [
      "Scout lower leaves before tassel emergence to detect initial lesion development.",
      "Apply copper-based or strobilurin-containing fungicides if lesions appear on the third leaf below the ear before tasseling.",
      "Ensure balanced soil potassium levels, which enhance cell wall resistance against fungal penetration.",
    ],
    nextSteps: [
      "Confirm whether lesions are confined to lower canopy leaves or spreading toward the ear leaf.",
      "Calculate disease incidence across field quadrants.",
      "Consult regional extension bulletins to assess local NCLB outbreak pressure.",
    ],
  },

  // Tomato Early Blight
  "Tomato___Early_blight": {
    about:
      "Early Blight is one of the most common and destructive fungal diseases of tomatoes and potatoes, caused by Alternaria solani. It targets older foliage first and creates characteristic concentric 'target-board' spots.",
    scientificName: "Alternaria solani",
    pathogenType: "Fungal",
    symptoms: [
      "Dark brown to black circular lesions on older lower leaves with concentric rings resembling a target.",
      "Yellow chlorotic halos surrounding lesions as fungal toxins spread through leaf tissue.",
      "Premature leaf yellowing, withering, and dropping, exposing developing fruits to sunscald.",
      "Dark, sunken, leathery lesions at the stem end of mature tomato fruit.",
    ],
    causes: [
      "Pathogen: Alternaria solani.",
      "Weather factors: Warm temperatures (24°C-29°C) combined with intermittent wetness from dew or rain.",
      "Survival: Fungal spores overwinter in diseased plant debris, volunteer tomatoes, and solanaceous weeds.",
    ],
    prevention: [
      "Practice strict 3-to-4-year rotation avoiding all Solanaceae crops (potato, eggplant, pepper).",
      "Install drip irrigation rather than overhead sprinklers to keep foliage dry.",
      "Apply 2 to 3 inches of organic straw mulch around plant bases to prevent soil splash.",
      "Stake and prune indeterminate vines to promote vertical airflow.",
    ],
    management: [
      "Prune and safely discard infected lower foliage at the first sign of spotting; do not compost.",
      "Apply bio-fungicides such as Trichoderma harzianum or Bacillus subtilis preventative sprays.",
      "Spray copper hydroxide or fixed copper formulations early in the morning during warm, humid spells.",
      "Disinfect pruning shears with 70% isopropyl alcohol between rows.",
    ],
    nextSteps: [
      "Inspect the bottom 30 cm of tomato vines across the field.",
      "Prune affected lower leaves and dispose of them in sealed bags away from the plot.",
      "Switch irrigation timing to early morning so foliage dries quickly in the sun.",
    ],
  },

  // Tomato Late Blight
  "Tomato___Late_blight": {
    about:
      "Late Blight is an aggressive water-mold (oomycete) pathogen caused by Phytophthora infestans. Capable of destroying entire fields within a week under cool, moist conditions, it represents a high-priority plant health threat.",
    scientificName: "Phytophthora infestans",
    pathogenType: "Oomycete",
    symptoms: [
      "Irregular, water-soaked pale green lesions rapidly turning into large dark brown blotches.",
      "Delicate white cottony or downy fungal growth on leaf undersides during cool, humid mornings.",
      "Stems develop dark brown to black greasy cankers, causing entire branches to collapse.",
      "Tomatoes develop firm, dark brown, wrinkled rot that ruins fruit quality.",
    ],
    causes: [
      "Pathogen: Phytophthora infestans.",
      "Weather conditions: Cool to moderate temperatures (15°C-22°C) with persistent humidity > 90%.",
      "Spread: Wind-blown sporangia travel miles; water droplets trigger motile zoospore release.",
    ],
    prevention: [
      "Always use certified disease-free seedlings and resistant tomato cultivars (e.g. Mountain Magic, Defiant).",
      "Eliminate all volunteer potato and tomato plants around field perimeters before planting.",
      "Ensure wide plant spacing (60-75 cm) to maximize air movement.",
    ],
    management: [
      "Immediately rogue out and destroy severely diseased plants (bag and bury or burn).",
      "Apply preventative copper-based sprays prior to prolonged foggy or rainy weather.",
      "Avoid overhead irrigation; ensure excellent field drainage to prevent standing water pools.",
    ],
    nextSteps: [
      "Alert neighboring farmers if late blight is confirmed, as sporangia spread rapidly on the wind.",
      "Immediately stop overhead watering.",
      "Seek emergency guidance from local agricultural extension specialists.",
    ],
  },

  // Tomato Healthy
  "Tomato___healthy": {
    about:
      "This crop foliage displays vibrant, uniform green coloration with well-developed venation and no observable pathology, lesions, or chlorosis.",
    isHealthy: true,
    symptoms: [
      "Leaves display crisp green lamina with smooth margins and no necrotic spots.",
      "Vigorous stem growth with balanced internode spacing.",
      "No signs of wilting, mosaic mottling, powdery mildew, or insect feeding scars.",
    ],
    causes: [
      "Optimal plant health achieved through balanced moisture, adequate nutrients, and good sunlight.",
    ],
    prevention: [
      "Maintain current fertilization schedule (balanced N-P-K with micronutrients).",
      "Continue drip irrigation to prevent foliar fungal spore germination.",
      "Conduct routine twice-weekly field scouting to catch any potential pests early.",
    ],
    management: [
      "No chemical or corrective treatments are necessary.",
      "Support heavy fruit clusters with trellising or cages to prevent ground contact.",
    ],
    nextSteps: [
      "Continue standard preventive crop care practices.",
      "Monitor weather forecasts for impending high-humidity or heat-stress periods.",
    ],
  },

  // Corn Healthy
  "Corn_(maize)___healthy": {
    about:
      "The corn leaf sample demonstrates optimal physiological health, clean leaf margins, deep green color, and absence of pustules, streaks, or blights.",
    isHealthy: true,
    symptoms: [
      "Deep emerald green leaf blades without chlorotic banding or rust pustules.",
      "Strong turgor pressure and uniform leaf whorl expansion.",
      "Zero signs of fungal leaf blight, stalk rot, or viral streak.",
    ],
    causes: [
      "Adequate soil fertility, moisture availability, and suitable field microclimate.",
    ],
    prevention: [
      "Continue side-dressing nitrogen at appropriate vegetative growth stages (V6-V8).",
      "Scout mid-canopy leaves during tasseling for early airborne rust or blight detection.",
    ],
    management: [
      "No therapeutic treatment needed.",
      "Maintain clean weed-free inter-row spaces to conserve soil moisture.",
    ],
    nextSteps: [
      "Log healthy scan in farm records to track seasonal baseline crop vigor.",
      "Ensure sufficient irrigation during critical silking and pollination phases.",
    ],
  },

  // Potato Early Blight
  "Potato___Early_blight": {
    about:
      "Potato Early Blight is caused by Alternaria solani. It targets mature leaves and can significantly reduce tuber size and overall harvest yield.",
    scientificName: "Alternaria solani",
    pathogenType: "Fungal",
    symptoms: [
      "Brown to black circular or angular spots with distinct concentric rings on mature leaves.",
      "Yellow chlorosis around spots; affected leaves dry up and droop along the stem.",
      "Tubers can develop dark, sunken, corky lesions beneath the skin during storage.",
    ],
    causes: [
      "Alternaria solani; favored by warm temperatures (22°C-28°C) and alternating wet and dry foliage cycles.",
    ],
    prevention: [
      "Maintain balanced crop nutrition; nitrogen-deficient crops are significantly more susceptible.",
      "Rotate with non-solanaceous crops (cereals, legumes) for at least 3 years.",
      "Allow potato skins to fully mature before harvest to prevent spore entry into tubers.",
    ],
    management: [
      "Apply protective copper or mancozeb sprays at the first sign of lower leaf spotting.",
      "Irrigate early in the morning so sun can dry leaves within 2-3 hours.",
    ],
    nextSteps: [
      "Check lower 20% of canopy across potato ridges.",
      "Remove heavily infected lower foliage.",
      "Consult local agronomist for pre-harvest skin set timing.",
    ],
  },

  // Potato Late Blight
  "Potato___Late_blight": {
    about:
      "Late Blight on potato caused by Phytophthora infestans is historically infamous for causing the Irish Potato Famine. It attacks leaves, stems, and tubers with rapid destruction.",
    scientificName: "Phytophthora infestans",
    pathogenType: "Oomycete",
    symptoms: [
      "Water-soaked dark green to purplish-brown lesions rapidly expanding on leaf tips and margins.",
      "White downy fungal ring visible on leaf undersides in humid morning weather.",
      "Infected tubers show dry, granular, reddish-brown rot extending 5-15 mm below the skin.",
    ],
    causes: [
      "Phytophthora infestans; cool moist conditions (10°C-20°C, >90% RH).",
    ],
    prevention: [
      "Plant only certified disease-free seed tubers.",
      "Hill up soil well around potato rows to protect tubers from spores washed down by rain.",
      "Destroy all cull piles and volunteer potatoes near field borders.",
    ],
    management: [
      "Apply preventative copper hydroxide sprays before humid rainy spells.",
      "Destroy vine canopy 2 weeks before harvest if late blight is present to protect tubers.",
    ],
    nextSteps: [
      "Scout low-lying field sections and shaded borders first.",
      "Notify regional extension officers upon confirmed identification.",
    ],
  },

  // Apple Scab
  "Apple___Apple_scab": {
    about:
      "Apple Scab is caused by Venturia inaequalis. It produces olive-green to black velvety spots on leaves and scabby lesions on fruit, reducing marketability.",
    scientificName: "Venturia inaequalis",
    pathogenType: "Fungal",
    symptoms: [
      "Velvety olive-green to dark brown circular spots on leaf surfaces.",
      "Leaves become distorted, puckered, and may drop prematurely.",
      "Fruit develops rough, dark, corky scabs that cause cracking and deformation.",
    ],
    causes: [
      "Venturia inaequalis; cool, wet spring weather during bud burst and early petal fall.",
    ],
    prevention: [
      "Plant scab-resistant apple cultivars (e.g. Liberty, Enterprise, Prima).",
      "Rake and shred or compost fallen apple leaves in autumn to eliminate overwintering spores.",
      "Prune orchard trees annually to ensure open, well-ventilated canopy architecture.",
    ],
    management: [
      "Apply sulfur-based or bio-fungicide sprays during early green-tip and tight-cluster stages.",
      "Maintain protective cover sprays during prolonged spring rain events.",
    ],
    nextSteps: [
      "Monitor Mills infection periods based on hours of leaf wetness and temperature.",
      "Inspect spur leaves for early velvety spots.",
    ],
  },

  // Generic Fallback Handler
  default: {
    about:
      "This condition was screened by FarmDoctor AI's computer vision pipeline trained on the 38-class PlantVillage botanical dataset. Field verification is always recommended before executing treatment.",
    symptoms: [
      "Observe leaf blade, margins, and petiole for localized chlorosis, necrosis, or discoloration.",
      "Examine leaf undersides with a 10x hand lens for fungal sporulation or insect feeding signs.",
      "Note whether symptoms appear uniformly or on isolated lower or upper canopy leaves.",
    ],
    causes: [
      "Plant pathology can be triggered by fungal spores, bacterial exudates, viruses, or abiotic stressors.",
      "Environmental stress factors (extreme heat, drought, waterlogging, nutrient deficiency) accelerate susceptibility.",
    ],
    prevention: [
      "Ensure proper crop rotation, certified disease-free planting material, and balanced soil fertility.",
      "Avoid overhead watering that keeps foliage wet for prolonged periods.",
      "Sanitize pruning tools and equipment between field plots.",
    ],
    management: [
      "Remove and safely dispose of heavily infected plant tissue.",
      "Favor biological controls and approved organic protective formulations where appropriate.",
      "Never apply unregistered synthetic pesticides without agricultural officer confirmation.",
    ],
    nextSteps: [
      "Step 1: Collect a fresh, representative leaf sample displaying boundary symptoms.",
      "Step 2: Place sample in a clean paper envelope (avoid airtight plastic).",
      "Step 3: Consult your nearest Krishi Vigyan Kendra (KVK) or agricultural extension specialist.",
    ],
  },
};

/**
 * Helper to fetch structured 6-tab knowledge for any predicted class
 */
export function getScannerTabKnowledge(
  rawClass: string,
  crop: string,
  condition: string,
  isUncertain?: boolean
): DiseaseTabInfo {
  // If uncertain, return safety-first field verification guidance
  if (isUncertain) {
    return {
      about: `The AI model detected low statistical confidence for this image. The closest mathematical visual pattern corresponded to "${crop} - ${condition}", but this should NOT be considered a confirmed diagnosis. Field verification is strongly recommended.`,
      symptoms: [
        `Tentative pattern match: ${condition}.`,
        "Check whether visible symptoms include spots, wilting, curling, or insect presence.",
        "Note: The PlantVillage dataset does NOT contain insect or non-leaf classes. Any insect, soil, or weed photo will produce an unconfirmed prediction.",
      ],
      causes: [
        "Uncertainty may be caused by: non-leaf subjects, camera blur, extreme shadows, lighting glare, or a crop disease outside the 38 PlantVillage classes.",
      ],
      prevention: [
        "Do NOT initiate chemical fungicide or insecticide treatments based solely on an uncertain screening.",
        "Take a new leaf photo following the photography guide: single leaf, natural daylight, in sharp focus.",
      ],
      management: [
        "Consult a local agronomy expert or extension officer with a physical plant sample.",
        "Scout the field to determine if symptoms are widespread or confined to individual plants.",
      ],
      nextSteps: [
        "Step 1: Retake the photo in natural daylight with the leaf flat and in sharp focus.",
        "Step 2: If the problem persists, take a physical leaf sample to your local agricultural office.",
        "Step 3: Consult our AI Assistant in Hindi or English for preliminary scout questions.",
      ],
    };
  }

  // Exact match in DB
  if (SCANNER_KNOWLEDGE_DB[rawClass]) {
    return SCANNER_KNOWLEDGE_DB[rawClass];
  }

  // If healthy
  if (condition.toLowerCase().includes("healthy")) {
    return {
      about: `The ${crop} leaf sample appears healthy with no signs of active fungal, bacterial, or viral pathology detected by the 38-class screening model.`,
      isHealthy: true,
      symptoms: [
        "Uniform leaf coloration with intact epidermal margins.",
        "Zero signs of powdery mildew, leaf blight, or necrotic spots.",
        "Normal vascular vein development.",
      ],
      causes: [
        "Healthy vegetative growth supported by balanced soil nutrients and proper irrigation.",
      ],
      prevention: [
        "Continue routine balanced fertilization and drip irrigation.",
        "Inspect crops weekly to catch early pest or pathogen incursions.",
      ],
      management: [
        "No chemical or corrective treatments are necessary.",
      ],
      nextSteps: [
        "Log this healthy scan in your farm records.",
        "Continue standard preventative agronomic practices.",
      ],
    };
  }

  // Fallback to default
  const fallback = SCANNER_KNOWLEDGE_DB["default"];
  return {
    ...fallback,
    about: `${condition} in ${crop}: ${fallback.about}`,
  };
}
