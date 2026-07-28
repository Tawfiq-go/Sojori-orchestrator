import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Cache disque pour les bundles Rental United (/ru-assets/*).
 *
 * ⚠️ Pourquoi ce plugin existe — incident 2026-07-28 :
 * RU sert `vendor.js` (2 Mo) + `main.js` (1,8 Mo), soit ~1,37 Mo gzip, avec
 * `cache-control: no-store`. Le navigateur les retélécharge donc INTÉGRALEMENT
 * à chaque ouverture du widget. Sur une liaison lente vers RU (mesuré à
 * 22 Ko/s depuis le Maroc, contre 4 500 Ko/s depuis GKE Paris — problème de
 * routage opérateur, pas de leur serveur), cela donne ~60 s d'écran blanc.
 *
 * Ce proxy télécharge une fois, garde sur disque, et resert localement.
 * Résultat : premier chargement identique, puis quasi instantané — y compris
 * après redémarrage du serveur de dev, et même hors connexion.
 *
 * Sécurité : seuls les chemins sous /app/pms-dist/ de new.rentalsunited.com
 * sont relayés. Aucun en-tête d'authentification n'est transmis, et le token
 * RU ne transite jamais par ici (il reste dans l'URL du script client).
 */

const RU_ORIGIN = 'https://new.rentalsunited.com'
const CACHE_DIR = join(tmpdir(), 'sojori-ru-assets')
/** Les bundles RU sont versionnés par ?v= — 7 jours est prudent. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

type CacheEntry = { body: Buffer; contentType: string; fetchedAt: number }

const memory = new Map<string, CacheEntry>()

function cacheFile(key: string): string {
  return join(CACHE_DIR, `${createHash('sha1').update(key).digest('hex')}.bin`)
}

function readDisk(key: string): CacheEntry | null {
  const file = cacheFile(key)
  const meta = `${file}.json`
  if (!existsSync(file) || !existsSync(meta)) return null
  try {
    const { contentType, fetchedAt } = JSON.parse(readFileSync(meta, 'utf8'))
    if (Date.now() - fetchedAt > MAX_AGE_MS) return null
    return { body: readFileSync(file), contentType, fetchedAt }
  } catch {
    return null
  }
}

function writeDisk(key: string, entry: CacheEntry): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(cacheFile(key), entry.body)
    writeFileSync(
      `${cacheFile(key)}.json`,
      JSON.stringify({ contentType: entry.contentType, fetchedAt: entry.fetchedAt }),
    )
  } catch {
    /* cache best-effort : un échec disque ne doit jamais casser le widget */
  }
}

export function ruAssetCachePlugin(): Plugin {
  return {
    name: 'sojori-ru-asset-cache',
    configureServer(server) {
      server.middlewares.use('/ru-assets', (req, res, next) => {
        const rawPath = (req.url || '').split('?')[0]
        // Verrou dur : uniquement les assets pms-dist (js/css/polices), rien
        // d'autre. styles.css était mesuré à 5 142 ms sans cache.
        if (!/^\/[a-zA-Z0-9._-]+\.(js|css|woff2?|ttf|eot|svg)$/.test(rawPath)) return next()

        const key = req.url || rawPath
        const upstream = `${RU_ORIGIN}/app/pms-dist${key}`

        const serve = (entry: CacheEntry, hit: boolean) => {
          res.setHeader('content-type', entry.contentType)
          // Cache navigateur agressif : l'URL porte déjà ?v=<version RU>
          res.setHeader('cache-control', 'public, max-age=604800, immutable')
          res.setHeader('x-ru-cache', hit ? 'HIT' : 'MISS')
          res.end(entry.body)
        }

        const mem = memory.get(key) ?? readDisk(key)
        if (mem) {
          memory.set(key, mem)
          serve(mem, true)
          return
        }

        // 3 min : sur liaison dégradée le premier téléchargement est très lent,
        // mais il n'a lieu qu'une seule fois.
        const timeout = AbortSignal.timeout(180_000)
        fetch(upstream, { signal: timeout })
          .then(async (r) => {
            if (!r.ok) throw new Error(`upstream ${r.status}`)
            const buf = Buffer.from(await r.arrayBuffer())
            const entry: CacheEntry = {
              body: buf,
              contentType: r.headers.get('content-type') || 'application/javascript',
              fetchedAt: Date.now(),
            }
            memory.set(key, entry)
            writeDisk(key, entry)
            server.config.logger.info(
              `[ru-cache] mis en cache ${key} (${Math.round(buf.length / 1024)} Ko)`,
            )
            serve(entry, false)
          })
          .catch((err) => {
            server.config.logger.warn(`[ru-cache] échec ${key}: ${err?.message || err}`)
            res.statusCode = 502
            res.end(`// ru-asset-cache: échec récupération ${key}`)
          })
      })
    },
  }
}
