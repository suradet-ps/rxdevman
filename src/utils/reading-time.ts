const WORDS_PER_MINUTE = 200;

// Thai does not put spaces between words, so splitting on whitespace
// undercounts Thai prose by several times. Intl.Segmenter applies
// dictionary-based word segmentation for Thai while still handling Latin text.
const WORD_SEGMENTER = new Intl.Segmenter('th', { granularity: 'word' });

/**
 * Removes fenced code blocks, including fences longer than three characters.
 */
function stripFencedCode(content: string): string {
  const lines = content.split('\n');
  const prose: string[] = [];
  let openFence: string | null = null;

  for (const line of lines) {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line);

    if (openFence) {
      // A closing fence must use the same character and be at least as long.
      if (match && match[1][0] === openFence[0] && match[1].length >= openFence.length)
        openFence = null;
      continue;
    }

    if (match) {
      openFence = match[1];
      continue;
    }

    prose.push(line);
  }

  return prose.join('\n');
}

/**
 * Strips Markdown/MDX syntax so code, markup, and URLs are not counted as prose.
 */
function extractProse(content: string): string {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ' ');

  return stripFencedCode(body)
    .replace(/^(?:import|export)\s.*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^\s*\[[^\]]+\]:\s+\S.*$/gm, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/(?:https?:\/\/|mailto:)\S+/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ')
    .replace(/^\s{0,3}>\s?/gm, ' ')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, ' ')
    .replace(/^[\s:|-]+$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/[*_~]/g, ' ')
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(prose: string): number {
  let count = 0;

  for (const { isWordLike } of WORD_SEGMENTER.segment(prose)) {
    if (isWordLike)
      count++;
  }

  return count;
}

/**
 * Estimates the reading time for a given body of text.
 * @param content - Raw text content (e.g. post.body)
 * @returns A formatted string like "3 min read", or null if content is empty.
 */
export function calculateReadingTime(content: string): string | null {
  const prose = extractProse(content);
  if (!prose)
    return null;

  const wordCount = countWords(prose);
  if (wordCount === 0)
    return null;

  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  return `${minutes} min read`;
}
