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
        admin: '/admin',
        settings: '/settings',
        jobs: '/jobs',
        companies: '/companies',
    },
    member: {
        home: '/',
    }
}

export default routes