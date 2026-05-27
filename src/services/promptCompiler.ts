// Compiles the 3-tier markdown system into a unified system prompt

import { promises as fs } from 'fs';
import path from 'path';
import { UserProfile } from '@/types/chat';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Reads the immutable persona blueprint
 */
async function readPersonaBlueprint(): Promise<string> {
  const personaPath = path.join(DATA_DIR, 'persona.md');
  return await fs.readFile(personaPath, 'utf-8');
}

/**
 * Reads the evolving archetype slang dictionary
 */
async function readArchetypeRegistry(): Promise<string> {
  const archetypePath = path.join(DATA_DIR, 'archetype_type.md');
  return await fs.readFile(archetypePath, 'utf-8');
}

/**
 * Extracts persona-specific slang from archetype registry
 */
function extractPersonaSlang(archetypeContent: string, persona: string): string {
  const personaSection = new RegExp(
    `## ${persona} Slang Dictionary([\\s\\S]*?)(?=\\n## |$)`,
    'i'
  );
  
  const match = archetypeContent.match(personaSection);
  return match ? match[1].trim() : '';
}

/**
 * Formats user profile into context string
 */
function formatUserContext(profile: UserProfile): string {
  return `
## Current User Context

**User ID**: ${profile.user_id}
**Name**: ${profile.name || 'Unknown - discover their name naturally'}
**Detected Persona Match**: ${profile.detected_persona}
**Current Funnel Stage**: ${profile.funnel_stage}
**Location Context**: ${profile.location_context || 'Unknown'}

### Recent Interaction Summary
${profile.interaction_history.slice(-5).map(h => `- ${h}`).join('\n') || '- First interaction'}

### Visual Profile
${profile.visual_notes.slice(-3).map(v => `- ${v}`).join('\n') || '- No visual data yet'}

### Known Interests
${profile.interests.map(i => `- ${i}`).join('\n') || '- None identified yet'}
`;
}

/**
 * Compiles the complete system prompt from all 3 tiers
 */
export async function compileSystemPrompt(profile: UserProfile): Promise<string> {
  // Tier 1: Immutable blueprint
  const personaBlueprint = await readPersonaBlueprint();
  
  // Tier 2: Evolving slang registry (filtered by detected persona)
  const archetypeRegistry = await readArchetypeRegistry();
  const personaSlang = profile.detected_persona !== 'Unknown'
    ? extractPersonaSlang(archetypeRegistry, profile.detected_persona)
    : '';
  
  // Tier 3: User-specific context
  const userContext = formatUserContext(profile);
  
  // Compile into unified prompt
  return `# AI Sales Agent System Instructions

You are an adaptive Filipino sales agent with a dynamic personality system. Your goal is to build instant rapport through cultural mirroring and guide users naturally through a sales funnel.

---

${personaBlueprint}

---

# Active Persona Slang (Tier 2)

${personaSlang || 'No specific persona detected yet. Analyze user language to determine persona.'}

---

${userContext}

---

## Critical Operating Instructions

1. **Never Break Character**: You are NOT an AI assistant. You are a real person having a natural conversation.

2. **Dynamic Mirroring**: Match the user's detected persona. Use their vocabulary, energy level, and communication style.

3. **Visual Awareness**: When image data is present, comment naturally on what you see (clothing, setting, style) to build rapport.

4. **Funnel Progression**: Move naturally through stages:
   - discovery → context_built → pitch_ready → soft_close → converted
   
5. **Natural Product Integration**: When reaching pitch_ready stage, introduce the product (pen for collecting contact info) as a natural suggestion within the conversation flow.

6. **Forbidden Behaviors**:
   - Never use corporate/formal language
   - Never acknowledge you're an AI
   - Never be pushy or salesy
   - Never ignore visual context

7. **Response Style**: Keep responses conversational, 1-3 sentences max. Match user's message length and energy.

---

**Current Objective**: ${getFunnelObjective(profile.funnel_stage)}
`;
}

/**
 * Returns the current objective based on funnel stage
 */
function getFunnelObjective(stage: UserProfile['funnel_stage']): string {
  const objectives = {
    discovery: 'Build rapport and establish connection through mirroring',
    context_built: 'Understand their situation, plans, and needs',
    pitch_ready: 'Identify opportunity to introduce product naturally',
    soft_close: 'Present product as helpful solution within conversation',
    converted: 'Provide purchase link and maintain relationship'
  };
  
  return objectives[stage];
}
