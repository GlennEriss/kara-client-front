const routes = {
    public: {
        homepage: '/',
        register: '/register',
        login: '/login',
        adminLogin: '/login/admin',
    },
    admin: {
        dashboard: '/dashboard',
        membershipRequests: '/membership-requests',
        membershipRequestDetails: (id: string) => `/membership-requests/${id}`,
        memberships: '/memberships',
        membershipDetails: (id: string) => `/memberships/${id}`,
        membershipSubscription: (id: string) => `/memberships/${id}/subscriptions`,
        membershipFilleuls: (id: string) => `/memberships/${id}/filleuls`,
        membershipDocuments: (id: string) => `/memberships/${id}/documents`,
        membershipAdd: '/memberships/add',
        groups: '/groups',
        groupDetails: (id: string) => `/groups/${id}`,
        admin: '/admin',
        settings: '/settings',
        jobs: '/jobs',
        companies: '/companies',
        paymentsHistory: '/payments-history',
        paymentsHistoryDetails: (id: string) => `/payments-history/${id}`,
        contractsHistory: '/contracts-history',
        contractsHistoryDetails: (id: string) => `/contracts-history/${id}`,
        // Caisse Spéciale (Espace Admin)
        caisseSpeciale: '/caisse-speciale',
        caisseImprevue: '/caisse-imprevue',
        caisseSpecialeContractDetails: (id: string) => `/caisse-speciale/contrats/${id}`,
        caisseSpecialeContractPayments: (id: string) => `/caisse-speciale/contrats/${id}/versements`,
        caisseSpecialeCreateContract: '/caisse-speciale/create',
        caisseSpecialeSettings: '/caisse-speciale/settings',
        // Caisse Imprévue
        caisseImprevueCreateContract: '/caisse-imprevue/create',
        caisseImprevueContractDetails: (id: string) => `/caisse-imprevue/contrats/${id}`,
        caisseImprevueContractPayments: (id: string) => `/caisse-imprevue/contrats/${id}/versements`,
        caisseImprevueSettings: '/caisse-imprevue/settings',
        // Véhicules
        vehicules: '/vehicules',
        vehiculeDetails: (id: string) => `/vehicules/${id}`,
        vehiculeEdit: (id: string) => `/vehicules/${id}/edit`,
        // Bienfaiteur
        bienfaiteur: '/bienfaiteur',
        bienfaiteurList: '/bienfaiteur',
        bienfaiteurCreate: '/bienfaiteur/create',
        bienfaiteurDetails: (id: string) => `/bienfaiteur/${id}`,
        bienfaiteurModify: (id: string) => `/bienfaiteur/${id}/modify`,
        bienfaiteurContributions: (id: string) => `/bienfaiteur/${id}/contributions`,
        bienfaiteurParticipants: (id: string) => `/bienfaiteur/${id}/participants`,
        bienfaiteurGroups: (id: string) => `/bienfaiteur/${id}/groups`,
        bienfaiteurMedia: (id: string) => `/bienfaiteur/${id}/media`,
        placements: '/placements',
        // Géographie
        geographie: '/geographie',
    },
    member: {
        home: '/',
    }
}

export default routes