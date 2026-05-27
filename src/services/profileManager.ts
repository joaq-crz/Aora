// Persistent user profile management using file system

import { promises as fs } from 'fs';
import path from 'path';
import { UserProfile } from '@/types/chat';

const PROFILES_DIR = path.join(process.cwd(), 'data', 'profiles');

/**
 * Ensures the profiles directory exists
 */
async function ensureProfilesDir(): Promise<void> {
  try {
    await fs.access(PROFILES_DIR);
  } catch {
    await fs.mkdir(PROFILES_DIR, { recursive: true });
  }
}

/**
 * Generates a new user profile template
 */
function createNewProfile(userId: string): UserProfile {
  return {
    user_id: userId,
    detected_persona: 'Unknown',
    funnel_stage: 'discovery',
    interaction_history: [],
    visual_notes: [],
    interests: [],
    unrecognized_slang_candidates: [],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
}

/**
 * Reads a user profile from disk, creates new one if doesn't exist
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  await ensureProfilesDir();
  
  const profilePath = path.join(PROFILES_DIR, `user_${userId}_profile.md`);
  
  try {
    const content = await fs.readFile(profilePath, 'utf-8');
    return parseProfileMarkdown(content, userId);
  } catch (error) {
    // Profile doesn't exist, create new one
    const newProfile = createNewProfile(userId);
    await saveUserProfile(newProfile);
    return newProfile;
  }
}

/**
 * Parses markdown profile into UserProfile object
 */
function parseProfileMarkdown(markdown: string, userId: string): UserProfile {
  const profile: UserProfile = createNewProfile(userId);
  
  // Extract metadata from markdown
  const nameMatch = markdown.match(/\*\*Name\*\*:\s*(.+)/);
  if (nameMatch) profile.name = nameMatch[1].trim();
  
  const personaMatch = markdown.match(/\*\*Detected Persona\*\*:\s*(.+)/);
  if (personaMatch) profile.detected_persona = personaMatch[1].trim();
  
  const stageMatch = markdown.match(/\*\*Funnel Stage\*\*:\s*(.+)/);
  if (stageMatch) profile.funnel_stage = stageMatch[1].trim() as any;
  
  const locationMatch = markdown.match(/\*\*Location Context\*\*:\s*(.+)/);
  if (locationMatch) profile.location_context = locationMatch[1].trim();
  
  const createdMatch = markdown.match(/\*\*Created\*\*:\s*(.+)/);
  if (createdMatch) profile.created_at = createdMatch[1].trim();
  
  const updatedMatch = markdown.match(/\*\*Last Updated\*\*:\s*(.+)/);
  if (updatedMatch) profile.last_updated = updatedMatch[1].trim();
  
  // Extract lists
  const historySection = markdown.match(/## Interaction History\n([\s\S]*?)(?=\n##|\n$)/);
  if (historySection) {
    profile.interaction_history = historySection[1]
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim());
  }
  
  const visualSection = markdown.match(/## Visual Notes\n([\s\S]*?)(?=\n##|\n$)/);
  if (visualSection) {
    profile.visual_notes = visualSection[1]
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim());
  }
  
  const interestsSection = markdown.match(/## Interests & Context\n([\s\S]*?)(?=\n##|\n$)/);
  if (interestsSection) {
    profile.interests = interestsSection[1]
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim());
  }
  
  const slangSection = markdown.match(/## Unrecognized Slang Candidates\n([\s\S]*?)(?=\n##|\n$)/);
  if (slangSection) {
    profile.unrecognized_slang_candidates = slangSection[1]
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim());
  }
  
  return profile;
}

/**
 * Converts UserProfile to markdown format
 */
function profileToMarkdown(profile: UserProfile): string {
  return `# User Profile: ${profile.user_id}

## Metadata
- **Name**: ${profile.name || 'Unknown'}
- **Detected Persona**: ${profile.detected_persona}
- **Funnel Stage**: ${profile.funnel_stage}
- **Location Context**: ${profile.location_context || 'Not detected'}
- **Created**: ${profile.created_at}
- **Last Updated**: ${profile.last_updated}

## Interaction History
${profile.interaction_history.map(item => `- ${item}`).join('\n') || '- No interactions yet'}

## Visual Notes
${profile.visual_notes.map(item => `- ${item}`).join('\n') || '- No visual data captured'}

## Interests & Context
${profile.interests.map(item => `- ${item}`).join('\n') || '- No interests identified'}

## Unrecognized Slang Candidates
${profile.unrecognized_slang_candidates.map(item => `- ${item}`).join('\n') || '- None'}
`;
}

/**
 * Saves user profile to disk
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await ensureProfilesDir();
  
  profile.last_updated = new Date().toISOString();
  const markdown = profileToMarkdown(profile);
  const profilePath = path.join(PROFILES_DIR, `user_${profile.user_id}_profile.md`);
  
  // Atomic write: write to temp file then rename
  const tempPath = `${profilePath}.tmp`;
  await fs.writeFile(tempPath, markdown, 'utf-8');
  await fs.rename(tempPath, profilePath);
}

/**
 * Updates user profile with new interaction data
 */
export async function updateProfile(
  userId: string,
  updates: {
    persona?: string;
    funnelStage?: UserProfile['funnel_stage'];
    interactionText?: string;
    visualNote?: string;
    location?: string;
    interest?: string;
    unrecognizedSlang?: string[];
  }
): Promise<void> {
  const profile = await getUserProfile(userId);
  
  if (updates.persona) {
    profile.detected_persona = updates.persona;
  }
  
  if (updates.funnelStage) {
    profile.funnel_stage = updates.funnelStage;
  }
  
  if (updates.interactionText) {
    const timestamp = new Date().toISOString();
    profile.interaction_history.push(`[${timestamp}] ${updates.interactionText}`);
    
    // Keep only last 20 interactions
    if (profile.interaction_history.length > 20) {
      profile.interaction_history = profile.interaction_history.slice(-20);
    }
  }
  
  if (updates.visualNote) {
    profile.visual_notes.push(updates.visualNote);
    
    // Keep only last 10 visual notes
    if (profile.visual_notes.length > 10) {
      profile.visual_notes = profile.visual_notes.slice(-10);
    }
  }
  
  if (updates.location) {
    profile.location_context = updates.location;
  }
  
  if (updates.interest) {
    if (!profile.interests.includes(updates.interest)) {
      profile.interests.push(updates.interest);
    }
  }
  
  if (updates.unrecognizedSlang && updates.unrecognizedSlang.length > 0) {
    for (const slang of updates.unrecognizedSlang) {
      if (!profile.unrecognized_slang_candidates.includes(slang)) {
        profile.unrecognized_slang_candidates.push(slang);
      }
    }
  }
  
  await saveUserProfile(profile);
}

/**
 * Gets all user profiles (for evolution engine)
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  await ensureProfilesDir();
  
  const files = await fs.readdir(PROFILES_DIR);
  const profileFiles = files.filter(f => f.startsWith('user_') && f.endsWith('_profile.md'));
  
  const profiles: UserProfile[] = [];
  for (const file of profileFiles) {
    const content = await fs.readFile(path.join(PROFILES_DIR, file), 'utf-8');
    const userId = file.replace('user_', '').replace('_profile.md', '');
    profiles.push(parseProfileMarkdown(content, userId));
  }
  
  return profiles;
}
