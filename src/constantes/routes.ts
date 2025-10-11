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
    },
    member: {
        home: '/',
    }
}

export default routes