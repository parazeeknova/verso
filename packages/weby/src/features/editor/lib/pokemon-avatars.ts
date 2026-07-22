export interface GuestPokemon {
  id: number;
  name: string;
  avatar: string;
  color: string;
}

export const POKEMON_LIST: GuestPokemon[] = [
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    color: "#f59e0b",
    id: 25,
    name: "Pikachu",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png",
    color: "#d97706",
    id: 133,
    name: "Eevee",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
    color: "#ea580c",
    id: 6,
    name: "Charizard",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
    color: "#10b981",
    id: 1,
    name: "Bulbasaur",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png",
    color: "#06b6d4",
    id: 7,
    name: "Squirtle",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png",
    color: "#8b5cf6",
    id: 94,
    name: "Gengar",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png",
    color: "#3b82f6",
    id: 143,
    name: "Snorlax",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png",
    color: "#ec4899",
    id: 39,
    name: "Jigglypuff",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png",
    color: "#eab308",
    id: 54,
    name: "Psyduck",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png",
    color: "#f97316",
    id: 149,
    name: "Dragonite",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png",
    color: "#f472b6",
    id: 151,
    name: "Mew",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png",
    color: "#a855f7",
    id: 150,
    name: "Mewtwo",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png",
    color: "#0284c7",
    id: 448,
    name: "Lucario",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/445.png",
    color: "#1e40af",
    id: 445,
    name: "Garchomp",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png",
    color: "#15803d",
    id: 384,
    name: "Rayquaza",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/282.png",
    color: "#10b981",
    id: 282,
    name: "Gardevoir",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/175.png",
    color: "#fb7185",
    id: 175,
    name: "Togepi",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/393.png",
    color: "#38bdf8",
    id: 393,
    name: "Piplup",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/258.png",
    color: "#0ea5e9",
    id: 258,
    name: "Mudkip",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/197.png",
    color: "#64748b",
    id: 197,
    name: "Umbreon",
  },
];

export const getGuestPokemon = (): GuestPokemon => {
  if (typeof window === "undefined") {
    return POKEMON_LIST[0];
  }
  let guestIndexStr: string | null = null;
  try {
    guestIndexStr = sessionStorage.getItem("verso-guest-pokemon-idx");
  } catch {
    // ignore
  }
  if (!guestIndexStr) {
    const randomIdx = Math.floor(Math.random() * POKEMON_LIST.length);
    guestIndexStr = String(randomIdx);
    try {
      sessionStorage.setItem("verso-guest-pokemon-idx", guestIndexStr);
    } catch {
      // ignore
    }
  }
  const idx = Number.parseInt(guestIndexStr, 10) % POKEMON_LIST.length;
  return POKEMON_LIST[idx] || POKEMON_LIST[0];
};

export const getPokemonDetails = (nameOrAvatar?: string | null): GuestPokemon | undefined => {
  if (!nameOrAvatar) {
    return undefined;
  }
  const cleanName = nameOrAvatar
    .replace(/\s*\(Guest\)$/i, "")
    .toLowerCase()
    .trim();

  return POKEMON_LIST.find(
    (p) =>
      p.name.toLowerCase() === cleanName ||
      p.avatar === nameOrAvatar ||
      (nameOrAvatar.includes("/pokemon/") && nameOrAvatar.includes(`${p.id}.`)),
  );
};
