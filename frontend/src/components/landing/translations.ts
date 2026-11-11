export type Language = "en" | "hi";

export interface Translations {
  logoSubtitle: string;
  nav: {
    home: string;
    features: string;
    howItWorks: string;
    crops: string;
    advisory: string;
    about: string;
    signIn: string;
    getStarted: string;
    dashboard: string;
  };
  hero: {
    badge: string;
    titleStart: string;
    titleHighlight: string;
    description: string;
    scanButton: string;
    exploreButton: string;
    benefit1: string;
    benefit2: string;
    benefit3: string;
    exampleBadge: string;
    exampleCondition: string;
    exampleCrop: string;
    confidenceLabel: string;
    viewGuidance: string;
  };
  highlightStrip: {
    diseaseDetection: { title: string; desc: string };
    aiAssistant: { title: string; desc: string };
    planner: { title: string; desc: string };
    weather: { title: string; desc: string };
    cropLibrary: { title: string; desc: string };
    advisoryHub: { title: string; desc: string };
  };
  howItWorks: {
    title: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };
  keyFeatures: {
    titleStart: string;
    titleHighlight: string;
    card1: { title: string; desc: string; button: string };
    card2: { title: string; desc: string; button: string };
    card3: { title: string; desc: string; button: string };
    card4: { title: string; desc: string; button: string };
    card5: { title: string; desc: string; button: string };
    card6: { title: string; desc: string; button: string };
  };
  diseaseShowcase: {
    title: string;
    subtitle: string;
    healthyVsDiseased: string;
    interactiveDemoTitle: string;
    selectLeaf: string;
    confidenceRate: string;
    aiDiagnosticStatus: string;
    viewFullReport: string;
    openRealScanner: string;
    exampleDisclaimer: string;
  };
  whyChoose: {
    titleStart: string;
    titleHighlight: string;
    benefit1: string;
    benefit2: string;
    benefit3: string;
    benefit4: string;
    benefit5: string;
    benefit6: string;
  };
  cta: {
    title: string;
    description: string;
    button: string;
  };
  footer: {
    tagline: string;
    quickLinks: string;
    support: string;
    legal: string;
    followUs: string;
    faq: string;
    contact: string;
    privacy: string;
    terms: string;
    disclaimer: string;
    copyright: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    logoSubtitle: "AI for Healthy Crops",
    nav: {
      home: "Home",
      features: "Features",
      howItWorks: "How It Works",
      crops: "Crops",
      advisory: "Advisory",
      about: "About",
      signIn: "Sign In",
      getStarted: "Get Started",
      dashboard: "Go to Dashboard",
    },
    hero: {
      badge: "Smart Agriculture AI",
      titleStart: "Detect, Diagnose & Protect Your Crops ",
      titleHighlight: "with AI",
      description:
        "An intelligent farming platform that helps farmers identify crop diseases, get expert advice, plan farm activities, and make better farming decisions.",
      scanButton: "Scan Your Crop Now",
      exploreButton: "Explore Features",
      benefit1: "Early Disease Detection",
      benefit2: "Expert Advice",
      benefit3: "Data-Driven Farming",
      exampleBadge: "Disease Detected (Example Only)",
      exampleCondition: "Common Rust",
      exampleCrop: "Corn",
      confidenceLabel: "Confidence",
      viewGuidance: "View Guidance",
    },
    highlightStrip: {
      diseaseDetection: {
        title: "Disease Detection",
        desc: "Identify crop diseases from leaf photos",
      },
      aiAssistant: {
        title: "AI Farming Assistant",
        desc: "Get farming answers in English & Hindi",
      },
      planner: {
        title: "Farming Planner",
        desc: "Plan irrigation, fertilizer and field tasks",
      },
      weather: {
        title: "Weather Insights",
        desc: "Real-time weather & farming recommendations",
      },
      cropLibrary: {
        title: "Crop Library",
        desc: "Learn about crops, diseases and management",
      },
      advisoryHub: {
        title: "Advisory Hub",
        desc: "Science-backed farming guidance",
      },
    },
    howItWorks: {
      title: "How It Works?",
      step1Title: "Upload Leaf Photo",
      step1Desc: "Take or upload a clear crop leaf image",
      step2Title: "AI Analyzes",
      step2Desc: "Our model analyzes the image",
      step3Title: "Get Diagnosis & Guidance",
      step3Desc: "Know the possible disease and get practical solutions",
    },
    keyFeatures: {
      titleStart: "Key Features of ",
      titleHighlight: "FarmDoctor AI",
      card1: {
        title: "Disease Scanner",
        desc: "Upload crop leaf photos and get AI-powered disease screening.",
        button: "Open Disease Scanner",
      },
      card2: {
        title: "AI Farming Assistant",
        desc: "Ask your farming questions in Hindi or English.",
        button: "Explore AI Assistant",
      },
      card3: {
        title: "Farming Planner",
        desc: "Plan irrigation, fertilizer and other farming activities.",
        button: "Open Farming Planner",
      },
      card4: {
        title: "Weather & Advisory",
        desc: "Get real-time weather and crop-specific recommendations.",
        button: "Explore Weather",
      },
      card5: {
        title: "Crop Library",
        desc: "Explore various crops, common diseases and best practices.",
        button: "Explore Crop Library",
      },
      card6: {
        title: "Advisory Hub",
        desc: "Verified, research-based farming guidance and updates.",
        button: "Explore Advisory Hub",
      },
    },
    diseaseShowcase: {
      title: "Disease Detection in Action",
      subtitle:
        "Understand how our computer vision pipeline extracts leaf symptoms, estimates uncertainty, and matches clinical treatments.",
      healthyVsDiseased: "Healthy vs Diseased Leaf Patterns",
      interactiveDemoTitle: "Live Interactive Leaf Diagnostics Demo",
      selectLeaf: "Select a sample leaf to simulate diagnostic screening:",
      confidenceRate: "AI Model Confidence",
      aiDiagnosticStatus: "Diagnostic Status",
      viewFullReport: "View Full Advisory Report",
      openRealScanner: "Scan Your Own Crop Leaf Now",
      exampleDisclaimer:
        "Illustrative example preview only. For real live screening, upload your crop photos to the Disease Scanner connected to our PyTorch EfficientNet-B0 model.",
    },
    whyChoose: {
      titleStart: "Why Choose ",
      titleHighlight: "FarmDoctor AI?",
      benefit1: "AI-Powered Crop Screening",
      benefit2: "Multiple Crop Support",
      benefit3: "Easy to Use",
      benefit4: "Hindi & English Support",
      benefit5: "Weather-Aware Guidance",
      benefit6: "Practical & Farmer-Friendly",
    },
    cta: {
      title: "Start Farming Smarter Today",
      description:
        "Bring intelligent crop care and farming guidance to your fingertips.",
      button: "Get Started",
    },
    footer: {
      tagline: "AI for Healthy Crops",
      quickLinks: "Quick Links",
      support: "Support",
      legal: "Legal",
      followUs: "Follow Us",
      faq: "Help & FAQ",
      contact: "Contact Us",
      privacy: "Privacy Policy",
      terms: "Terms & Conditions",
      disclaimer:
        "FarmDoctor AI is an intelligent agricultural decision-support tool. Predictions are screening recommendations and should be verified with local agronomy experts before major chemical applications.",
      copyright: "© 2026 FarmDoctor AI. All rights reserved.",
    },
  },
  hi: {
    logoSubtitle: "स्वस्थ फसलों के लिए एआई",
    nav: {
      home: "होम",
      features: "सुविधाएं",
      howItWorks: "यह कैसे काम करता है",
      crops: "फसलें",
      advisory: "सलाह",
      about: "हमारे बारे में",
      signIn: "साइन इन",
      getStarted: "शुरू करें",
      dashboard: "डैशबोर्ड पर जाएं",
    },
    hero: {
      badge: "स्मार्ट कृषि एआई",
      titleStart: "एआई के साथ अपनी फसलों की पहचान, निदान और सुरक्षा करें ",
      titleHighlight: "",
      description:
        "एक बुद्धिमान कृषि मंच जो किसानों को फसल रोगों की पहचान करने, विशेषज्ञ सलाह लेने, कृषि गतिविधियों की योजना बनाने और बेहतर निर्णय लेने में मदद करता है।",
      scanButton: "अभी फसल स्कैन करें",
      exploreButton: "सुविधाएं देखें",
      benefit1: "रोग की शीघ्र पहचान",
      benefit2: "विशेषज्ञ सलाह",
      benefit3: "डेटा-आधारित कृषि",
      exampleBadge: "रोग पहचाना गया (केवल उदाहरण)",
      exampleCondition: "कॉमन रस्ट (गेरुआ)",
      exampleCrop: "मक्का",
      confidenceLabel: "सटीकता",
      viewGuidance: "मार्गदर्शन देखें",
    },
    highlightStrip: {
      diseaseDetection: {
        title: "रोग पहचान",
        desc: "पत्ती की तस्वीरों से फसल रोगों की पहचान करें",
      },
      aiAssistant: {
        title: "एआई कृषि सहायक",
        desc: "हिंदी और अंग्रेजी में कृषि संबंधी उत्तर पाएं",
      },
      planner: {
        title: "कृषि योजनाकार",
        desc: "सिंचाई, उर्वरक और खेत के कार्यों की योजना बनाएं",
      },
      weather: {
        title: "मौसम पूर्वानुमान",
        desc: "सटीक मौसम और कृषि के अनुकूल सिफारिशें",
      },
      cropLibrary: {
        title: "फसल लाइब्रेरी",
        desc: "फसलों, रोगों और उचित प्रबंधन के बारे में जानें",
      },
      advisoryHub: {
        title: "सलाह केंद्र",
        desc: "अनुसंधान और विज्ञान आधारित खेती की सलाह",
      },
    },
    howItWorks: {
      title: "यह कैसे काम करता है?",
      step1Title: "पत्ती का फोटो अपलोड करें",
      step1Desc: "प्रभावित फसल की पत्ती की स्पष्ट तस्वीर लें या अपलोड करें",
      step2Title: "एआई विश्लेषण",
      step2Desc: "हमारा मॉडल तुरंत पत्ती के लक्षणों का विश्लेषण करता है",
      step3Title: "निदान और समाधान पाएं",
      step3Desc: "रोग की संभावना जानें और व्यावहारिक समाधान प्राप्त करें",
    },
    keyFeatures: {
      titleStart: "FarmDoctor AI की ",
      titleHighlight: "मुख्य विशेषताएं",
      card1: {
        title: "रोग स्कैनर",
        desc: "पत्ती की तस्वीर अपलोड करें और एआई-संचालित रोग स्क्रीनिंग प्राप्त करें।",
        button: "रोग स्कैनर खोलें",
      },
      card2: {
        title: "एआई कृषि सहायक",
        desc: "हिंदी या अंग्रेजी में अपने कृषि संबंधी प्रश्न पूछें।",
        button: "एआई सहायक देखें",
      },
      card3: {
        title: "कृषि योजनाकार",
        desc: "सिंचाई, उर्वरक और अन्य खेत की गतिविधियों की योजना बनाएं।",
        button: "योजनाकार खोलें",
      },
      card4: {
        title: "मौसम और सलाह",
        desc: "स्थानीय मौसम और फसल-विशिष्ट सिफारिशें प्राप्त करें।",
        button: "मौसम देखें",
      },
      card5: {
        title: "फसल लाइब्रेरी",
        desc: "विभिन्न फसलों, सामान्य रोगों और सर्वोत्तम प्रथाओं का अध्ययन करें।",
        button: "फसल लाइब्रेरी देखें",
      },
      card6: {
        title: "सलाह केंद्र",
        desc: "प्रमाणित, अनुसंधान-आधारित कृषि मार्गदर्शन और नवीनतम अपडेट।",
        button: "सलाह केंद्र देखें",
      },
    },
    diseaseShowcase: {
      title: "रोग पहचान प्रणाली का प्रदर्शन",
      subtitle:
        "देखें कि कैसे हमारा कंप्यूटर विजन मॉडल पत्ती के लक्षणों का विश्लेषण करता है और प्रमाणित उपचार प्रदान करता है।",
      healthyVsDiseased: "स्वस्थ बनाम रोगग्रस्त पत्तियों के लक्षण",
      interactiveDemoTitle: "इंटरैक्टिव पत्ती निदान डेमो",
      selectLeaf: "निदान अनुकरण करने के लिए एक पत्ती चुनें:",
      confidenceRate: "एआई मॉडल सटीकता",
      aiDiagnosticStatus: "निदान स्थिति",
      viewFullReport: "विस्तृत सलाह रिपोर्ट देखें",
      openRealScanner: "अपनी वास्तविक फसल की पत्ती अभी स्कैन करें",
      exampleDisclaimer:
        "यह केवल एक सांकेतिक उदाहरण है। वास्तविक फसल पत्ती की जांच के लिए हमारे PyTorch EfficientNet-B0 मॉडल से जुड़े रोग स्कैनर का उपयोग करें।",
    },
    whyChoose: {
      titleStart: "FarmDoctor AI ",
      titleHighlight: "क्यों चुनें?",
      benefit1: "एआई-संचालित फसल स्क्रीनिंग",
      benefit2: "विभिन्न फसलों का समर्थन",
      benefit3: "सरल और आसान उपयोग",
      benefit4: "हिंदी और अंग्रेजी भाषा समर्थन",
      benefit5: "मौसम-आधारित कृषि सलाह",
      benefit6: "व्यावहारिक व किसान-हितैषी",
    },
    cta: {
      title: "आज ही स्मार्ट खेती की शुरुआत करें",
      description:
        "अपनी उंगलियों पर बुद्धिमान फसल देखभाल और कृषि मार्गदर्शन लाएं।",
      button: "शुरू करें",
    },
    footer: {
      tagline: "स्वस्थ फसलों के लिए एआई",
      quickLinks: "त्वरित लिंक",
      support: "सहायता",
      legal: "कानूनी",
      followUs: "सोशल मीडिया",
      faq: "सहायता एवं प्रश्न",
      contact: "संपर्क करें",
      privacy: "गोपनीयता नीति",
      terms: "नियम एवं शर्तें",
      disclaimer:
        "FarmDoctor AI एक कृषि निर्णय-सहायता मंच है। परिणाम केवल स्क्रीनिंग सिफारिशें हैं और रासायनिक छिड़काव से पहले स्थानीय कृषि विशेषज्ञों से परामर्श आवश्यक है।",
      copyright: "© 2026 FarmDoctor AI. सर्वाधिकार सुरक्षित।",
    },
  },
};
