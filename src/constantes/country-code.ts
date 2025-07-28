// Pays prioritaires (Gabon en premier, puis francophones, puis africains)
const PRIORITY_COUNTRIES = [
    'GA', // Gabon en premier
    'FR', 'BE', 'CH', 'LU', 'CA', // Francophones européens et Amérique du Nord
    'CM', 'CI', 'SN', 'BF', 'ML', 'NE', 'TD', 'CF', 'CG', 'CD', 'GQ', 'ST', // Afrique francophone
    'MA', 'TN', 'DZ', 'NG', 'GH', 'KE', 'ZA', 'EG', 'ET', 'UG', 'TZ', 'RW', 'AO' // Autres pays africains
]

export default PRIORITY_COUNTRIES;