import type { BodyContent, ContentId } from '../types';

// English body content, written natively from NASA Science pages
// (https://science.nasa.gov/solar-system/). Numbers in the info panel's data
// fields come from bodies.ts; the prose here only rounds where it reads better.
export const CONTENT_EN: Record<ContentId, BodyContent> = {
  sun: {
    name: 'The Sun',
    kindLabel: 'Star',
    description:
      'The Sun is a 4.6-billion-year-old ball of hydrogen and helium held together by its own gravity. Nuclear fusion in its core turns hydrogen into helium, releasing the light and heat that make life on Earth possible. It holds about 99.8% of all the mass in the Solar System.',
    facts: [
      'About 1.3 million Earths could fit inside the Sun.',
      'Its core reaches about 15 million °C, while the visible surface is a "cool" 5,500 °C.',
      'Sunlight takes about 8 minutes to reach Earth.',
      'The Sun is a fairly ordinary yellow dwarf, one of billions of stars in the Milky Way.',
    ],
  },
  mercury: {
    name: 'Mercury',
    kindLabel: 'Terrestrial planet',
    description:
      'Mercury is the smallest planet and the closest one to the Sun, only a little larger than our Moon. With almost no atmosphere to trap heat, its cratered surface swings from scorching days to freezing nights. It races around the Sun faster than any other planet.',
    facts: [
      'Daytime temperatures reach about 430 °C, but nights drop to about −180 °C.',
      'A year on Mercury lasts 88 Earth days, but one sunrise to the next takes 176 Earth days.',
      'Water ice may hide in polar craters that never see sunlight.',
      'As its interior cooled, Mercury shrank, wrinkling its crust into cliffs up to a mile high.',
    ],
  },
  venus: {
    name: 'Venus',
    kindLabel: 'Terrestrial planet',
    description:
      'Venus is almost Earth’s twin in size, but it is a very different world. A thick carbon dioxide atmosphere and clouds of sulfuric acid trap heat in a runaway greenhouse effect. That makes it the hottest planet in the Solar System, even though Mercury is closer to the Sun.',
    facts: [
      'The surface is about 465 °C, hot enough to melt lead.',
      'Venus spins backwards compared with most planets, so the Sun rises in the west.',
      'A day on Venus (243 Earth days) is longer than its year (225 Earth days).',
      'The air pressure at the surface is about 90 times that at sea level on Earth.',
    ],
  },
  earth: {
    name: 'Earth',
    kindLabel: 'Terrestrial planet',
    description:
      'Earth is our home and the only place we know of where life exists. It is the only world known to have liquid water on its surface, covering about 70% of the planet. A nitrogen-and-oxygen atmosphere and a magnetic field shield us from harmful radiation from space.',
    facts: [
      'Earth is the largest of the four rocky planets and the densest planet in the Solar System.',
      'Its axis is tilted about 23.4°, which gives us the seasons.',
      'Earth is the only planet not named after a Greek or Roman god.',
      'Earth’s rotation is gradually slowing, lengthening each day by a tiny fraction of a second per century.',
    ],
  },
  moon: {
    name: 'The Moon',
    kindLabel: 'Natural satellite',
    description:
      'The Moon is Earth’s only natural satellite and the brightest object in our night sky after the Sun. It probably formed from debris thrown out when a Mars-sized body slammed into the young Earth. Its gravity drives our ocean tides and helps keep Earth’s tilt, and therefore our climate, steady.',
    facts: [
      'The Moon always shows the same face to Earth because it spins once per orbit.',
      'Twelve astronauts walked on the Moon during NASA’s Apollo missions between 1969 and 1972.',
      'It is slowly drifting away from Earth, by about 3.8 cm each year.',
      'With almost no atmosphere, footprints left on the Moon can last for millions of years.',
    ],
  },
  mars: {
    name: 'Mars',
    kindLabel: 'Terrestrial planet',
    description:
      'Mars is a cold, dusty desert world whose red color comes from rusty iron minerals in its soil. Dry riverbeds and ancient lake beds show that liquid water once flowed across its surface. Today it is the most explored planet after Earth, with rovers and orbiters searching for signs of past life.',
    facts: [
      'Olympus Mons on Mars is the largest volcano in the Solar System, about three times the height of Mount Everest.',
      'A day on Mars lasts just over 24.6 hours, very close to an Earth day.',
      'Mars has two small, lumpy moons, Phobos and Deimos.',
      'Dust storms on Mars can grow large enough to cover the whole planet.',
    ],
  },
  'asteroid-belt': {
    name: 'Asteroid Belt',
    kindLabel: 'Region of the Solar System',
    description:
      'The main asteroid belt is a broad, doughnut-shaped region between Mars and Jupiter, roughly 2.2 to 3.2 AU from the Sun. It holds millions of rocky leftovers from the formation of the planets. Jupiter’s strong gravity kept these pieces from ever gathering into a single planet.',
    facts: [
      'All the asteroids in the belt put together have less mass than Earth’s Moon.',
      'Ceres, the largest object in the belt, is a dwarf planet holding about a quarter of the belt’s total mass.',
      'Scientists estimate there are 1.1 to 1.9 million asteroids larger than 1 km across.',
      'The belt is mostly empty space, and spacecraft have flown through it without hitting anything.',
    ],
  },
  jupiter: {
    name: 'Jupiter',
    kindLabel: 'Gas giant',
    description:
      'Jupiter is the largest planet, more than twice as massive as all the other planets combined. It is a giant ball of mostly hydrogen and helium, striped with bands of swirling clouds. Its huge family of moons includes Ganymede, the biggest moon in the Solar System.',
    facts: [
      'About 1,000 Earths could fit inside Jupiter.',
      'The Great Red Spot is a storm wider than Earth that has raged for more than 300 years.',
      'Jupiter has the shortest day of any planet, about 10 hours.',
      'Its moon Europa likely hides a vast ocean beneath its icy crust.',
      'Jupiter has faint rings of dark dust, discovered by Voyager 1 in 1979.',
    ],
  },
  saturn: {
    name: 'Saturn',
    kindLabel: 'Gas giant',
    description:
      'Saturn is famous for its dazzling rings, made of billions of chunks of ice and rock. Like Jupiter, it is a giant made mostly of hydrogen and helium. NASA’s Cassini spacecraft studied Saturn and its moons up close for 13 years.',
    facts: [
      'The main rings stretch hundreds of thousands of kilometers across, yet are often only about 10 m thick.',
      'Saturn is the only planet less dense than water.',
      'Its largest moon, Titan, has lakes and seas of liquid methane.',
      'Jets of water spray into space from the moon Enceladus.',
      'A six-sided jet stream, the “hexagon,” swirls around Saturn’s north pole.',
    ],
  },
  uranus: {
    name: 'Uranus',
    kindLabel: 'Ice giant',
    description:
      'Uranus is an ice giant that spins on its side, tilted about 98° from its orbit. Methane in its atmosphere absorbs red light, giving the planet its pale blue-green color. It was the first planet discovered with a telescope, by William Herschel in 1781.',
    facts: [
      'Because of its tilt, each pole gets about 21 years of continuous sunlight, then 21 years of darkness.',
      'Uranus spins in the opposite direction to most planets.',
      'Its moons are named after characters from the works of Shakespeare and Alexander Pope.',
      'Its cloud tops can drop to about −224 °C, the coldest planetary atmosphere measured in the Solar System.',
      'Only one spacecraft, Voyager 2 in 1986, has ever visited Uranus.',
    ],
  },
  neptune: {
    name: 'Neptune',
    kindLabel: 'Ice giant',
    description:
      'Neptune is the most distant major planet, a dark, cold world whipped by supersonic winds. It was the first planet found through mathematics: astronomers predicted where it should be from the way it tugged on Uranus. Johann Galle spotted it in 1846 on his first night of searching.',
    facts: [
      'Neptune’s winds reach more than 2,000 km/h, the fastest in the Solar System.',
      'One orbit around the Sun takes about 165 Earth years.',
      'Its largest moon, Triton, orbits backwards and may be a captured object from the Kuiper Belt.',
      'Voyager 2 flew past in 1989 and spotted a storm, the Great Dark Spot, big enough to swallow Earth.',
    ],
  },
  pluto: {
    name: 'Pluto',
    kindLabel: 'Dwarf planet',
    description:
      'Pluto was discovered in 1930 and counted as the ninth planet for 76 years. In 2006 the International Astronomical Union (IAU) reclassified it as a dwarf planet, because it has not cleared its orbit of other objects in the crowded Kuiper Belt. In 2015 NASA’s New Horizons flew past and revealed a world of icy mountains and a giant heart-shaped glacier.',
    facts: [
      'Under the IAU definition, a planet must orbit the Sun, be nearly round, and clear its orbital neighborhood; Pluto fails the last test.',
      'Pluto is only about two-thirds as wide as Earth’s Moon.',
      'Its largest moon, Charon, is about half Pluto’s size, and the two always show each other the same face.',
      'Pluto has five known moons: Charon, Nix, Hydra, Kerberos and Styx.',
      'One trip around the Sun takes Pluto about 248 Earth years.',
    ],
  },
  phobos: {
    name: 'Phobos',
    kindLabel: 'Moon of Mars',
    description:
      'Phobos is the larger and closer of Mars’ two small moons, a dark, lumpy body about 27 by 22 by 18 km. It races around Mars three times a day, only about 6,000 km above the surface. Fine dust covers it, and thousands of meteorite impacts have gouged its surface.',
    facts: [
      'Its largest crater, Stickney, is about 9 km wide.',
      'Phobos is creeping toward Mars by about 1.8 m every hundred years; in about 50 million years it will crash into Mars or break up into a ring.',
      'Asaph Hall discovered Phobos on August 17, 1877.',
      'Sunlit ground reaches about −4 °C, while shadowed ground drops to about −112 °C.',
    ],
  },
  deimos: {
    name: 'Deimos',
    kindLabel: 'Moon of Mars',
    description:
      'Deimos is the smaller and outer moon of Mars, an irregular body about 15 by 12 by 11 km. Its dark surface is made of carbon-rich material, like the asteroids of the outer asteroid belt. A layer of dust perhaps 100 m deep partly fills its craters, so it looks smoother than Phobos.',
    facts: [
      'Deimos circles Mars about every 30 hours.',
      'Its name means “dread”; in Greek myth Deimos is the brother of Phobos.',
      'Asaph Hall discovered Deimos on August 11, 1877, six days before Phobos.',
      'Most of its craters are smaller than 2.5 km across.',
    ],
  },
  io: {
    name: 'Io',
    kindLabel: 'Moon of Jupiter',
    description:
      'Io is the most volcanically active world in the Solar System, with hundreds of volcanoes, some throwing lava fountains dozens of kilometers high. It is caught in a tug-of-war between Jupiter’s huge gravity and the smaller, precisely timed pulls of Europa and Ganymede. Sulfur in many forms paints its surface yellow, orange, red and white.',
    facts: [
      'Galileo Galilei discovered Io on January 8, 1610.',
      'Jupiter’s pull makes Io’s solid surface rise and fall by as much as 100 m.',
      'For every orbit Ganymede makes, Europa orbits twice and Io four times.',
      'Jupiter strips about 1 ton of material from Io every second.',
    ],
  },
  europa: {
    name: 'Europa',
    kindLabel: 'Moon of Jupiter',
    description:
      'Europa is an icy moon about 90% the size of Earth’s Moon, its bright surface crisscrossed by long reddish-brown cracks. Under an ice shell about 15 to 25 km thick lies an ocean 60 to 150 km deep that may hold twice as much water as all of Earth’s oceans. That makes it one of the most promising places to look for life beyond Earth.',
    facts: [
      'So few craters mark Europa that its surface may be only 40 to 90 million years old.',
      'Its icy surface reflects about 5.5 times as much sunlight as our Moon.',
      'Sunlight takes about 45 minutes to reach Europa.',
      'Possible plumes of water have been seen rising about 160 km above its surface.',
    ],
  },
  ganymede: {
    name: 'Ganymede',
    kindLabel: 'Moon of Jupiter',
    description:
      'Ganymede is the largest moon in the Solar System, bigger than the planet Mercury and the dwarf planet Pluto. Its surface mixes old, dark, cratered regions with brighter terrain sliced by ridges and grooves. A saltwater ocean, thought to hold more water than all the water on Earth’s surface, lies under a crust of mostly ice about 150 km thick.',
    facts: [
      'It is the only moon known to have its own magnetic field, discovered by NASA’s Galileo spacecraft in 1996.',
      'Its magnetic field creates auroras around its north and south poles.',
      'Ganymede completes an orbit of Jupiter about every 7 days.',
      'Hubble has found evidence of a thin oxygen atmosphere.',
    ],
  },
  callisto: {
    name: 'Callisto',
    kindLabel: 'Moon of Jupiter',
    description:
      'Callisto has the oldest and most heavily cratered surface in the Solar System, about 4 billion years old. With no active volcanoes or moving plates to erase them, its craters have piled up over time. Bright white spots, thought to be crater peaks capped with water ice, dot its dark surface.',
    facts: [
      'Galileo Galilei discovered Callisto in 1610, together with Io, Europa and Ganymede.',
      'A salty ocean may lie about 250 km beneath its surface.',
      'Callisto is about 4.5 times farther from Jupiter than Io.',
      'It has an extremely thin atmosphere of carbon dioxide.',
    ],
  },
  enceladus: {
    name: 'Enceladus',
    kindLabel: 'Moon of Saturn',
    description:
      'Enceladus is a small icy moon, only about 500 km across, with the whitest, most reflective surface in the Solar System. Jets of water vapor and ice grains spray from warm cracks near its south pole, nicknamed the “tiger stripes.” A hidden ocean beneath the ice feeds them.',
    facts: [
      'Because it reflects so much sunlight, its surface is about −201 °C.',
      'Its icy spray spreads around its orbit and forms Saturn’s E ring.',
      'The jets leave the surface at about 400 m per second.',
      'William Herschel discovered Enceladus on August 28, 1789.',
    ],
  },
  titan: {
    name: 'Titan',
    kindLabel: 'Moon of Saturn',
    description:
      'Titan is Saturn’s largest moon and the only moon with a thick atmosphere, a nitrogen-rich orange haze that hides its surface. Below it, rain of methane and ethane fills lakes and seas, making Titan the only world besides Earth known to have liquid on its surface. An ocean of water may lie 55 to 80 km beneath its icy crust.',
    facts: [
      'Titan is nearly 50% wider than Earth’s Moon; only Ganymede is bigger.',
      'The air pressure at its surface is about 60% higher than on Earth.',
      'Christiaan Huygens discovered Titan on March 25, 1655.',
      'In 2005 the Huygens probe landed on Titan, the first landing in the outer Solar System.',
    ],
  },
};
