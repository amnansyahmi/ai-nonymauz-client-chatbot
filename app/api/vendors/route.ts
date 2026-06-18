import { NextRequest } from 'next/server';
import type { Vendor } from '../../../components/planner/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Map a wedding vendor category to a Google Places text query.
function buildQuery(category: string, negeri: string): string {
  const where = negeri && negeri !== 'All' ? `${negeri}, Malaysia` : 'Malaysia';
  const c = category.toLowerCase();
  const term =
    /photo|foto/.test(c) ? 'wedding photographer'
    : /video/.test(c) ? 'wedding videographer'
    : /cater|katering/.test(c) ? 'wedding catering'
    : /dewan|venue|hall/.test(c) ? 'wedding hall dewan'
    : /pelamin|dekor|decor/.test(c) ? 'wedding pelamin decoration'
    : /andaman|mua|makeup|make-?up/.test(c) ? 'wedding makeup artist'
    : /baju|attire|butik|gown|tailor|jahit/.test(c) ? 'wedding boutique butik pengantin'
    : /hantaran|gubahan/.test(c) ? 'gubahan hantaran kahwin'
    : /kad|invitation|jemputan/.test(c) ? 'kad kahwin printing'
    : /kek|cake/.test(c) ? 'wedding cake'
    : /kompang|hiburan|dj|band/.test(c) ? 'kompang wedding'
    : `wedding ${category}`;
  return `${term} in ${where}`;
}

type PlacesResult = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  priceLevel?: string;
};

// Rough RM range hints from Google's coarse price level (no real prices in API).
function priceRange(level: string | undefined): { min: number; max: number } {
  switch (level) {
    case 'PRICE_LEVEL_INEXPENSIVE':
      return { min: 500, max: 2000 };
    case 'PRICE_LEVEL_MODERATE':
      return { min: 2000, max: 6000 };
    case 'PRICE_LEVEL_EXPENSIVE':
      return { min: 6000, max: 15000 };
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return { min: 15000, max: 40000 };
    default:
      return { min: 0, max: 0 };
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';

  let body: { category?: string; negeri?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const category = (body.category || '').trim() || 'wedding vendor';
  const negeri = (body.negeri || '').trim();

  if (!apiKey) {
    return Response.json(
      { vendors: [], fallback: true, reason: 'no-api-key' },
      { status: 200 }
    );
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.priceLevel'
      },
      body: JSON.stringify({
        textQuery: buildQuery(category, negeri),
        regionCode: 'MY',
        maxResultCount: 20
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return Response.json({ vendors: [], fallback: true, reason: `places-${response.status}`, detail: text.slice(0, 200) }, { status: 200 });
    }

    const data = (await response.json()) as { places?: PlacesResult[] };
    const places = data.places || [];
    const vendors: Vendor[] = places.map((place, index) => {
      const { min, max } = priceRange(place.priceLevel);
      const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
      return {
        id: `google-${index}-${(place.displayName?.text || 'vendor').replace(/\W+/g, '').slice(0, 16)}`,
        name: place.displayName?.text || 'Vendor',
        category,
        negeri: negeri || 'Malaysia',
        minPrice: min,
        maxPrice: max,
        contact: phone,
        rating: typeof place.rating === 'number' ? place.rating : 0,
        ratingCount: place.userRatingCount,
        note: place.formattedAddress || '',
        address: place.formattedAddress,
        website: place.websiteUri,
        mapsUri: place.googleMapsUri,
        source: 'google'
      };
    });

    return Response.json({ vendors, fallback: false }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    return Response.json({ vendors: [], fallback: true, reason: 'fetch-failed', detail: message }, { status: 200 });
  }
}
