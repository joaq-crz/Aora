// Autonomous evolution engine for archetype slang dictionaries

import { promises as fs } from 'fs';
import path from 'path';
import { getAllProfiles } from './profileManager';

const ARCHETYPE_PATH = path.join(process.cwd(), 'data', 'archetype_type.md');
const FREQUENCY_THRESHOLD = 3;

interface SlangCandidate {
  term: string;
  frequency: number;
  users: Set<string>;
}

/**
 * Aggregates unrecognized slang across all user profiles
 */
async function aggregateSlangCandidates(): Promise<Map<string, SlangCandidate>> {
  const profiles = await getAllProfiles();
  const candidates = new Map<string, SlangCandidate>();
  
  for (const profile of profiles) {
    for (const term of profile.unrecognized_slang_candidates) {
      if (!candidates.has(term)) {
        candidates.set(term, {
          term,
          frequency: 0,
          users: new Set()
        });
      }
      
      const candidate = candidates.get(term)!;
      if (!candidate.users.has(profile.user_id)) {
        candidate.users.add(profile.user_id);
        candidate.frequency++;
      }
    }
  }
  
  return candidates;
}

/**
 * Classifies slang terms into personas using Gemini
 */
async function classifySlangTerms(terms: string[]): Promise<Record<string, string>> {
  const classifications: Record<string, string> = {};
  
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });
    
    const prompt = `You are a Filipino slang classifier. Classify each term into one of these categories:
- BGC Conyo: Upper-class Manila youth, Taglish speakers
- Youngstunna: Street-smart hustler mentality
- Beki: LGBTQ+ community gay lingo
- None: Not Filipino slang or doesn't fit categories

Classify these terms: ${terms.join(', ')}

Respond with JSON only: {"term1": "category", "term2": "category", ...}`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Error classifying slang:', error);
  }
  
  return classifications;
}

/**
 * Updates archetype_type.md with new confirmed terms
 */
async function updateArchetypeRegistry(
  classifications: Record<string, string>
): Promise<void> {
  let content = await fs.readFile(ARCHETYPE_PATH, 'utf-8');
  
  for (const [term, persona] of Object.entries(classifications)) {
    if (persona === 'None') continue;
    
    // Find the persona section and add term
    const sectionRegex = new RegExp(
      `(## ${persona} Slang Dictionary[\\s\\S]*?### Confirmed Terms \\(Auto-Updated\\)[\\s\\S]*?)\\n### Pending`,
      'i'
    );
    
    const match = content.match(sectionRegex);
    if (match) {
      const section = match[1];
      if (!section.includes(`- ${term}`)) {
        const updatedSection = section + `\n- ${term}`;
        content = content.replace(section, updatedSection);
      }
    }
  }
  
  // Update metadata
  const now = new Date().toISOString();
  content = content.replace(
    /\*\*Last Updated\*\*: .+/,
    `**Last Updated**: ${now}`
  );
  
  // Atomic write
  const tempPath = `${ARCHETYPE_PATH}.tmp`;
  await fs.writeFile(tempPath, content, 'utf-8');
  await fs.rename(tempPath, ARCHETYPE_PATH);
}

/**
 * Main evolution worker - runs asynchronously
 */
export async function runEvolutionCycle(): Promise<void> {
  try {
    console.log('[Evolution] Starting cycle...');
    
    // Aggregate candidates
    const candidates = await aggregateSlangCandidates();
    
    // Filter by frequency threshold
    const qualifiedTerms = Array.from(candidates.values())
      .filter(c => c.frequency >= FREQUENCY_THRESHOLD)
      .map(c => c.term);
    
    if (qualifiedTerms.length === 0) {
      console.log('[Evolution] No terms meet threshold');
      return;
    }
    
    console.log(`[Evolution] Classifying ${qualifiedTerms.length} terms...`);
    
    // Classify using LLM
    const classifications = await classifySlangTerms(qualifiedTerms);
    
    // Update registry
    await updateArchetypeRegistry(classifications);
    
    console.log('[Evolution] Cycle complete');
  } catch (error) {
    console.error('[Evolution] Error:', error);
  }
}

/**
 * Schedules evolution to run periodically (non-blocking)
 */
export function startEvolutionWorker(intervalMinutes: number = 60): void {
  // Run immediately
  runEvolutionCycle().catch(console.error);
  
  // Schedule periodic runs
  setInterval(() => {
    runEvolutionCycle().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}
