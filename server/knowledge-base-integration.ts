import { KnowledgeBaseSystem } from "./knowledge-base-system";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

export class KnowledgeBaseRAG {
  private kbSystem: KnowledgeBaseSystem;
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.kbSystem = new KnowledgeBaseSystem(sessionId);
  }

  /**
   * Query the knowledge base for relevant information about previous work
   */
  async queryPreviousWork(query: string): Promise<{
    hasRelevantWork: boolean;
    previousInsights: string[];
    relatedEntries: any[];
    recommendations: string[];
  }> {
    try {
      // Search for relevant entries in knowledge base
      const searchResults = await this.kbSystem.searchEntries(query, { limit: 10 });
      
      if (!searchResults || searchResults.length === 0) {
        return {
          hasRelevantWork: false,
          previousInsights: [],
          relatedEntries: [],
          recommendations: [`No previous work found on "${query}". This appears to be a new research area.`]
        };
      }

      // Use GPT to analyze the found entries and generate insights
      const analysisPrompt = `Analyze these knowledge base entries to determine if we've already done similar work:

Query: "${query}"

Previous Knowledge Base Entries:
${searchResults.map((entry, i) => `${i+1}. ${entry.title}\n${entry.content.substring(0, 500)}...`).join('\n\n')}

Provide:
1. Summary of previous work done on this topic
2. Key insights already discovered
3. What gaps remain or what new angles could be explored
4. Recommendations on whether to build on existing work vs start fresh

Format as JSON:
{
  "hasRelevantWork": true/false,
  "previousInsights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        hasRelevantWork: analysis.hasRelevantWork || false,
        previousInsights: analysis.previousInsights || [],
        relatedEntries: searchResults,
        recommendations: analysis.recommendations || []
      };

    } catch (error) {
      console.error('[KnowledgeBaseRAG] Query failed:', error);
      return {
        hasRelevantWork: false,
        previousInsights: [],
        relatedEntries: [],
        recommendations: ['Error accessing knowledge base. Proceeding with new research.']
      };
    }
  }

  /**
   * Check if a task or research topic is repetitive
   */
  async checkForRepetitiveContent(taskTitle: string, description?: string): Promise<{
    isRepetitive: boolean;
    similarCount: number;
    suggestions: string[];
  }> {
    try {
      const searchQuery = `${taskTitle} ${description || ''}`;
      const results = await this.queryPreviousWork(searchQuery);
      
      // Count how many similar entries exist
      const similarCount = results.relatedEntries.length;
      const threshold = 3; // Consider repetitive if 3+ similar entries exist

      return {
        isRepetitive: similarCount >= threshold,
        similarCount,
        suggestions: results.hasRelevantWork 
          ? ['Build on existing knowledge instead of starting fresh', ...results.recommendations]
          : ['This appears to be new ground - proceed with research']
      };

    } catch (error) {
      console.error('[KnowledgeBaseRAG] Repetition check failed:', error);
      return {
        isRepetitive: false,
        similarCount: 0,
        suggestions: ['Unable to check for repetitive content - proceed with caution']
      };
    }
  }

  /**
   * Get knowledge base context for AI decision making
   */
  async getContextForDecision(context: string): Promise<string> {
    try {
      const results = await this.queryPreviousWork(context);
      
      if (!results.hasRelevantWork) {
        return `No previous knowledge found about: ${context}`;
      }

      return `Previous Knowledge Context:
${results.previousInsights.join('\n')}

Recommendations:
${results.recommendations.join('\n')}

Based on ${results.relatedEntries.length} related knowledge base entries.`;

    } catch (error) {
      console.error('[KnowledgeBaseRAG] Context generation failed:', error);
      return `Unable to retrieve knowledge base context for: ${context}`;
    }
  }
}