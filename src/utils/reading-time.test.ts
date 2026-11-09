import { describe, expect, it } from 'vitest';

import { calculateReadingTime } from '@/utils/reading-time';

describe('calculateReadingTime', () => {
  it('returns null for empty content', () => {
    expect(calculateReadingTime('')).toBeNull();
  });

  it('returns null for whitespace-only content', () => {
    expect(calculateReadingTime('   \n\t  ')).toBeNull();
  });

  it('returns "1 min read" for short content', () => {
    expect(calculateReadingTime('hello world')).toBe('1 min read');
  });

  it('calculates based on 200 words per minute', () => {
    const words = Array.from({ length: 200 }).fill('word').join(' ');
    expect(calculateReadingTime(words)).toBe('1 min read');
  });

  it('rounds up for partial minutes', () => {
    const words = Array.from({ length: 201 }).fill('word').join(' ');
    expect(calculateReadingTime(words)).toBe('2 min read');
  });

  it('calculates multi-minute reading time', () => {
    const words = Array.from({ length: 600 }).fill('word').join(' ');
    expect(calculateReadingTime(words)).toBe('3 min read');
  });

  it('trims whitespace before counting', () => {
    const words = Array.from({ length: 200 }).fill('word').join(' ');
    expect(calculateReadingTime(`  ${words}  `)).toBe('1 min read');
  });

  it('handles multiple whitespace between words', () => {
    const words = Array.from({ length: 100 }).fill('word').join('   ');
    expect(calculateReadingTime(words)).toBe('1 min read');
  });

  it('counts Thai words without relying on spaces', () => {
    const words = Array.from({ length: 100 }).fill('สวัสดีครับ').join(' ');
    expect(calculateReadingTime(words)).toBe('1 min read');
  });

  it('does not undercount a long Thai article', () => {
    const sentence = 'ภาษาไทยไม่มีช่องว่างระหว่างคำ';
    const content = Array.from({ length: 1000 }).fill(sentence).join(' ');
    const minutes = Number(calculateReadingTime(content)?.split(' ')[0]);

    expect(minutes).toBeGreaterThanOrEqual(30);
  });

  it('ignores fenced code blocks', () => {
    const code = `\`\`\`ts\n${'const value = 1;\n'.repeat(1000)}\`\`\``;
    expect(calculateReadingTime(`hello world\n${code}`)).toBe('1 min read');
  });

  it('ignores fenced code blocks with tildes', () => {
    const code = `~~~ts\n${'const value = 1;\n'.repeat(1000)}~~~`;
    expect(calculateReadingTime(`hello world\n${code}`)).toBe('1 min read');
  });

  it('ignores fenced code blocks nested in list items', () => {
    const code = `    \`\`\`ts\n${'    const value = 1;\n'.repeat(1000)}    \`\`\``;
    expect(calculateReadingTime(`- item\n\n${code}\n\nafter`)).toBe('1 min read');
  });

  it('handles nested fenced code blocks', () => {
    const content = '````md\n```ts\nconst value = 1;\n```\n````\n\nafter';
    expect(calculateReadingTime(content)).toBe('1 min read');
  });

  it('does not treat an inline backtick span as an opening fence', () => {
    const prose = Array.from({ length: 200 }).fill('word').join(' ');
    expect(calculateReadingTime(`\`\`\`inline\`\`\` ${prose}`)).toBe('1 min read');
  });

  it('returns null when the content is only code', () => {
    expect(calculateReadingTime('```ts\nconst value = 1;\n```')).toBeNull();
  });

  it('ignores inline code', () => {
    const code = Array.from({ length: 500 }).fill('`const value = 1`').join(' ');
    expect(calculateReadingTime(`hello world ${code}`)).toBe('1 min read');
  });

  it('ignores MDX tags while keeping their prose', () => {
    const ignoredProps = 'ignore '.repeat(500);
    const content = `<InfoBox title="${ignoredProps}">hello world</InfoBox>`;
    expect(calculateReadingTime(content)).toBe('1 min read');
  });

  it('ignores MDX prop expressions containing comparison operators', () => {
    const ignoredProp = `a > b ? '${'ignore '.repeat(500)}' : 'x'`;
    const content = `<InfoBox title={${ignoredProp}}>hello world</InfoBox>`;
    expect(calculateReadingTime(content)).toBe('1 min read');
  });

  it('ignores MDX imports', () => {
    expect(calculateReadingTime(`import Foo from './Foo.astro'\n\nhello world`)).toBe('1 min read');
  });

  it('ignores frontmatter', () => {
    const description = 'word '.repeat(500);
    const content = `---\ntitle: Hello\ndescription: ${description}\n---\n\nhello world`;
    expect(calculateReadingTime(content)).toBe('1 min read');
  });

  it('ignores image syntax and link URLs', () => {
    const links = Array.from({ length: 300 }).fill('[hello](https://example.com/a/b?c=d)').join(' ');
    expect(calculateReadingTime(`![alt text](./image.png) ${links} world`)).toBe('2 min read');
  });
});
