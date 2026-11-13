import type { BodyContent, ContentId } from '../types';

// German body content, translated by AI from the English source (content/en.ts,
// itself written from NASA Science pages). Informal "du" form where the viewer is
// addressed. Facts and numbers follow the English text; only the wording is German.
export const CONTENT_DE: Record<ContentId, BodyContent> = {
  sun: {
    name: 'Sonne',
    kindLabel: 'Stern',
    description:
      'Die Sonne ist eine 4,6 Milliarden Jahre alte Kugel aus Wasserstoff und Helium, die ihre eigene Schwerkraft zusammenhält. Im Kern verschmilzt Wasserstoff zu Helium und setzt dabei das Licht und die Wärme frei, die Leben auf der Erde erst möglich machen. Auf die Sonne entfallen etwa 99,8 % der gesamten Masse des Sonnensystems.',
    facts: [
      'In die Sonne würden etwa 1,3 Millionen Erden passen.',
      'Ihr Kern erreicht rund 15 Millionen °C, die sichtbare Oberfläche ist mit 5.500 °C dagegen „kühl“.',
      'Das Sonnenlicht braucht etwa 8 Minuten bis zur Erde.',
      'Die Sonne ist ein recht gewöhnlicher Gelber Zwerg, einer von Milliarden Sternen der Milchstraße.',
    ],
  },
  mercury: {
    name: 'Merkur',
    kindLabel: 'Gesteinsplanet',
    description:
      'Merkur ist der kleinste Planet und der sonnennächste, nur wenig größer als unser Mond. Weil es kaum eine Atmosphäre gibt, die Wärme festhält, wechselt seine von Kratern übersäte Oberfläche zwischen glühend heißen Tagen und eiskalten Nächten. Er umkreist die Sonne schneller als jeder andere Planet.',
    facts: [
      'Tagsüber werden es etwa 430 °C, nachts sinkt die Temperatur auf rund −180 °C.',
      'Ein Jahr auf dem Merkur dauert 88 Erdentage, von einem Sonnenaufgang zum nächsten vergehen aber 176 Erdentage.',
      'In Polarkratern, die nie Sonnenlicht sehen, könnte Wassereis verborgen sein.',
      'Beim Abkühlen seines Inneren ist der Merkur geschrumpft, wodurch sich seine Kruste zu bis zu einer Meile hohen Klippen zusammengeschoben hat.',
    ],
  },
  venus: {
    name: 'Venus',
    kindLabel: 'Gesteinsplanet',
    description:
      'Die Venus ist fast so groß wie die Erde, aber eine völlig andere Welt. Eine dichte Atmosphäre aus Kohlendioxid und Wolken aus Schwefelsäure halten die Wärme in einem galoppierenden Treibhauseffekt fest. Deshalb ist sie der heißeste Planet des Sonnensystems, obwohl der Merkur der Sonne näher ist.',
    facts: [
      'Die Oberfläche ist etwa 465 °C heiß, heiß genug, um Blei zu schmelzen.',
      'Die Venus dreht sich anders herum als die meisten Planeten, deshalb geht die Sonne dort im Westen auf.',
      'Ein Tag auf der Venus (243 Erdentage) ist länger als ihr Jahr (225 Erdentage).',
      'Der Luftdruck an der Oberfläche ist etwa 90-mal so hoch wie auf der Erde auf Meereshöhe.',
    ],
  },
  earth: {
    name: 'Erde',
    kindLabel: 'Gesteinsplanet',
    description:
      'Die Erde ist unser Zuhause und der einzige Ort, an dem wir Leben kennen. Sie ist die einzige bekannte Welt mit flüssigem Wasser an der Oberfläche, das etwa 70 % des Planeten bedeckt. Eine Atmosphäre aus Stickstoff und Sauerstoff sowie ein Magnetfeld schützen uns vor schädlicher Strahlung aus dem All.',
    facts: [
      'Die Erde ist der größte der vier Gesteinsplaneten und der dichteste Planet des Sonnensystems.',
      'Ihre Achse ist um etwa 23,4° geneigt, und das sorgt für die Jahreszeiten.',
      'Die Erde ist der einzige Planet, der nicht nach einem griechischen oder römischen Gott benannt ist.',
      'Die Erdrotation wird allmählich langsamer, und jeder Tag wird pro Jahrhundert um einen winzigen Bruchteil einer Sekunde länger.',
    ],
  },
  moon: {
    name: 'Mond',
    kindLabel: 'Natürlicher Satellit',
    description:
      'Der Mond ist der einzige natürliche Satellit der Erde und nach der Sonne das hellste Objekt an unserem Nachthimmel. Er entstand wahrscheinlich aus Trümmern, die herausgeschleudert wurden, als ein marsgroßer Körper auf die junge Erde prallte. Seine Schwerkraft erzeugt unsere Gezeiten und hilft, die Neigung der Erde und damit unser Klima stabil zu halten.',
    facts: [
      'Der Mond zeigt der Erde immer dieselbe Seite, weil er sich pro Umlauf genau einmal dreht.',
      'Zwölf Astronauten betraten den Mond während der Apollo-Missionen der NASA zwischen 1969 und 1972.',
      'Er entfernt sich langsam von der Erde, um etwa 3,8 cm pro Jahr.',
      'Weil es fast keine Atmosphäre gibt, können Fußspuren auf dem Mond Millionen von Jahren überdauern.',
    ],
  },
  mars: {
    name: 'Mars',
    kindLabel: 'Gesteinsplanet',
    description:
      'Der Mars ist eine kalte, staubige Wüstenwelt, deren rote Farbe von rostigen Eisenmineralen im Boden stammt. Trockene Flussbetten und uralte Seebetten zeigen, dass einst flüssiges Wasser über seine Oberfläche floss. Heute ist er nach der Erde der am besten erforschte Planet, und Rover und Orbiter suchen nach Spuren früheren Lebens.',
    facts: [
      'Der Olympus Mons auf dem Mars ist der größte Vulkan des Sonnensystems und etwa dreimal so hoch wie der Mount Everest.',
      'Ein Tag auf dem Mars dauert gut 24,6 Stunden und ist damit einem Erdentag sehr ähnlich.',
      'Der Mars hat zwei kleine, unförmige Monde, Phobos und Deimos.',
      'Staubstürme auf dem Mars können so groß werden, dass sie den ganzen Planeten bedecken.',
    ],
  },
  'asteroid-belt': {
    name: 'Asteroidengürtel',
    kindLabel: 'Region des Sonnensystems',
    description:
      'Der Hauptgürtel der Asteroiden ist ein breiter, ringförmiger Bereich zwischen Mars und Jupiter, etwa 2,2 bis 3,2 astronomische Einheiten (AE) von der Sonne entfernt. Er enthält Millionen felsiger Überbleibsel aus der Entstehungszeit der Planeten. Jupiters starke Schwerkraft hat verhindert, dass sich diese Brocken je zu einem einzigen Planeten zusammenfanden.',
    facts: [
      'Alle Asteroiden des Gürtels zusammen haben weniger Masse als der Erdmond.',
      'Ceres, das größte Objekt im Gürtel, ist ein Zwergplanet und vereint etwa ein Viertel der Gesamtmasse des Gürtels.',
      'Forscher schätzen, dass es 1,1 bis 1,9 Millionen Asteroiden mit mehr als 1 km Durchmesser gibt.',
      'Der Gürtel besteht größtenteils aus leerem Raum, und Raumsonden sind schon hindurchgeflogen, ohne etwas zu treffen.',
    ],
  },
  jupiter: {
    name: 'Jupiter',
    kindLabel: 'Gasriese',
    description:
      'Jupiter ist der größte Planet und hat mehr als doppelt so viel Masse wie alle anderen Planeten zusammen. Er ist eine riesige Kugel überwiegend aus Wasserstoff und Helium, durchzogen von Bändern wirbelnder Wolken. Zu seiner großen Mondfamilie gehört Ganymed, der größte Mond des Sonnensystems.',
    facts: [
      'In Jupiter würden etwa 1.000 Erden passen.',
      'Der Große Rote Fleck ist ein Sturm, breiter als die Erde, der seit mehr als 300 Jahren tobt.',
      'Jupiter hat den kürzesten Tag aller Planeten, etwa 10 Stunden.',
      'Auf seinem Mond Europa verbirgt sich unter der Eiskruste wahrscheinlich ein gewaltiger Ozean.',
      'Jupiter hat schwache Ringe aus dunklem Staub, die Voyager 1 im Jahr 1979 entdeckte.',
    ],
  },
  saturn: {
    name: 'Saturn',
    kindLabel: 'Gasriese',
    description:
      'Saturn ist berühmt für seine strahlenden Ringe aus Milliarden von Eis- und Gesteinsbrocken. Wie Jupiter ist er ein Riese, der überwiegend aus Wasserstoff und Helium besteht. Die NASA-Sonde Cassini hat Saturn und seine Monde 13 Jahre lang aus nächster Nähe erforscht.',
    facts: [
      'Die Hauptringe erstrecken sich über Hunderttausende Kilometer, sind aber oft nur etwa 10 m dick.',
      'Saturn ist der einzige Planet mit geringerer Dichte als Wasser.',
      'Sein größter Mond Titan hat Seen und Meere aus flüssigem Methan.',
      'Vom Mond Enceladus schießen Wasserfontänen ins All.',
      'Ein sechseckiger Jetstream, das „Hexagon“, wirbelt um Saturns Nordpol.',
    ],
  },
  uranus: {
    name: 'Uranus',
    kindLabel: 'Eisriese',
    description:
      'Uranus ist ein Eisriese, der auf der Seite liegend rotiert, seine Achse ist um etwa 98° gegen die Bahnebene geneigt. Methan in seiner Atmosphäre schluckt rotes Licht und verleiht dem Planeten seine blassblaugrüne Farbe. Er war der erste Planet, der mit einem Teleskop entdeckt wurde: William Herschel fand ihn 1781.',
    facts: [
      'Wegen der Neigung bekommt jeder Pol etwa 21 Jahre lang ununterbrochen Sonnenlicht und dann 21 Jahre lang Dunkelheit.',
      'Uranus dreht sich entgegengesetzt zu den meisten Planeten.',
      'Seine Monde sind nach Figuren aus den Werken von Shakespeare und Alexander Pope benannt.',
      'Seine Wolkenobergrenze kann auf etwa −224 °C abkühlen, die kälteste im Sonnensystem gemessene Planetenatmosphäre.',
      'Nur eine einzige Raumsonde, Voyager 2 im Jahr 1986, hat Uranus je besucht.',
    ],
  },
  neptune: {
    name: 'Neptun',
    kindLabel: 'Eisriese',
    description:
      'Neptun ist der entfernteste große Planet, eine dunkle, kalte Welt, über die Überschallwinde fegen. Er war der erste Planet, der durch Mathematik gefunden wurde: Astronomen sagten seinen Ort aus der Art voraus, wie er an Uranus zog. Johann Galle entdeckte ihn 1846 in der ersten Nacht seiner Suche.',
    facts: [
      'Neptuns Winde erreichen mehr als 2.000 km/h und sind die schnellsten im Sonnensystem.',
      'Ein Umlauf um die Sonne dauert etwa 165 Erdjahre.',
      'Sein größter Mond Triton umkreist ihn rückläufig und ist möglicherweise ein eingefangenes Objekt aus dem Kuipergürtel.',
      'Voyager 2 flog 1989 vorbei und entdeckte einen Sturm, den Großen Dunklen Fleck, der groß genug war, um die Erde zu verschlucken.',
    ],
  },
  pluto: {
    name: 'Pluto',
    kindLabel: 'Zwergplanet',
    description:
      'Pluto wurde 1930 entdeckt und galt 76 Jahre lang als der neunte Planet. 2006 stufte ihn die Internationale Astronomische Union (IAU) zum Zwergplaneten herab, weil er seine Umlaufbahn im dicht besiedelten Kuipergürtel nicht von anderen Objekten freigeräumt hat. 2015 flog die NASA-Sonde New Horizons vorbei und zeigte eine Welt mit Eisgebirgen und einem riesigen herzförmigen Gletscher.',
    facts: [
      'Nach der Definition der IAU muss ein Planet die Sonne umkreisen, annähernd rund sein und seine Umgebung auf der Bahn freigeräumt haben; Pluto scheitert am letzten Punkt.',
      'Pluto ist nur etwa zwei Drittel so breit wie der Erdmond.',
      'Sein größter Mond Charon ist etwa halb so groß wie Pluto, und die beiden zeigen einander immer dieselbe Seite.',
      'Pluto hat fünf bekannte Monde: Charon, Nix, Hydra, Kerberos und Styx.',
      'Für einen Umlauf um die Sonne braucht Pluto etwa 248 Erdjahre.',
    ],
  },
  phobos: {
    name: 'Phobos',
    kindLabel: 'Marsmond',
    description:
      'Phobos ist der größere und innere der beiden kleinen Marsmonde, ein dunkler, unförmiger Körper von etwa 27 mal 22 mal 18 km. Er umkreist den Mars dreimal am Tag, nur etwa 6.000 km über der Oberfläche. Feiner Staub bedeckt ihn, und Tausende Meteoriteneinschläge haben seine Oberfläche zerfurcht.',
    facts: [
      'Sein größter Krater, Stickney, ist etwa 9 km breit.',
      'Phobos nähert sich dem Mars um etwa 1,8 m pro hundert Jahre; in rund 50 Millionen Jahren wird er auf den Mars stürzen oder zu einem Ring zerbrechen.',
      'Asaph Hall entdeckte Phobos am 17. August 1877.',
      'Sonnenbeschienener Boden erreicht etwa −4 °C, im Schatten sinkt die Temperatur auf etwa −112 °C.',
    ],
  },
  deimos: {
    name: 'Deimos',
    kindLabel: 'Marsmond',
    description:
      'Deimos ist der kleinere und äußere Marsmond, ein unregelmäßiger Körper von etwa 15 mal 12 mal 11 km. Seine dunkle Oberfläche besteht aus kohlenstoffreichem Material, ähnlich wie die Asteroiden im äußeren Asteroidengürtel. Eine vielleicht 100 m dicke Staubschicht füllt seine Krater teilweise auf, deshalb wirkt er glatter als Phobos.',
    facts: [
      'Deimos umrundet den Mars etwa alle 30 Stunden.',
      'Sein Name bedeutet „Schrecken“; in der griechischen Mythologie ist Deimos der Bruder von Phobos.',
      'Asaph Hall entdeckte Deimos am 11. August 1877, sechs Tage vor Phobos.',
      'Die meisten seiner Krater sind kleiner als 2,5 km.',
    ],
  },
  io: {
    name: 'Io',
    kindLabel: 'Jupitermond',
    description:
      'Io ist die vulkanisch aktivste Welt im Sonnensystem, mit Hunderten Vulkanen, von denen manche Lavafontänen Dutzende Kilometer hoch schleudern. Io steckt in einem Tauziehen zwischen Jupiters gewaltiger Schwerkraft und den kleineren, genau getakteten Zügen von Europa und Ganymed. Schwefel in vielen Formen färbt die Oberfläche gelb, orange, rot und weiß.',
    facts: [
      'Galileo Galilei entdeckte Io am 8. Januar 1610.',
      'Jupiters Anziehung hebt und senkt Ios feste Oberfläche um bis zu 100 m.',
      'Während Ganymed Jupiter einmal umrundet, schafft Europa zwei und Io vier Umläufe.',
      'Jupiter reißt Io jede Sekunde etwa 1 Tonne Material weg.',
    ],
  },
  europa: {
    name: 'Europa',
    kindLabel: 'Jupitermond',
    description:
      'Europa ist ein Eismond, etwa 90 % so groß wie der Erdmond, und seine helle Oberfläche ist von langen rotbraunen Rissen durchzogen. Unter einem etwa 15 bis 25 km dicken Eispanzer liegt ein 60 bis 150 km tiefer Ozean, der doppelt so viel Wasser enthalten könnte wie alle Ozeane der Erde. Damit ist Europa einer der vielversprechendsten Orte für die Suche nach Leben außerhalb der Erde.',
    facts: [
      'Europa hat so wenige Krater, dass seine Oberfläche vielleicht nur 40 bis 90 Millionen Jahre alt ist.',
      'Seine Eisoberfläche wirft etwa 5,5-mal so viel Sonnenlicht zurück wie unser Mond.',
      'Sonnenlicht braucht etwa 45 Minuten bis zu Europa.',
      'Mögliche Wasserfontänen wurden beobachtet, die etwa 160 km über die Oberfläche aufsteigen.',
    ],
  },
  ganymede: {
    name: 'Ganymed',
    kindLabel: 'Jupitermond',
    description:
      'Ganymed ist der größte Mond im Sonnensystem, größer als der Planet Merkur und der Zwergplanet Pluto. Auf seiner Oberfläche wechseln sich alte, dunkle, verkraterte Gebiete mit helleren Regionen ab, die von Rücken und Furchen durchzogen sind. Unter einer etwa 150 km dicken Kruste aus überwiegend Eis liegt ein Salzwasserozean, der vermutlich mehr Wasser enthält als alles Wasser auf der Erdoberfläche.',
    facts: [
      'Er ist der einzige bekannte Mond mit eigenem Magnetfeld, entdeckt 1996 von der NASA-Sonde Galileo.',
      'Sein Magnetfeld erzeugt Polarlichter rund um seinen Nord- und Südpol.',
      'Ganymed umrundet Jupiter etwa alle 7 Tage.',
      'Hubble hat Hinweise auf eine dünne Sauerstoffatmosphäre gefunden.',
    ],
  },
  callisto: {
    name: 'Kallisto',
    kindLabel: 'Jupitermond',
    description:
      'Kallisto hat die älteste und am stärksten verkraterte Oberfläche im Sonnensystem, etwa 4 Milliarden Jahre alt. Ohne aktive Vulkane oder wandernde Platten, die sie auslöschen, haben sich die Krater im Lauf der Zeit angehäuft. Helle weiße Flecken, vermutlich mit Wassereis bedeckte Kratergipfel, sprenkeln die dunkle Oberfläche.',
    facts: [
      'Galileo Galilei entdeckte Kallisto 1610, zusammen mit Io, Europa und Ganymed.',
      'Etwa 250 km unter der Oberfläche könnte ein salziger Ozean liegen.',
      'Kallisto ist etwa 4,5-mal so weit von Jupiter entfernt wie Io.',
      'Kallisto hat eine extrem dünne Atmosphäre aus Kohlendioxid.',
    ],
  },
  enceladus: {
    name: 'Enceladus',
    kindLabel: 'Saturnmond',
    description:
      'Enceladus ist ein kleiner Eismond, nur etwa 500 km groß, mit der weißesten, am stärksten reflektierenden Oberfläche im Sonnensystem. Aus warmen Rissen nahe seinem Südpol, den sogenannten „Tigerstreifen“, schießen Fontänen aus Wasserdampf und Eiskörnchen. Gespeist werden sie von einem verborgenen Ozean unter dem Eis.',
    facts: [
      'Weil er so viel Sonnenlicht zurückwirft, ist seine Oberfläche etwa −201 °C kalt.',
      'Sein Eisstaub verteilt sich entlang seiner Bahn und bildet Saturns E-Ring.',
      'Die Fontänen verlassen die Oberfläche mit etwa 400 m pro Sekunde.',
      'William Herschel entdeckte Enceladus am 28. August 1789.',
    ],
  },
  titan: {
    name: 'Titan',
    kindLabel: 'Saturnmond',
    description:
      'Titan ist Saturns größter Mond und der einzige Mond mit einer dichten Atmosphäre, einem stickstoffreichen orangefarbenen Dunst, der seine Oberfläche verhüllt. Darunter füllt Regen aus Methan und Ethan Seen und Meere, und so ist Titan neben der Erde die einzige bekannte Welt mit Flüssigkeit auf der Oberfläche. Unter seiner Eiskruste könnte in 55 bis 80 km Tiefe ein Ozean aus Wasser liegen.',
    facts: [
      'Titan ist fast 50 % breiter als der Erdmond; nur Ganymed ist größer.',
      'Der Luftdruck an seiner Oberfläche ist etwa 60 % höher als auf der Erde.',
      'Christiaan Huygens entdeckte Titan am 25. März 1655.',
      '2005 landete die Sonde Huygens auf Titan, die erste Landung im äußeren Sonnensystem.',
    ],
  },
};
