import { NextResponse } from 'next/server'
import Ajv from 'ajv'

const ajv = new Ajv({ allErrors: true, strict: false })
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const META_LAMA = "meta-llama/llama-4-scout-17b-16e-instruct"
const MODEL = META_LAMA || process.env.GROQ_MODEL || 'llama3-8b-8192'

const FALLBACK_SCHEMA = {
  title: 'Quick Contact',
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', title: 'Name' },
    email: { type: 'string', format: 'email', title: 'Email' },
    message: { type: 'string', title: 'Message' }
  }
}

// Extract the first JSON object from a model response (handles code fences / extra prose)
function extractFirstJsonObject(text: string): any {
  try { return JSON.parse(text) } catch {}
  const fenced = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/)
  if (fenced?.[1]) { const inner = fenced[1].trim(); try { return JSON.parse(inner) } catch {} }
  const start = text.indexOf('{')
  if (start >= 0) {
    let d = 0
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (ch === '{') d++
      else if (ch === '}') { d--; if (d === 0) {
        const cand = text.slice(start, i+1)
        try { return JSON.parse(cand) } catch {}
      }}
    }
  }
  throw new Error('No JSON object found in AI output')
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      schema: FALLBACK_SCHEMA,
      warning: 'AI disabled (no GROQ_API_KEY). Using fallback.'
    })
  }

  const { prompt } = await req.json().catch(() => ({}))
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  // System prompt forces *valid JSON Schema* ONLY (no prose)
  const system = [
    'You are a JSON Schema generator for a dynamic form builder.',
    'Output VALID JSON ONLY (no prose, no code fences).',
    'Target: JSON Schema Draft-07.',
    'ALWAYS include: "title", "type":"object", "properties", and "required" (if any).',
    'Use "allOf" with "if"/"then" for conditional logic when requested.'
  ].join('\n')

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Generate a JSON Schema for this form:\n${prompt}` }
        ]
      })
    })

    const text = await res.text()
    if (!res.ok) {
      // Log full server-side detail; return graceful fallback to client
      console.error('Groq error', res.status, text)
      return NextResponse.json({
        schema: FALLBACK_SCHEMA,
        warning: `Groq ${res.status}. Using fallback.`
      })
    }

    // Typical OpenAI-format response: { choices: [{ message: { content: "..." } }] }
    let content = ''
    try {
      const data = JSON.parse(text)
      content = data?.choices?.[0]?.message?.content ?? ''
      if (!content) content = typeof data === 'string' ? data : JSON.stringify(data)
    } catch {
      content = text
    }

    let schema: any
    try {
      schema = extractFirstJsonObject((content || '').trim())
    } catch {
      return NextResponse.json({
        schema: FALLBACK_SCHEMA,
        warning: 'AI returned non-JSON; using fallback.'
      })
    }

    if (!schema.type) schema.type = 'object'
    if (!schema.properties || typeof schema.properties !== 'object') schema.properties = {}

    try {
      ajv.compile(schema)  // validate the schema structure itself
    } catch (e: any) {
      return NextResponse.json({
        schema,
        warning: `Schema may be invalid: ${String(e?.message || e)}`
      })
    }

    return NextResponse.json({ schema })
  } catch (err: any) {
    console.error('AI route crash:', err?.message || err)
    return NextResponse.json({
      schema: FALLBACK_SCHEMA,
      warning: 'Unexpected error; using fallback.'
    })
  }
}
