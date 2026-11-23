// Crawls a public Google Drive folder via its embedded folder view and writes
// src/data/workFolders.json for the portfolio Work section.
//
// Usage: node scripts/fetch-work.mjs [rootFolderId] [maxDepth]
// Re-run whenever the Drive folder contents change.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_ID = process.argv[2] || '1c36gv-wc0U2QVi9aI-PGgOMDTyV82C8Z'
const MAX_DEPTH = Number(process.argv[3] || 4)
const ROOT_NAME = 'WorK'

const here = dirname(fileURLToPath(import.meta.url))
const outFile = resolve(here, '../src/data/workFolders.json')

const ENTITY_MAP = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITY_MAP[m] || m)

function parseEntries(html) {
  const entries = []
  const blocks = html.split('<div class="flip-entry"').slice(1)
  for (const block of blocks) {
    const idm = block.match(/id="entry-([^"]+)"/)
    const hm = block.match(/<a href="([^"]+)"[^>]*>/)
    const tm = block.match(/<div class="flip-entry-title">([\s\S]*?)<\/div>/)
    if (!idm || !hm || !tm) continue
    const href = hm[1]
    const isFolder = href.includes('/drive/folders/')
    const isFile = href.includes('/file/d/')
    if (!isFolder && !isFile) continue
    const lm = block.match(/<div class="flip-entry-last-modified"><div>([^<]*)<\/div>/)
    const img = block.match(/<img[^>]+src="([^"]+)"/)
    entries.push({
      type: isFolder ? 'folder' : 'file',
      id: idm[1],
      name: decode(tm[1].replace(/<[^>]+>/g, '')).trim(),
      modified: lm ? decode(lm[1]).trim() : '',
      thumb: !isFolder && img ? img[1].replace(/=s\d+$/, '=s320') : '',
    })
  }
  return entries
}

async function listFolder(id) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#grid`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; portfolio-work-crawler)' },
  })
  if (!res.ok) throw new Error(`Drive responded ${res.status} for ${id}`)
  return parseEntries(await res.text())
}

let requests = 0
async function crawl(id, name, depth) {
  requests++
  const entries = await listFolder(id)
  const node = { id, name, type: 'folder', children: [] }
  for (const e of entries) {
    if (e.type === 'folder' && depth < MAX_DEPTH) {
      node.children.push(await crawl(e.id, e.name, depth + 1))
    } else {
      node.children.push(e)
    }
  }
  return node
}

const tree = await crawl(ROOT_ID, ROOT_NAME, 0)
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(tree, null, 2) + '\n')

const count = (n) => (n.children || []).reduce((a, c) => a + (c.type === 'folder' ? 1 + count(c) : 1), 1)
console.log(`Wrote ${outFile} (${requests} Drive requests, ${count(tree)} entries)`)
