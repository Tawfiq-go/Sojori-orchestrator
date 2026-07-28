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
/** CDN des icônes/images RU — 14 fichiers = 9 189 ms cumulés sans cache. */
const RU_CDN_ORIGIN = 'https://cdn.rentalsunited.com'
const CACHE_DIR = join(tmpdir(), 'sojori-ru-assets')
/** Les bundles RU sont versionnés par ?v= — 7 jours est prudent. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

type CacheEntry = { body: Buffer; contentType: string; fetchedAt: number }

const memory = new Map<string, CacheEntry>()
/**
 * Assets absents chez RU (404/403). Sans cette mémoire, chaque rendu relance
 * un aller-retour réseau pour un fichier qu'on sait manquant — sur liaison
 * dégradée cela finissait en timeout, donc en 502 bruyant dans la console.
 */
const missing = new Map<string, number>()
const MISSING_TTL_MS = 60 * 60 * 1000

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
      /**
       * Fabrique un middleware de cache pour un préfixe donné.
       *
       * @param mount    chemin monté côté dev (ex. /ru-assets)
       * @param toUpstream construit l'URL amont à partir du chemin demandé
       * @param allow    extensions autorisées (verrou dur, pas de proxy ouvert)
       */
      const makeHandler =
        (mount: string, toUpstream: (key: string) => string, allow: RegExp) =>
        (req: { url?: string }, res: any, next: () => void) => {
          const rawPath = (req.url || '').split('?')[0]
          if (!allow.test(rawPath)) return next()

          // Namespacé par point de montage : /ru-assets/x.svg et
          // /ru-cdn/x.svg sont deux ressources distinctes.
          const key = `${mount}${req.url || rawPath}`
          const upstream = toUpstream(req.url || rawPath)

          const serve = (entry: CacheEntry, hit: boolean) => {
            res.setHeader('content-type', entry.contentType)
            // Cache navigateur agressif : les URLs RU portent déjà ?v=<version>
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

          // Absent chez RU et déjà constaté : on répond 404 immédiatement,
          // sans aller-retour réseau (sinon timeout → 502 sur liaison lente).
          const missedAt = missing.get(key)
          if (missedAt && Date.now() - missedAt < MISSING_TTL_MS) {
            res.statusCode = 404
            res.setHeader('x-ru-cache', 'MISSING')
            res.end()
            return
          }

          // 3 min : sur liaison dégradée le premier téléchargement est très
          // lent, mais il n'a lieu qu'une seule fois.
          fetch(upstream, { signal: AbortSignal.timeout(180_000) })
            .then(async (r) => {
              // Certains logos n'existent pas chez RU (404 légitime). Relayer
              // le statut réel plutôt qu'un 502 : sinon le widget affiche une
              // erreur réseau bruyante pour une image simplement absente.
              if (r.status === 404 || r.status === 403) {
                missing.set(key, Date.now())
                res.statusCode = r.status
                res.setHeader('x-ru-cache', 'BYPASS')
                res.end()
                return
              }
              if (!r.ok) throw new Error(`upstream ${r.status}`)
              let buf = Buffer.from(await r.arrayBuffer())
              const contentType = r.headers.get('content-type') || 'application/octet-stream'

              // ⚠️ Les icônes RU sont référencées par url() DANS le CSS, pas par
              // des balises <img> : aucune interception JS ne peut les capter
              // (13 fichiers, ~90 s cumulés au premier affichage d'un canal).
              // On réécrit donc les url() du CSS vers notre proxy, à la source.
              if (/text\/css/i.test(contentType)) {
                buf = Buffer.from(
                  buf
                    .toString('utf8')
                    .replace(
                      /https:\/\/cdn\.rentalsunited\.com\//g,
                      '/ru-cdn/',
                    )
                    .replace(
                      /https:\/\/new\.rentalsunited\.com\/app\/pms-dist\//g,
                      '/ru-assets/',
                    ),
                  'utf8',
                )
              }

              const entry: CacheEntry = {
                body: buf,
                contentType,
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
              // 404 et non 502 : un timeout réseau sur une icône est un échec
              // transitoire, pas une panne serveur. Le 502 s'affichait en rouge
              // dans la console du widget pour une simple image absente.
              res.statusCode = 404
              res.setHeader('x-ru-cache', 'ERROR')
              res.end()
            })
        }

      // Bundles applicatifs (js/css/polices) — styles.css : 6 704 ms sans cache.
      server.middlewares.use(
        '/ru-assets',
        makeHandler(
          '/ru-assets',
          (key) => `${RU_ORIGIN}/app/pms-dist${key}`,
          /^\/[a-zA-Z0-9._-]+\.(js|css|woff2?|ttf|eot|svg)$/,
        ),
      )

      // Icônes et images du CDN RU — 14 fichiers, 9 189 ms cumulés sans cache.
      // Sous-dossiers autorisés (assets/icons/ru-v5/…), extensions image seules.
      server.middlewares.use(
        '/ru-cdn',
        makeHandler(
          '/ru-cdn',
          (key) => `${RU_CDN_ORIGIN}${key}`,
          /^\/[a-zA-Z0-9._\-/]+\.(svg|png|jpe?g|gif|webp|woff2?|ttf|css|ico)$/,
        ),
      )
    },
  }
}
