// Mega Evolutions — PokeAPI IDs with confirmed official artwork
export const MEGA_POKEMON_IDS: number[] = [
  // Gen 1 Megas
  10033, // Venusaur-Mega
  10034, // Charizard-Mega-X
  10035, // Charizard-Mega-Y
  10036, // Blastoise-Mega
  10037, // Alakazam-Mega
  10038, // Gengar-Mega
  10039, // Kangaskhan-Mega
  10040, // Pinsir-Mega
  10041, // Gyarados-Mega
  10042, // Aerodactyl-Mega
  10043, // Mewtwo-Mega-X
  10044, // Mewtwo-Mega-Y
  // Gen 2 Megas
  10045, // Ampharos-Mega
  10046, // Scizor-Mega
  10047, // Heracross-Mega
  10048, // Houndoom-Mega
  10049, // Tyranitar-Mega
  // Gen 3 Megas
  10050, // Blaziken-Mega
  10051, // Gardevoir-Mega
  10052, // Mawile-Mega
  10053, // Aggron-Mega
  10054, // Medicham-Mega
  10055, // Manectric-Mega
  10056, // Banette-Mega
  10057, // Absol-Mega
  10058, // Garchomp-Mega
  10059, // Lucario-Mega
  10060, // Abomasnow-Mega
  // Gen 4+ Megas
  10061, // Beedrill-Mega
  10062, // Pidgeot-Mega
  10063, // Slowbro-Mega
  10064, // Steelix-Mega
  10065, // Sceptile-Mega
  10066, // Swampert-Mega
  10067, // Sableye-Mega
  10068, // Sharpedo-Mega
  10069, // Camerupt-Mega
  10070, // Altaria-Mega
  10071, // Glalie-Mega
  10072, // Salamence-Mega
  10073, // Metagross-Mega
  10074, // Latias-Mega
  10075, // Latios-Mega
  10076, // Rayquaza-Mega
  10080, // Lopunny-Mega
  10081, // Gallade-Mega
  10082, // Audino-Mega
  10083, // Diancie-Mega
];

// Primal Reversions
export const PRIMAL_POKEMON_IDS: number[] = [
  10077, // Kyogre-Primal
  10078, // Groudon-Primal
];

// Alolan Forms
export const ALOLAN_POKEMON_IDS: number[] = [
  10091, // Rattata-Alola
  10092, // Raticate-Alola
  10100, // Raichu-Alola
  10101, // Sandshrew-Alola
  10102, // Sandslash-Alola
  10103, // Vulpix-Alola
  10104, // Ninetales-Alola
  10105, // Diglett-Alola
  10106, // Dugtrio-Alola
  10107, // Meowth-Alola
  10108, // Persian-Alola
  10109, // Geodude-Alola
  10110, // Graveler-Alola
  10111, // Golem-Alola
  10112, // Grimer-Alola
  10113, // Muk-Alola
  10114, // Exeggutor-Alola
  10115, // Marowak-Alola
];

// Galarian Forms
export const GALARIAN_POKEMON_IDS: number[] = [
  10158, // Meowth-Galar
  10159, // Ponyta-Galar
  10160, // Rapidash-Galar
  10161, // Slowpoke-Galar
  10162, // Slowbro-Galar
  10163, // Farfetchd-Galar
  10164, // Weezing-Galar
  10165, // Mr-Mime-Galar
  10166, // Articuno-Galar
  10167, // Zapdos-Galar
  10168, // Moltres-Galar
  10169, // Slowking-Galar
  10170, // Corsola-Galar
  10171, // Zigzagoon-Galar
  10172, // Linoone-Galar
  10173, // Darumaka-Galar
  10174, // Darmanitan-Galar
  10175, // Yamask-Galar
  10176, // Stunfisk-Galar
];

// Hisuian Forms
export const HISUIAN_POKEMON_IDS: number[] = [
  10221, // Growlithe-Hisui
  10222, // Arcanine-Hisui
  10223, // Voltorb-Hisui
  10224, // Electrode-Hisui
  10225, // Typhlosion-Hisui
  10226, // Qwilfish-Hisui
  10227, // Sneasel-Hisui
  10228, // Samurott-Hisui
  10229, // Lilligant-Hisui
  10230, // Zorua-Hisui
  10231, // Zoroark-Hisui
  10232, // Braviary-Hisui
  10233, // Sliggoo-Hisui
  10234, // Goodra-Hisui
  10235, // Avalugg-Hisui
  10236, // Decidueye-Hisui
];

// Paldean Forms
export const PALDEAN_POKEMON_IDS: number[] = [
  10250, // Tauros-Paldea (Combat)
  10251, // Tauros-Paldea (Blaze)
  10252, // Tauros-Paldea (Aqua)
  10253, // Wooper-Paldea
];

export const ALL_ALTERNATE_FORM_IDS: number[] = [
  ...MEGA_POKEMON_IDS,
  ...PRIMAL_POKEMON_IDS,
  ...ALOLAN_POKEMON_IDS,
  ...GALARIAN_POKEMON_IDS,
  ...HISUIAN_POKEMON_IDS,
  ...PALDEAN_POKEMON_IDS,
];
