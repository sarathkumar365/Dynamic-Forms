import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'docs', 'json-import-guide.md');
    const text = await readFile(file, 'utf8');
    return new Response(text, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    return new Response('Guide not found', { status: 404 });
  }
}

