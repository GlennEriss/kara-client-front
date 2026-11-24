/** OGAR, DTC/ENR/062, révision 06 du 17 juin 2026, pages 1 à 3. */
export const ogarTariffSha256 = '346ce31fea79236be37209540758e3069f7b7cf92ee88559708e6c19d28b9dfd'
export const ogarTariffTitle = 'Barème OGAR du 17 juin 2026'

const standardPlans = [
  '1 an · sans BNS', '1 an · BNS 10 %', '1 an · BNS 15 %', '1 an · BNS 20 %',
  '3 mois', '6 mois',
] as const
const taxiPlans = ['3 mois', '6 mois', '1 an'] as const

const powerBands = [
  'Diesel 2–4 CV / Essence 3–6 CV',
  'Diesel 5–7 CV / Essence 7–10 CV',
  'Diesel 8–10 CV / Essence 11–14 CV',
  'Diesel 11–16 CV / Essence 15–23 CV',
  'Diesel 17 CV et plus / Essence 24 CV et plus',
] as const

type StandardRate = readonly [number, number, number, number, number, number]

export type OgarTariffGroup = {
  id: string
  label: string
  assetTypes: readonly string[]
  plans: readonly string[]
  bands: readonly { label: string; rates: readonly number[] }[]
}

function standardGroup(
  id: string,
  label: string,
  assetTypes: readonly string[],
  rates: readonly StandardRate[],
  firstBand = 0,
): OgarTariffGroup {
  return {
    id, label, assetTypes, plans: standardPlans,
    bands: rates.map((rate, index) => ({ label: powerBands[index + firstBand], rates: rate })),
  }
}

export const ogarTariffGroups: readonly OgarTariffGroup[] = [
  standardGroup('berline-particulier', 'Berline · particulier (510)', ['car'], [
    [115027, 105842, 101248, 96654, 63585, 85631],
    [119132, 109536, 104737, 99939, 65391, 88422],
    [127358, 116939, 111730, 106520, 69010, 94016],
    [153412, 140388, 133876, 127362, 80474, 111733],
    [197284, 179873, 171165, 162460, 99778, 141566],
  ]),
  standardGroup('berline-societe', 'Berline · société (510)', ['car'], [
    [161260, 147452, 140546, 133640, 83927, 117070],
    [167332, 152916, 145707, 138499, 86599, 121199],
    [180984, 165203, 157312, 149419, 92605, 130482],
    [220436, 200710, 190847, 180982, 109963, 157309],
    [282096, 256203, 243258, 230310, 137094, 199237],
  ]),
  standardGroup('pickup-particulier', 'Pick-up · particulier (520)', ['car', 'van'], [
    [172937, 158124, 150716, 143309, 89980, 125532],
    [183512, 167640, 159705, 151770, 94632, 132724],
    [228858, 208452, 198250, 188046, 114586, 163559],
    [274198, 249259, 236788, 224318, 134535, 194390],
    [302915, 275104, 261198, 247293, 147170, 213917],
  ]),
  standardGroup('pickup-societe', 'Pick-up · société (520)', ['car', 'van'], [
    [228146, 207811, 197643, 187476, 114272, 163075],
    [241807, 220106, 209256, 198405, 120284, 172365],
    [304018, 279097, 262136, 248173, 147656, 214668],
    [336240, 332094, 315023, 297952, 175033, 256978],
    [404169, 366234, 347265, 328296, 191722, 282771],
  ]),
  standardGroup('bus-12', 'Bus · 12 places (540)', ['bus'], [
    [526192, 475507, 450164, 424823, 242361, 364002],
    [594481, 536969, 508212, 479454, 278408, 410438],
    [643040, 580672, 549486, 518301, 293774, 443460],
    // Le document indique 685 533 FCFA avec BNS 20 %, comme sans BNS.
    [685533, 618915, 585606, 685533, 312471, 472354],
  ], 1),
  standardGroup('bus-15', 'Bus · 15 places (540)', ['bus'], [
    [599031, 541062, 512079, 483095, 274410, 413534],
    [667319, 602524, 570125, 537725, 304457, 459969],
    [715879, 646228, 611400, 576573, 325824, 492989],
    [758372, 684470, 647518, 610568, 344520, 521884],
  ], 1),
  standardGroup('bus-18', 'Bus · 18 places (540)', ['bus'], [
    [671870, 606618, 573993, 541366, 306460, 463065],
    [740159, 668079, 632038, 595997, 336506, 509500],
    [788719, 711783, 673313, 634844, 357872, 542520],
    [831211, 750025, 709432, 668840, 376568, 571415],
  ], 1),
  { id: 'taxi-berline', label: 'Taxi berline (541)', assetTypes: ['car'],
    plans: taxiPlans, bands: [{ label: 'Diesel ou essence · 5–7 CV', rates: [65000, 157697, 294982] }] },
  { id: 'taxi-bus', label: 'Taxi bus · 18 places (541)', assetTypes: ['bus'],
    plans: taxiPlans, bands: [{ label: 'Diesel ou essence · 8–10 CV', rates: [102000, 206498, 419071] }] },
  { id: 'moto', label: 'Moto (550)', assetTypes: ['motorcycle'], plans: ['1 an · sans BNS'], bands: [
    { label: 'Essence · 110–125 cm³', rates: [104313] },
    { label: 'Essence · 150–600 cm³', rates: [139651] },
    { label: 'Essence · 2, 6 ou 10 CV', rates: [104313] },
  ] },
  { id: 'camion', label: 'Camion · particulier ou société (530)', assetTypes: ['truck'],
    plans: ['1 an'], bands: [{ label: 'Diesel · 17 CV et plus', rates: [499065] }] },
  { id: 'engin', label: 'Engin de chantier (590)', assetTypes: ['machinery'],
    plans: ['1 an · sans BNS'], bands: [{ label: 'Diesel · 17–40 CV', rates: [308651] }] },
]
