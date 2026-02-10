interface BuildMapsUrlOptions {
  name: string;
  destinationName: string;
  googleMapsUrl?: string | null;
}

interface MapsResult {
  url: string;
  isFallback: boolean;
}

export function buildMapsUrl({ name, destinationName, googleMapsUrl }: BuildMapsUrlOptions): MapsResult {
  if (googleMapsUrl && /^https?:\/\//i.test(googleMapsUrl)) {
    return { url: googleMapsUrl, isFallback: false };
  }

  const query = encodeURIComponent(`${name} ${destinationName} السعودية`);
  return {
    url: `https://www.google.com/maps/search/?api=1&query=${query}`,
    isFallback: true,
  };
}
