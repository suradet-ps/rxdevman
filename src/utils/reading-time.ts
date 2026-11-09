import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { mdxjs } from 'micromark-extension-mdxjs';

const WORDS_PER_MINUTE = 200;

// Thai does not put spaces between words, so splitting on whitespace
// undercounts Thai prose by several times. Intl.Segmenter applies
// dictionary-based word segmentation for Thai while still handling Latin text.
const WORD_SEGMENTER = new Intl.Segmenter('th', { granularity: 'word' });

const MDX_OPTIONS = {
  extensions: [mdxjs()],
  mdastExtensions: [mdxFromMarkdown()],
};

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

const proseCache = new Map<string, string>();

/**
 * Collects text nodes, skipping code, inline code, HTML, and MDX expressions.
 */
function collectText(node: MarkdownNode, parts: string[]): void {
  if (node.type === 'text' && typeof node.value === 'string')
    parts.push(node.value);

  if (node.children) {
    for (const child of node.children)
      collectText(child, parts);
  }
}

/**
 * Parses Markdown/MDX and returns only its prose text.
 */
function extractProse(content: string): string {
  const cached = proseCache.get(content);
  if (cached !== undefined)
    return cached;

  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ' ');
  const tree = fromMarkdown(body, MDX_OPTIONS) as unknown as MarkdownNode;
  const parts: string[] = [];
  collectText(tree, parts);

  const prose = parts.join(' ').replace(/\s+/g, ' ').trim();
  proseCache.set(content, prose);
  return prose;
}

/**
 * Counts word-like segments, including Thai words that have no spaces.
 */
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
