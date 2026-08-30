import { useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { geoNaturalEarth1, geoPath, geoGraticule } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldTopo from 'world-atlas/countries-110m.json';
import { ISO2_TO_NUMERIC, countryFlag, countryName } from './countryCodes';

/**
 * Carte choroplèthe des nationalités.
 *
 * Projection Natural Earth 1 : elle ne gonfle pas les hautes latitudes comme
 * Mercator, ce qui garde l'Afrique et le Maghreb à leur taille réelle.
 *
 * Le cadrage porte sur le monde entier moins l'Antarctique : cadrer sur les
 * seuls pays ayant des clients tronquait tous les autres au bord. Un
 * garde-fou en développement signale si le pays de l'hôtel sortait du cadre —
 * il ne doit jamais être coupé.
 *
 * Le TopoJSON est empaqueté dans le bundle — aucune tuile, aucun appel réseau,
 * donc aucune donnée client qui partirait chez un fournisseur de cartes.
 */

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  gold: '#E6B022',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
  /** Pays sans client : présent, mais en retrait. */
  empty: '#eeece6',
  sea: '#fbfaf7',
};

/** Le pays de l'hôtel : toujours dans le cadre, même sans client. */
const ANCHOR_ISO2 = 'MA';

const W = 760;
const H = 380;

export type CountryDatum = {
  code: string;
  customers: number;
  gross: number;
};

type Props = {
  countries: CountryDatum[];
  /** Clients dont la nationalité est inconnue — affiché, jamais masqué. */
  unknownCustomers?: number;
};

const world = worldTopo as unknown as Parameters<typeof feature>[0];

/** Un pays de la géométrie Natural Earth. */
type CountryFeature = Feature<Geometry, { name: string }>;

/** Échelle dorée : du plus clair au plus soutenu, en 5 paliers. */
const RAMP = ['#f6e9c8', '#ecd393', '#e0b95a', '#cc9a26', '#a2761b'];

export function NationalityMap({ countries, unknownCustomers = 0 }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  const byNumeric = useMemo(() => {
    const m = new Map<string, CountryDatum>();
    for (const c of countries) {
      const num = ISO2_TO_NUMERIC[c.code];
      if (num) m.set(num, c);
    }
    return m;
  }, [countries]);

  const maxGross = useMemo(
    () => countries.reduce((mx, c) => Math.max(mx, c.gross), 0),
    [countries],
  );

  const { features, pathFor, graticulePath } = useMemo(() => {
    const fc = feature(world, (world as never as { objects: { countries: unknown } }).objects
      .countries as never) as unknown as FeatureCollection<Geometry, { name: string }>;

    // Cadrage sur le monde entier, pas sur les seuls pays présents : tous
    // les continents sont dessinés, les cadrer sur un sous-ensemble en
    // tronquerait au bord (l'Asie et l'Australie, notamment).
    //
    // L'Antarctique est retiré du calcul — elle n'a aucun client et sa
    // seule présence écrase toute la carte vers le haut.
    const antarctica = ISO2_TO_NUMERIC.AQ;
    const forExtent = fc.features.filter((f: CountryFeature) => String(f.id) !== antarctica);

    const projection = geoNaturalEarth1();
    projection.fitExtent(
      [
        [12, 10],
        [W - 12, H - 10],
      ],
      { type: 'FeatureCollection', features: forExtent } as FeatureCollection,
    );

    // Garde-fou : le pays de l'hôtel doit toujours être entièrement visible.
    // Si ce n'est pas le cas, la projection est en cause et il vaut mieux
    // le savoir en développement qu'en démonstration client.
    const anchor = fc.features.find(
      (f: CountryFeature) => String(f.id) === ISO2_TO_NUMERIC[ANCHOR_ISO2],
    );
    if (anchor && import.meta.env?.DEV) {
      const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(anchor as never);
      if (x0 < 0 || y0 < 0 || x1 > W || y1 > H) {
        console.warn('[NationalityMap] le pays d’ancrage sort du cadre', [x0, y0, x1, y1]);
      }
    }

    const path = geoPath(projection);
    // La graticule couvre les pôles : bornée à la bande habitée, sinon
    // elle dépasse sous le cadre là où plus aucun pays n'est dessiné.
    const graticule = geoGraticule().extent([
      [-180, -60],
      [180, 84],
    ]);
    return {
      features: fc.features.filter((f: CountryFeature) => String(f.id) !== antarctica),
      pathFor: (f: unknown) => path(f as never) || '',
      graticulePath: path(graticule()) || '',
    };
  }, [byNumeric]);

  const colorFor = (num: string): string => {
    const d = byNumeric.get(num);
    if (!d || !maxGross) return T.empty;
    // Racine carrée : sans elle, la France écrase tout et les autres
    // marchés deviennent indiscernables du vide.
    const ratio = Math.sqrt(d.gross / maxGross);
    const idx = Math.min(RAMP.length - 1, Math.floor(ratio * RAMP.length));
    return RAMP[idx];
  };

  const hovered = hover ? countries.find((c) => c.code === hover) : null;
  const total = countries.reduce((s, c) => s + c.gross, 0);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        sx={{ width: '100%', height: 'auto', display: 'block', bgcolor: T.sea, borderRadius: 1.5 }}
      >
        <title>Répartition des clients par nationalité</title>
        <path d={graticulePath} fill="none" stroke="rgba(20,17,10,0.05)" strokeWidth={0.5} />

        {features.map((f: CountryFeature) => {
          const num = String(f.id);
          const d = byNumeric.get(num);
          const isHover = !!d && hover === d.code;
          return (
            <path
              key={num}
              d={pathFor(f)}
              fill={colorFor(num)}
              stroke={isHover ? T.primaryDeep : 'rgba(255,255,255,0.85)'}
              strokeWidth={isHover ? 1.2 : 0.4}
              style={{ cursor: d ? 'pointer' : 'default', transition: 'fill .15s' }}
              onMouseEnter={() => (d ? setHover(d.code) : undefined)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </Box>

      {hovered ? (
        <Box
          sx={{
            position: 'absolute',
            left: 12,
            top: 12,
            px: 1.5,
            py: 1,
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 1.25,
            boxShadow: '0 2px 12px rgba(20,17,10,0.10)',
            pointerEvents: 'none',
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: T.text }}>
            {countryFlag(hovered.code)} {countryName(hovered.code)}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: T.text2, mt: 0.25 }}>
            {hovered.gross.toLocaleString('fr-FR')} MAD ·{' '}
            {hovered.customers} client{hovered.customers > 1 ? 's' : ''}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
            {total ? Math.round((hovered.gross / total) * 100) : 0} % des extras
          </Typography>
        </Box>
      ) : null}

      <Stack
        direction="row"
        sx={{ alignItems: 'center', gap: 1, mt: 1.25, flexWrap: 'wrap' }}
      >
        <Typography sx={{ fontSize: 10.5, color: T.text3, fontWeight: 600 }}>Moins</Typography>
        {RAMP.map((c) => (
          <Box key={c} sx={{ width: 26, height: 9, bgcolor: c, borderRadius: 0.4 }} />
        ))}
        <Typography sx={{ fontSize: 10.5, color: T.text3, fontWeight: 600 }}>Plus</Typography>
        <Box sx={{ flex: 1 }} />
        {unknownCustomers > 0 ? (
          <Typography sx={{ fontSize: 10.5, color: T.text3, fontStyle: 'italic' }}>
            {unknownCustomers} client{unknownCustomers > 1 ? 's' : ''} sans nationalité renseignée
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
