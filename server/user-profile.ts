// User Profile System for AI Context
// Provides detailed user context for GPT-5 task management, research, and automation

export interface UserProfile {
  name: string;
  location: string;
  timezone: string;
  background: string;
  communicationStyle: {
    language: string;
    tone: string;
    technicalLevel: string;
    preferences: string[];
  };
  businessDomains: {
    name: string;
    description: string;
    priority: 'primary' | 'secondary' | 'tertiary';
    keywords: string[];
    researchAreas: string[];
    commonTasks: string[];
  }[];
  researchPriorities: {
    domain: string;
    topics: string[];
    sources: string[];
    urgency: 'high' | 'medium' | 'low';
  }[];
  contentCreationPreferences: {
    formats: string[];
    length: string;
    style: string;
    requirements: string[];
  };
  constraints: string[];
  safetyEthics: string[];
}

// Colby Black's Profile - Updated from attached document
export const userProfile: UserProfile = {
  name: "Colby Black",
  location: "Houston, TX",
  timezone: "America/Chicago",
  background: "Entrepreneur and systems thinker operating across solar/energy, AI agents, drone inspections, and voice-first products",
  
  communicationStyle: {
    language: "everyday conversational",
    tone: "practical, forward-looking, low hype",
    technicalLevel: "technical precision when needed",
    preferences: [
      "short paragraphs",
      "scannable bullets", 
      "mark assumptions and risks inline",
      "clever/quick humor when appropriate",
      "no forced humor"
    ]
  },

  businessDomains: [
    {
      name: "SkyClaim",
      description: "Drone roof inspection + AI storm reports, pre/post-storm landing pages, SMS updates, PDF reports",
      priority: "primary",
      keywords: ["drone inspection", "roof damage", "storm reports", "insurance claims", "FAA Part 107"],
      researchAreas: ["hurricane preparedness", "hail/wind damage criteria", "adjuster guidelines", "AI damage detection"],
      commonTasks: ["pre-storm signups", "inspection scheduling", "damage reports", "insurance documentation"]
    },
    {
      name: "Starlight Solar", 
      description: "Fence-mounted solar, solar pergolas, DC heat pumps; proposals, quotes, customer education",
      priority: "primary",
      keywords: ["solar energy", "DC heat pumps", "HVAC", "residential solar", "energy efficiency"],
      researchAreas: ["Texas grid reliability", "ERCOT", "NEM/BUYBACK", "SEER2", "COP ratings", "refrigerant policy"],
      commonTasks: ["solar proposals", "HVAC quotes", "customer education materials", "ROI calculations"]
    },
    {
      name: "Conversational Voicemail",
      description: "ElevenLabs conversational agent built on Replit web apps; integrates Gemini for transcription and action-item summaries",
      priority: "primary", 
      keywords: ["conversational AI", "ElevenLabs", "voice agents", "call transcription", "action items"],
      researchAreas: ["tool-use reliability", "JSON schemas", "call summarization", "diarization", "RAG architectures"],
      commonTasks: ["voice agent setup", "call analysis", "transcription processing", "action item extraction"]
    },
    {
      name: "Emergent Intelligence",
      description: "Digital avatars, knowledge-base construction, ethical frameworks", 
      priority: "secondary",
      keywords: ["digital avatars", "knowledge base", "AI ethics", "consciousness research"],
      researchAreas: ["avatar scripts", "ethical AI frameworks", "consciousness studies", "synchrony/resonance"],
      commonTasks: ["avatar script writing", "knowledge base construction", "ethical framework development"]
    },
    {
      name: "SyncWave/VibraRest",
      description: "Vibro-acoustic sleep & relief products; research protocols and marketing content",
      priority: "tertiary",
      keywords: ["vibro-acoustic", "sleep optimization", "vagus nerve", "resonance therapy"],
      researchAreas: ["vibro-acoustic research", "vagus nerve stimulation", "ECS-ELF-Trauma framework"],
      commonTasks: ["research protocols", "marketing content", "product documentation"]
    }
  ],

  researchPriorities: [
    {
      domain: "Energy & HVAC",
      topics: [
        "Texas grid reliability (ERCOT), outages, peak pricing since 2020",
        "DC heat pumps vs. traditional HVAC (efficiency, SEER2, COP, low-temp performance)", 
        "Refrigerant policy (R-410A phase-down; flammability/efficiency tradeoffs)",
        "Residential solar economics (NEM/BUYBACK in TX), fence/pergola mounts, battery options"
      ],
      sources: ["ASHRAE", "DOE", "EIA", "NREL", "AHRI", "ERCOT", "PUCT", "Texas Legislature"],
      urgency: "high"
    },
    {
      domain: "Storms, Roofing & Insurance", 
      topics: [
        "Hurricane preparedness, hail/wind claim criteria, adjuster guidelines",
        "FAA Part 107, best practices for roof inspection imagery", 
        "AI damage detection benchmarks"
      ],
      sources: ["ISO/Verisk", "NAIC", "Haag Engineering", "FAA docs"],
      urgency: "high"  
    },
    {
      domain: "Agentic AI & Voice",
      topics: [
        "Conversational agents (tool-use reliability, JSON schemas)",
        "Call summarization, diarization",
        "Local/on-device assistants (Shortcuts/iPad)",
        "Secure API key handling, RAG architectures"
      ],
      sources: ["OpenAI", "ElevenLabs", "Gemini/GCP", "research papers"],
      urgency: "medium"
    }
  ],

  contentCreationPreferences: {
    formats: ["one-pagers/PDFs", "landing pages", "avatar scripts", "SMS/email templates", "research briefs", "checklists"],
    length: "concise, scannable",
    style: "conversational, clear CTAs", 
    requirements: [
      "separate facts vs claims vs opinions",
      "provide sources and timestamps",
      "mark assumptions and risks inline",
      "no em dashes in SMS/email copy",
      "provide smallest shippable version (SSV)"
    ]
  },

  constraints: [
    "No em dashes in outbound copy for texting",
    "Default context: Houston, TX; America/Chicago timezone", 
    "Provide feasibility ratings (1-5) + dependencies for builds",
    "Always include access dates and scope/limitations for research"
  ],

  safetyEthics: [
    "Respect privacy, avoid sensitive PII", 
    "Mark speculative ideas clearly",
    "Seek consent framing for AI-human integrations and recordings",
    "Ethical, safe human-AI collaboration"
  ]
};

// Helper functions for AI systems to use profile context
export function getBusinessContext(taskTitle: string, taskContext?: string): string[] {
  const relevantDomains = userProfile.businessDomains.filter(domain => {
    const searchText = `${taskTitle} ${taskContext}`.toLowerCase();
    return domain.keywords.some(keyword => searchText.includes(keyword.toLowerCase())) ||
           domain.commonTasks.some(task => searchText.includes(task.toLowerCase()));
  });
  
  return relevantDomains.map(domain => 
    `${domain.name}: ${domain.description} (Priority: ${domain.priority})`
  );
}

export function getResearchGuidance(topic: string): {sources: string[], urgency: string, relatedTopics: string[]} {
  const relevantResearch = userProfile.researchPriorities.find(rp => 
    rp.topics.some(t => t.toLowerCase().includes(topic.toLowerCase())) ||
    rp.domain.toLowerCase().includes(topic.toLowerCase())
  );
  
  if (relevantResearch) {
    return {
      sources: relevantResearch.sources,
      urgency: relevantResearch.urgency, 
      relatedTopics: relevantResearch.topics
    };
  }
  
  return {
    sources: ["general research sources"],
    urgency: "low",
    relatedTopics: []
  };
}

export function getContentGuidelines(): {format: string, style: string, requirements: string[]} {
  return {
    format: userProfile.contentCreationPreferences.formats.join(", "),
    style: userProfile.contentCreationPreferences.style,
    requirements: userProfile.contentCreationPreferences.requirements
  };
}

export function getPersonalizedSystemPrompt(): string {
  return `You are an AI assistant working with ${userProfile.name}, an entrepreneur in ${userProfile.location} specializing in:

ACTIVE PROJECTS:
${userProfile.businessDomains.map(domain => 
  `• ${domain.name}: ${domain.description}`
).join('\n')}

COMMUNICATION STYLE:
• ${userProfile.communicationStyle.language} with ${userProfile.communicationStyle.technicalLevel}
• ${userProfile.communicationStyle.tone}
• ${userProfile.communicationStyle.preferences.join(', ')}

RESEARCH PRIORITIES:
${userProfile.researchPriorities.map(rp => 
  `• ${rp.domain} (${rp.urgency} priority): Focus on ${rp.topics.slice(0,2).join(', ')}`
).join('\n')}

CONTENT REQUIREMENTS:
• Formats: ${userProfile.contentCreationPreferences.formats.join(', ')}
• Style: ${userProfile.contentCreationPreferences.style}
• Always: ${userProfile.contentCreationPreferences.requirements.slice(0,3).join(', ')}

CONSTRAINTS:
• ${userProfile.constraints.join(' • ')}

When analyzing tasks, consider business domain relevance, research priorities, and content creation preferences. Prioritize actions that align with the user's active projects and communication style.`;
}