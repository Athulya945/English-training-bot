/**
 * Text processing utilities for voice assistant
 */

/**
 * Cleans text for better voice synthesis by removing unnecessary punctuation
 * @param text - The text to clean
 * @returns Cleaned text suitable for voice synthesis
 */
export function cleanTextForVoice(text: string): string {
  return text
    .replace(/["""'']/g, '') // Remove quotes
    .replace(/\*/g, '') // Remove asterisks
    .replace(/[\[\]]/g, '') // Remove brackets
    .replace(/[{}]/g, '') // Remove braces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s+([.,!?])/g, '$1') // Remove spaces before punctuation
    .trim();
}

/**
 * Detects if text contains grammar correction patterns
 * @param text - The text to analyze
 * @returns True if the text contains grammar correction
 */
export function hasGrammarCorrection(text: string): boolean {
  const correctionPatterns = [
    /correct way to say/i,
    /should be/i,
    /grammar/i,
    /correction/i,
    /by the way/i
  ];
  
  return correctionPatterns.some(pattern => pattern.test(text));
}

/**
 * Extracts the corrected version from a grammar correction response
 * @param text - The text containing the correction
 * @returns The corrected version or null if no correction found
 */
export function extractCorrection(text: string): string | null {
  const correctionMatch = text.match(/correct way to say that would be:\s*(.+?)(?:\n|$)/i);
  if (correctionMatch) {
    return correctionMatch[1].trim();
  }
  
  const shouldBeMatch = text.match(/should be:\s*(.+?)(?:\n|$)/i);
  if (shouldBeMatch) {
    return shouldBeMatch[1].trim();
  }
  
  return null;
}

/**
 * Formats text for better display in chat interface
 * @param text - The text to format
 * @returns Formatted text for display
 */
export function formatTextForDisplay(text: string): string {
  // Preserve line breaks and formatting for display
  return text
    .replace(/\n/g, '<br>') // Convert line breaks to HTML
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic text
}

/**
 * Detects the language of the text (simple detection)
 * @param text - The text to analyze
 * @returns 'kannada', 'english', or 'mixed'
 */
export function detectLanguage(text: string): 'kannada' | 'english' | 'mixed' {
  const kannadaPattern = /[\u0C80-\u0CFF]/; // Kannada Unicode range
  const englishPattern = /[a-zA-Z]/;
  
  const hasKannada = kannadaPattern.test(text);
  const hasEnglish = englishPattern.test(text);
  
  if (hasKannada && hasEnglish) {
    return 'mixed';
  } else if (hasKannada) {
    return 'kannada';
  } else if (hasEnglish) {
    return 'english';
  }
  
  return 'english'; // Default to English
}

/**
 * Splits bilingual text into Kannada and English parts
 * @param text - The bilingual text
 * @returns Object with kannada and english parts
 */
export function splitBilingualText(text: string): { kannada: string; english: string } {
  const kannadaMatch = text.match(/ಕನ್ನಡ:\s*(.*?)(?=\s*English:|$)/);
  const englishMatch = text.match(/English:\s*(.*?)$/);
  
  return {
    kannada: kannadaMatch ? kannadaMatch[1].trim() : '',
    english: englishMatch ? englishMatch[1].trim() : ''
  };
} 