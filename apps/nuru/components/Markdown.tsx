import { Fragment, ReactNode, useMemo } from 'react';
import { View, Text, StyleSheet, TextStyle, Platform } from 'react-native';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * A small, dependency-free Markdown renderer for assistant replies. It covers the
 * subset the chat models actually emit — headings, bold/italic, inline code, fenced
 * code blocks, and bullet/numbered lists — and degrades gracefully on anything else
 * (unknown or half-streamed syntax renders as plain text rather than throwing).
 *
 * Being pure JS (no native module), it is safe to ship via OTA update.
 *
 * It is intentionally forgiving of partial input: while a reply streams in, an
 * unclosed `**` or an unterminated code fence just renders the visible text so the
 * bubble never flickers between "broken markdown" and "fixed markdown".
 */
export function Markdown({ text, style }: { text: string; style?: TextStyle }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const blocks = parseBlocks(text);
  return (
    <View>
      {blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block, i, style, styles)}</Fragment>
      ))}
    </View>
  );
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

// --- Block-level parsing ---------------------------------------------------

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```
    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i++; // skip opening fence
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (if present; if the stream hasn't closed it yet, we're at EOF)
      blocks.push({ kind: 'code', text: body.join('\n') });
      continue;
    }

    // Blank line — paragraph separator
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading  #, ##, ###
    const h = /^\s*(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: 'h', level: h[1].length, text: h[2].trim() });
      i++;
      continue;
    }

    // Unordered list  -, *, +
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Ordered list  1. 2. 3.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Paragraph — gather consecutive non-blank, non-special lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }

  return blocks;
}

function renderBlock(
  block: Block,
  key: number,
  base: TextStyle | undefined,
  styles: ReturnType<typeof makeStyles>,
): ReactNode {
  switch (block.kind) {
    case 'h':
      return (
        <Text style={[styles.text, base, headingStyle(block.level)]}>
          {renderInline(block.text, styles.text, styles)}
        </Text>
      );
    case 'code':
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{block.text}</Text>
        </View>
      );
    case 'ul':
      return (
        <View style={styles.list}>
          {block.items.map((it, j) => (
            <View key={j} style={styles.li}>
              <Text style={[styles.text, base, styles.bullet]}>•</Text>
              <Text style={[styles.text, base, styles.liText]}>
                {renderInline(it, styles.text, styles)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'ol':
      return (
        <View style={styles.list}>
          {block.items.map((it, j) => (
            <View key={j} style={styles.li}>
              <Text style={[styles.text, base, styles.bullet]}>{j + 1}.</Text>
              <Text style={[styles.text, base, styles.liText]}>
                {renderInline(it, styles.text, styles)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'p':
    default:
      return (
        <Text style={[styles.text, base, styles.paragraph]}>
          {renderInline(block.text, styles.text, styles)}
        </Text>
      );
  }
}

// --- Inline parsing --------------------------------------------------------

// Splits a run of text into styled spans for **bold**, *italic* / _italic_, and
// `inline code`. Tokens that never close (mid-stream) fall through as plain text.
function renderInline(src: string, base: TextStyle, styles: ReturnType<typeof makeStyles>): ReactNode[] {
  const out: ReactNode[] = [];
  // Order matters: match the longest / most specific delimiters first.
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(src)) !== null) {
    if (m.index > last) {
      out.push(<Text key={key++}>{src.slice(last, m.index)}</Text>);
    }
    const tok = m[0];
    if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(
        <Text key={key++} style={styles.bold}>
          {tok.slice(2, -2)}
        </Text>,
      );
    } else if (tok.startsWith('`')) {
      out.push(
        <Text key={key++} style={styles.codeInline}>
          {tok.slice(1, -1)}
        </Text>,
      );
    } else {
      // *italic* or _italic_
      out.push(
        <Text key={key++} style={styles.italic}>
          {tok.slice(1, -1)}
        </Text>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < src.length) {
    out.push(<Text key={key++}>{src.slice(last)}</Text>);
  }
  return out;
}

function headingStyle(level: number): TextStyle {
  if (level === 1) return { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 4 };
  if (level === 2) return { fontSize: 19, fontWeight: '700', marginTop: 6, marginBottom: 3 };
  return { fontSize: 17, fontWeight: '700', marginTop: 4, marginBottom: 2 };
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    text: { fontSize: 16, lineHeight: 24, color: theme.colors.text },
    paragraph: { marginBottom: 6 },
    bold: { fontWeight: '700' },
    italic: { fontStyle: 'italic' },
    codeInline: {
      fontFamily: MONO,
      fontSize: 14,
      backgroundColor: theme.colors.surfaceAlt,
      color: theme.colors.text,
    },
    codeBlock: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
      marginVertical: 6,
    },
    codeText: {
      fontFamily: MONO,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.text,
    },
    list: { marginBottom: 6, gap: 3 },
    li: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    bullet: { minWidth: 16 },
    liText: { flex: 1 },
  });
}
