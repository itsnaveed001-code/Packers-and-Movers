'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Field, Input, Box } from '@chakra-ui/react';
import { loadGoogleMaps, getMapsApiKey } from '@/lib/googleMaps';

export type ResolvedAddress = {
  address: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
};

// Bangalore bounding box used to bias autocomplete results.
const BLR_SW = { lat: 12.8, lng: 77.45 };
const BLR_NE = { lat: 13.14, lng: 77.78 };

export function AddressAutocomplete({
  id,
  label,
  value,
  onChange,
  onResolved,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onResolved: (r: ResolvedAddress) => void;
  error?: string;
  placeholder?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapObj = React.useRef<any>(null);
  const markerObj = React.useRef<any>(null);
  const [mapsReady, setMapsReady] = React.useState(false);
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  // Keep latest callbacks without re-running the attach effect.
  const onChangeRef = React.useRef(onChange);
  const onResolvedRef = React.useRef(onResolved);
  React.useEffect(() => {
    onChangeRef.current = onChange;
    onResolvedRef.current = onResolved;
  });

  React.useEffect(() => {
    if (!getMapsApiKey()) return;
    let listener: any = null;
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !inputRef.current) return;
        setMapsReady(true);
        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['address_components', 'formatted_address', 'geometry'],
          types: ['geocode'],
        });
        ac.setBounds(
          new google.maps.LatLngBounds(
            new google.maps.LatLng(BLR_SW.lat, BLR_SW.lng),
            new google.maps.LatLng(BLR_NE.lat, BLR_NE.lng),
          ),
        );
        listener = ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const comps: any[] = place.address_components || [];
          const get = (t: string) =>
            comps.find((c) => c.types?.includes(t))?.long_name as string | undefined;
          const city =
            get('sublocality_level_1') ||
            get('sublocality') ||
            get('locality') ||
            get('administrative_area_level_2');
          const pincode = get('postal_code');
          const address = place.formatted_address || inputRef.current?.value || '';
          const loc = place.geometry?.location;
          const lat = loc ? loc.lat() : undefined;
          const lng = loc ? loc.lng() : undefined;
          onChangeRef.current(address);
          onResolvedRef.current({ address, city, pincode, lat, lng });
          if (typeof lat === 'number' && typeof lng === 'number') setCoords({ lat, lng });
        });
      })
      .catch(() => {
        // No key / load failure → plain input fallback. Nothing to do.
      });

    return () => {
      cancelled = true;
      const g = (window as any).google;
      if (listener && g?.maps?.event) g.maps.event.removeListener(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render/update the mini map when a place with coordinates is chosen.
  React.useEffect(() => {
    if (!mapsReady || !coords || !mapRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;
    if (!mapObj.current) {
      mapObj.current = new google.maps.Map(mapRef.current, {
        center: coords,
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
      });
      markerObj.current = new google.maps.Marker({ map: mapObj.current, position: coords });
    } else {
      mapObj.current.setCenter(coords);
      markerObj.current.setPosition(coords);
    }
  }, [coords, mapsReady]);

  return (
    <Field.Root invalid={!!error}>
      <Field.Label htmlFor={id}>{label}</Field.Label>
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Stop Enter from submitting the form while picking a suggestion.
          if (e.key === 'Enter') e.preventDefault();
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      <Field.ErrorText>{error}</Field.ErrorText>
      {mapsReady && coords && (
        <Box
          ref={mapRef}
          aria-hidden
          mt={2}
          h="160px"
          w="full"
          overflow="hidden"
          rounded="lg"
          borderWidth="1px"
        />
      )}
    </Field.Root>
  );
}
