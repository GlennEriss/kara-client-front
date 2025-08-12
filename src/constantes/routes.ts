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
        membershipAdd: '/memberships/add',
        admin: '/admin',
        settings: '/settings',
        jobs: '/jobs',
        companies: '/companies',
        paymentsHistory: '/payments-history',
        paymentsHistoryDetails: (id: string) => `/payments-history/${id}`,
    },
    member: {
        home: '/',
    }
}

export default routes