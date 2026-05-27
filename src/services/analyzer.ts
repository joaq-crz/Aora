// Multimodal-safe text extraction and persona analysis

import { MessageContent, PersonaAnalysis } from '@/types/chat';

// Persona keyword mappings
const PERSONA_KEYWORDS = {
  'BGC Conyo': [
    'broskie', 'pare', 'shawty', 'gagi', 'bro', 'bgc', 'syempre', 
    'like', 'legit', 'bet', 'naman', 'nga', 'talaga', 'grabe', 
    'diba', 'vibes', 'slay', 'lowkey', 'highkey', 'fr', 'ngl'
  ],
  'Youngstunna': [
    'pre', 'idol', 'boss', 'solid', 'petmalu', 'lodi', 'werpa', 
    'sana all', 'tropa', 'tol', 'paps', 'daks', 'olats', 'raket',
    'diskarte', 'keri', 'laban', 'swabe', 'galing', 'astig'
  ],
  'Beki': [
    'charot', 'mima', 'baks', 'ateh', 'kalurks', 'werq', 'ganda',
    'chika', 'jowa', 'shunga', 'shonga', 'anech', 'ano daw', 
    'lafang', 'loka', 'pak', 'ganern', 'anda', 'mars', 'sis'
  ]
};

/**
 * Safely extracts text from multimodal content
 * Handles both string content and structured arrays with text/image blocks
 */
export function extractText(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content
      .filter((block) => block.type === 'text')
      .map((block) => 'text' in block ? block.text : '')
      .join(' ');
  }
  
  return '';
}

/**
 * Analyzes text to detect persona based on keyword matching
 * Returns persona type, confidence score, and unrecognized slang
 */
export function analyzePersona(text: string): PersonaAnalysis {
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\s+/);
  
  const scores: Record<string, number> = {
    'BGC Conyo': 0,
    'Youngstunna': 0,
    'Beki': 0
  };
  
  const matchedKeywords: string[] = [];
  const allKnownKeywords = new Set<string>();
  
  // Score each persona based on keyword matches
  for (const [persona, keywords] of Object.entries(PERSONA_KEYWORDS)) {
    keywords.forEach(keyword => allKnownKeywords.add(keyword.toLowerCase()));
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (normalizedText.includes(keywordLower)) {
        scores[persona]++;
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }
  }
  
  // Find dominant persona
  let detectedPersona: 'BGC Conyo' | 'Youngstunna' | 'Beki' | 'Unknown' = 'Unknown';
  let maxScore = 0;
  
  for (const [persona, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedPersona = persona as 'BGC Conyo' | 'Youngstunna' | 'Beki';
    }
  }
  
  // Calculate confidence (0-10 scale)
  const confidenceScore = Math.min(10, maxScore * 2);
  
  // Identify unrecognized slang candidates
  // Look for Filipino/slang-like words not in our dictionaries
  const unrecognizedSlang: string[] = [];
  const filipinoPatterns = /[a-z]*[aeiou]{2,}[a-z]*|.*ng.*|.*han.*|.*gan.*/i;
  
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/gi, '');
    if (
      cleanWord.length > 2 &&
      !allKnownKeywords.has(cleanWord.toLowerCase()) &&
      (filipinoPatterns.test(cleanWord) || /[a-z]{4,}/.test(cleanWord))
    ) {
      // Filter out common English words
      const commonEnglish = ['that', 'this', 'what', 'when', 'where', 'have', 'been', 'going', 'later', 'about'];
      if (!commonEnglish.includes(cleanWord.toLowerCase())) {
        unrecognizedSlang.push(cleanWord.toLowerCase());
      }
    }
  }
  
  return {
    detected_persona: detectedPersona,
    confidence_score: confidenceScore,
    matched_keywords: matchedKeywords,
    unrecognized_slang: [...new Set(unrecognizedSlang)] // Remove duplicates
  };
}

/**
 * Extracts location mentions from text
 */
export function extractLocation(text: string): string | undefined {
  const normalizedText = text.toLowerCase();
  const locationKeywords = ['bgc', 'makati', 'manila', 'quezon city', 'qc', 'ortigas', 'alabang'];
  
  for (const location of locationKeywords) {
    if (normalizedText.includes(location)) {
      return location.toUpperCase();
    }
  }
  
  return undefined;
}

/**
 * Detects if user is expressing buying intent
 */
export function detectBuyingIntent(text: string): boolean {
  const intentPhrases = [
    'drop the link',
    'send link',
    'where to buy',
    'how much',
    'magkano',
    'bili',
    'interested',
    'want',
    'need',
    'saan makakabili'
  ];
  
  const normalizedText = text.toLowerCase();
  return intentPhrases.some(phrase => normalizedText.includes(phrase));
}
