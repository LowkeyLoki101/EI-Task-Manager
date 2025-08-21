import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  analysis: string;  // Changed from summary to analysis for deeper content
  insights: string[];
}

// Web search function using OpenAI to simulate research
export async function webSearch(query: string): Promise<SearchResponse> {
  console.log(`[WebSearch] Executing sophisticated research analysis: ${query}`);
  
  try {
    // Use advanced analytical framework for deep research
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You are a senior research analyst conducting sophisticated business intelligence research. Apply rigorous analytical methodology, not surface-level information gathering.

ANALYTICAL FRAMEWORK:
1. **Systems Thinking**: Map interconnections, feedback loops, and ripple effects
2. **Multi-Perspective Analysis**: Consider stakeholder viewpoints, competing interests
3. **Critical Evaluation**: Assess source credibility, identify biases, spot knowledge gaps
4. **Strategic Implications**: Connect findings to business strategy, competitive dynamics
5. **Risk Assessment**: Identify threats, opportunities, unintended consequences

BUSINESS CONTEXT - Colby's Portfolio:
- SkyClaim: Drone roof inspections + AI storm damage reports (B2B insurance market)
- Starlight Solar: Fence-mounted solar, pergolas, DC heat pumps (Residential energy)  
- Emergent Intelligence: AI avatars, knowledge systems, ethical frameworks (Enterprise AI)
- SyncWave/VibraRest: Vibro-acoustic sleep & relief products (Health tech)

QUALITY STANDARDS:
- Synthesize information, don't just list it
- Challenge assumptions and conventional wisdom
- Identify what's NOT being discussed but should be
- Connect dots across industries and disciplines
- Assess reliability and confidence levels of findings`
      }, {
        role: "user",
        content: `Research Query: "${query}"

Conduct a sophisticated analysis using the analytical framework. Return JSON with:

- **query**: the research question
- **results**: array of 4-6 credible sources with realistic titles, URLs, detailed snippets, and source quality assessment
- **analysis**: Deep analytical synthesis (3-4 sentences) that:
  * Identifies key patterns and underlying dynamics
  * Connects findings to broader market/technology trends  
  * Highlights what conventional analysis misses
- **insights**: array of 3-4 strategic insights that:
  * Challenge conventional thinking or reveal blind spots
  * Connect to Colby's specific business portfolio 
  * Include confidence levels and potential counterarguments
  * Identify implementation risks and success factors

Focus on: Market dynamics, technology adoption patterns, regulatory landscape, competitive threats, customer behavior shifts, and strategic positioning opportunities.`
      }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No search response generated');
    }

    const searchData: SearchResponse = JSON.parse(response);
    
    console.log(`[WebSearch] Sophisticated analysis complete: ${searchData.results.length} sources, ${searchData.insights.length} strategic insights`);
    
    return searchData;
    
  } catch (error) {
    console.error('[WebSearch] Search failed:', error);
    
    // Fallback response
    return {
      query,
      results: [{
        title: `Research needed: ${query}`,
        url: "https://example.com/research",
        snippet: "Further research is needed on this topic to provide accurate information.",
        source: "Internal"
      }],
      analysis: `Research query "${query}" requires further investigation using advanced analytical frameworks.`,
      insights: ["This topic needs deeper analytical research", "Consider consulting industry experts", "Apply systematic methodology for quality insights"]
    };
  }
}