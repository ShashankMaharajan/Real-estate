import home from "@/assets/kathmandu-home.jpg";
import apartment from "@/assets/lalitpur-apartment.jpg";
import land from "@/assets/budhanilkantha-land.jpg";

// PLACEHOLDER LISTINGS — every property, price and detail below is illustrative.
// Replace this list with real listings (same shape) before launch.

export const cities = ["kathmandu", "lalitpur", "bhaktapur"] as const;
export const propertyTypes = ["house", "apartment", "land"] as const;
export type City = (typeof cities)[number];
export type PropertyType = (typeof propertyTypes)[number];
export type ListingStatus = "for-sale" | "reserved";

export const cityLabels: Record<City, string> = {
  kathmandu: "Kathmandu",
  lalitpur: "Lalitpur",
  bhaktapur: "Bhaktapur",
};
export const typeLabels: Record<PropertyType, string> = {
  house: "House",
  apartment: "Apartment",
  land: "Land",
};
export const statusLabels: Record<ListingStatus, string> = {
  "for-sale": "For sale",
  reserved: "Reserved",
};

export interface Property {
  /** URL segment: /properties/<slug>. Keep it stable once shared. */
  slug: string;
  name: string;
  type: PropertyType;
  status: ListingStatus;
  neighbourhood: string;
  city: City;
  /** Asking price in NPR. For land this is the total; `pricePerAana` holds the rate. */
  price: number;
  pricePerAana?: number;
  /** Plot size in aana (16 aana = 1 ropani). Omit for apartments. */
  landAana?: number;
  builtUpSqFt?: number;
  beds?: number;
  baths?: number;
  /** Houses: number of storeys ("2.5"). Apartments: which floor ("6th of 12"). */
  floors?: string;
  parking?: string;
  roadAccessFt: number;
  facing: string;
  water: string;
  ringRoadKm: number;
  documents: string;
  /** Approximate neighbourhood centre — not the exact plot. */
  coordinates: { lat: number; lng: number };
  image: string;
  imageAlt: string;
  summary: string;
  description: string[];
  highlights: string[];
  featured: boolean;
  /** YYYY-MM-DD, used for "Newest first". */
  listedOn: string;
}

export const properties: Property[] = [
  {
    slug: "bhaisepati-family-home",
    name: "A modern family retreat",
    type: "house",
    status: "for-sale",
    neighbourhood: "Bhaisepati",
    city: "lalitpur",
    price: 45_000_000,
    landAana: 6,
    builtUpSqFt: 2800,
    beds: 4,
    baths: 3,
    floors: "2.5",
    parking: "2 cars",
    roadAccessFt: 20,
    facing: "East",
    water: "Melamchi line + boring",
    ringRoadKm: 3.5,
    documents: "Lalpurja ready for review",
    coordinates: { lat: 27.6496, lng: 85.2986 },
    image: home,
    imageAlt: "Contemporary family home with a landscaped garden and mountain views",
    summary:
      "A light-filled family residence with generous living spaces, a private garden and mountain views.",
    description: [
      "Set on a quiet lane in Bhaisepati, this home was designed around natural light. Living and dining spaces open onto a private garden, with the hills visible from the upper floor.",
      "Four bedrooms, a family lounge and a rooftop terrace give everyone room to spread out, while the neighbourhood keeps schools, shops and the Ring Road within easy reach.",
    ],
    highlights: [
      "Private garden with hill views",
      "Open-plan kitchen and family dining",
      "Rooftop terrace with solar water heating",
      "Earthquake-resistant RCC frame",
    ],
    featured: true,
    listedOn: "2026-09-28",
  },
  {
    slug: "sanepa-three-bedroom-apartment",
    name: "Elevated everyday living",
    type: "apartment",
    status: "for-sale",
    neighbourhood: "Sanepa",
    city: "lalitpur",
    price: 18_500_000,
    builtUpSqFt: 1450,
    beds: 3,
    baths: 2,
    floors: "6th of 12",
    parking: "1 car (basement)",
    roadAccessFt: 25,
    facing: "South",
    water: "Centralised supply",
    ringRoadKm: 0.8,
    documents: "Unit lalpurja ready for review",
    coordinates: { lat: 27.6851, lng: 85.3062 },
    image: apartment,
    imageAlt: "Bright apartment living room opening onto a balcony",
    summary:
      "An inviting apartment with open balconies, contemporary finishes and easy access to the city.",
    description: [
      "A south-facing three-bedroom apartment in one of Lalitpur's most connected neighbourhoods. The living room opens onto a wide balcony that catches the winter sun.",
      "The building has lift access, power backup and basement parking, and cafés, schools and the Ring Road are all a short walk away.",
    ],
    highlights: [
      "South-facing balcony",
      "Lift and full power backup",
      "Basement parking",
      "Walkable to Jhamsikhel and Kupondole",
    ],
    featured: true,
    listedOn: "2026-10-02",
  },
  {
    slug: "budhanilkantha-residential-land",
    name: "Room for your vision",
    type: "land",
    status: "for-sale",
    neighbourhood: "Budhanilkantha",
    city: "kathmandu",
    price: 28_000_000,
    pricePerAana: 3_500_000,
    landAana: 8,
    roadAccessFt: 16,
    facing: "South-east",
    water: "Municipal line nearby",
    ringRoadKm: 6.5,
    documents: "Lalpurja ready for review",
    coordinates: { lat: 27.7712, lng: 85.3606 },
    image: land,
    imageAlt: "Green residential plot at the foot of the hills",
    summary:
      "A residential plot in a peaceful setting, offering space to build a home at the foot of the hills.",
    description: [
      "A gently sloping eight-aana plot in a settled residential pocket of Budhanilkantha, with open views towards Shivapuri.",
      "The plot has a regular shape and direct access from a 16 ft road, which makes it well suited to a family home with a garden.",
    ],
    highlights: [
      "Regular, buildable shape",
      "Open views towards Shivapuri",
      "Established residential neighbourhood",
      "Electricity at the boundary",
    ],
    featured: true,
    listedOn: "2026-09-20",
  },
  {
    slug: "baluwatar-courtyard-house",
    name: "A quiet courtyard house",
    type: "house",
    status: "for-sale",
    neighbourhood: "Baluwatar",
    city: "kathmandu",
    price: 72_500_000,
    landAana: 5.5,
    builtUpSqFt: 3400,
    beds: 5,
    baths: 4,
    floors: "3",
    parking: "2 cars",
    roadAccessFt: 13,
    facing: "North",
    water: "Melamchi line + boring",
    ringRoadKm: 1.2,
    documents: "Lalpurja ready for review",
    coordinates: { lat: 27.7298, lng: 85.3305 },
    image: home,
    imageAlt: "Family house with a garden courtyard in a quiet Kathmandu lane",
    summary:
      "A spacious family house arranged around a sunny inner courtyard, minutes from Lazimpat.",
    description: [
      "Tucked into a quiet lane in Baluwatar, this five-bedroom house is planned around a central courtyard — the aangan that gives our name its meaning.",
      "Generous rooms, a separate guest suite and parking for two cars make it equally suited to a large family or a home office.",
    ],
    highlights: [
      "Central courtyard garden",
      "Ground-floor guest suite",
      "Parking for two cars",
      "Close to embassies and international schools",
    ],
    featured: false,
    listedOn: "2026-09-12",
  },
  {
    slug: "jhamsikhel-two-bedroom-apartment",
    name: "Compact city living",
    type: "apartment",
    status: "for-sale",
    neighbourhood: "Jhamsikhel",
    city: "lalitpur",
    price: 12_500_000,
    builtUpSqFt: 1050,
    beds: 2,
    baths: 2,
    floors: "3rd of 9",
    parking: "Scooter + shared car parking",
    roadAccessFt: 20,
    facing: "West",
    water: "Centralised supply",
    ringRoadKm: 1,
    documents: "Unit lalpurja ready for review",
    coordinates: { lat: 27.681, lng: 85.3088 },
    image: apartment,
    imageAlt: "Modern two-bedroom apartment with warm wooden finishes",
    summary: "A well-planned two-bedroom apartment in the heart of Jhamsikhel's café streets.",
    description: [
      "An efficient two-bedroom layout with an open kitchen, two full bathrooms and a west-facing balcony for evening light.",
      "Ideal as a first home or a rental investment in one of the valley's most sought-after neighbourhoods.",
    ],
    highlights: [
      "Two en-suite bedrooms",
      "Open kitchen and living area",
      "Strong rental demand in the area",
      "Lift and power backup",
    ],
    featured: false,
    listedOn: "2026-10-06",
  },
  {
    slug: "suryabinayak-family-house",
    name: "Space to grow in Bhaktapur",
    type: "house",
    status: "for-sale",
    neighbourhood: "Suryabinayak",
    city: "bhaktapur",
    price: 24_000_000,
    landAana: 4,
    builtUpSqFt: 2200,
    beds: 4,
    baths: 3,
    floors: "2.5",
    parking: "1 car",
    roadAccessFt: 14,
    facing: "South",
    water: "Boring + tanker backup",
    ringRoadKm: 7.5,
    documents: "Lalpurja ready for review",
    coordinates: { lat: 27.6667, lng: 85.4281 },
    image: home,
    imageAlt: "Bright family house with a front garden near Bhaktapur",
    summary:
      "A sunny four-bedroom family home with a garden, close to Suryabinayak and old Bhaktapur.",
    description: [
      "A south-facing house with a front garden, a large family kitchen and a rooftop with views across the valley.",
      "Suryabinayak offers a calmer pace with schools and markets nearby, and old Bhaktapur's squares are a short drive away.",
    ],
    highlights: [
      "South-facing front garden",
      "Rooftop with valley views",
      "Quiet residential street",
      "Near schools and local markets",
    ],
    featured: false,
    listedOn: "2026-08-30",
  },
  {
    slug: "tokha-residential-plot",
    name: "Open skies in Tokha",
    type: "land",
    status: "for-sale",
    neighbourhood: "Tokha",
    city: "kathmandu",
    price: 26_400_000,
    pricePerAana: 2_200_000,
    landAana: 12,
    roadAccessFt: 20,
    facing: "East",
    water: "Boring feasible",
    ringRoadKm: 3,
    documents: "Lalpurja ready for review",
    coordinates: { lat: 27.7562, lng: 85.3247 },
    image: land,
    imageAlt: "Open residential land with hills in the background",
    summary:
      "A twelve-aana plot on a 20 ft road, with room for a family home or two separate builds.",
    description: [
      "An east-facing plot in Tokha's growing residential belt, close enough to the Ring Road for a daily commute.",
      "At twelve aana, it has room for a large home and garden, or can be divided for two family houses.",
    ],
    highlights: [
      "20 ft road access",
      "East-facing with morning light",
      "Large enough to divide",
      "Growing residential area",
    ],
    featured: false,
    listedOn: "2026-09-05",
  },
  {
    slug: "godawari-hillside-land",
    name: "Hillside land near Godawari",
    type: "land",
    status: "reserved",
    neighbourhood: "Godawari",
    city: "lalitpur",
    price: 36_000_000,
    pricePerAana: 1_800_000,
    landAana: 20,
    roadAccessFt: 13,
    facing: "North-east",
    water: "Spring-fed line + boring",
    ringRoadKm: 9,
    documents: "Lalpurja ready for review",
    coordinates: { lat: 27.5934, lng: 85.3786 },
    image: land,
    imageAlt: "Hillside plot surrounded by greenery near Godawari",
    summary: "Over a ropani of green hillside land near the Godawari botanical gardens.",
    description: [
      "A peaceful one ropani four aana plot surrounded by greenery, close to the Godawari botanical gardens.",
      "Suited to a weekend home, a retreat or a long-term land investment on the valley's quieter southern edge.",
    ],
    highlights: [
      "Over one ropani",
      "Surrounded by greenery",
      "Near Godawari botanical gardens",
      "Suited to a retreat or weekend home",
    ],
    featured: false,
    listedOn: "2026-08-18",
  },
  {
    slug: "imadol-modern-house",
    name: "Bright and newly built",
    type: "house",
    status: "for-sale",
    neighbourhood: "Imadol",
    city: "lalitpur",
    price: 31_000_000,
    landAana: 4.5,
    builtUpSqFt: 2600,
    beds: 5,
    baths: 4,
    floors: "3",
    parking: "1 car",
    roadAccessFt: 16,
    facing: "West",
    water: "Boring + Melamchi line",
    ringRoadKm: 2.5,
    documents: "Lalpurja ready for review",
    coordinates: { lat: 27.6647, lng: 85.3428 },
    image: home,
    imageAlt: "Newly built modern house with large windows",
    summary: "A newly completed five-bedroom house with modern finishes, ready to move in.",
    description: [
      "Completed this year, this three-storey home has large windows, a modular kitchen and a bathroom on every floor.",
      "Imadol is a well-connected residential area with schools, hospitals and shopping close by.",
    ],
    highlights: [
      "Newly completed — ready to move in",
      "Modular kitchen",
      "Bathroom on every floor",
      "Close to schools and hospitals",
    ],
    featured: false,
    listedOn: "2026-10-08",
  },
];

export function getProperty(slug: string): Property | undefined {
  return properties.find((p) => p.slug === slug);
}

/** Other listings ranked by similarity: same type first, then same city. */
export function getSimilarProperties(property: Property, limit = 3): Property[] {
  return properties
    .filter((p) => p.slug !== property.slug)
    .map((p) => ({
      p,
      score: (p.type === property.type ? 2 : 0) + (p.city === property.city ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}
