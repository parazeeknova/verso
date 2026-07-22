export interface GuestPokemon {
  id: number;
  name: string;
  avatar: string;
  color: string;
}

export const POKEMON_LIST: GuestPokemon[] = [
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/25.svg",
    color: "#f59e0b",
    id: 25,
    name: "Pikachu",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/133.svg",
    color: "#d97706",
    id: 133,
    name: "Eevee",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/6.svg",
    color: "#ea580c",
    id: 6,
    name: "Charizard",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/1.svg",
    color: "#10b981",
    id: 1,
    name: "Bulbasaur",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/7.svg",
    color: "#06b6d4",
    id: 7,
    name: "Squirtle",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/94.svg",
    color: "#8b5cf6",
    id: 94,
    name: "Gengar",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/143.svg",
    color: "#3b82f6",
    id: 143,
    name: "Snorlax",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/39.svg",
    color: "#ec4899",
    id: 39,
    name: "Jigglypuff",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/54.svg",
    color: "#eab308",
    id: 54,
    name: "Psyduck",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/149.svg",
    color: "#f97316",
    id: 149,
    name: "Dragonite",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/151.svg",
    color: "#f472b6",
    id: 151,
    name: "Mew",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/150.svg",
    color: "#a855f7",
    id: 150,
    name: "Mewtwo",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/448.svg",
    color: "#0284c7",
    id: 448,
    name: "Lucario",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/445.svg",
    color: "#1e40af",
    id: 445,
    name: "Garchomp",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/384.svg",
    color: "#15803d",
    id: 384,
    name: "Rayquaza",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/282.svg",
    color: "#10b981",
    id: 282,
    name: "Gardevoir",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/175.svg",
    color: "#fb7185",
    id: 175,
    name: "Togepi",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/393.svg",
    color: "#38bdf8",
    id: 393,
    name: "Piplup",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/258.svg",
    color: "#0ea5e9",
    id: 258,
    name: "Mudkip",
  },
  {
    avatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/197.svg",
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
