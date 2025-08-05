namespace NodeJS {
    interface ProcessEnv extends NodeJS.ProcessEnv {
        //UTILS
        NEXT_PUBLIC_LOGO_PATH: string;
        NEXT_PUBLIC_APP_NAME: string;
        //GOOGLE
        AUTH_GOOGLE_ID: string;
        AUTH_GOOGLE_SECRET: string;
        //NEXT_AUTH
        NEXTAUTH_SECRET: string;
        //FIREBASE
        FIREBASE_PROJECT_ID: string;
        FIREBASE_CLIENT_EMAIL: string;
        FIREBASE_PRIVATE_KEY: string;
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
        NEXT_PUBLIC_FIREBASE_API_KEY: string;
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
        NEXT_PUBLIC_FIREBASE_APP_ID: string;
        NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY: string;
        //RECAPTCHA
        NEXT_PUBLIC_RECAPTCHA_SITE_KEY: string;
        RECAPTCHA_SECRET_KEY: string;
        //HOST_URL
        NEXT_PUBLIC_HOST: string;
        //ALGOLIA
        NEXT_PUBLIC_ALGOLIA_APP_ID: string;
        NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: string;
        //FACEBOOK
        FACEBOOK_CLIENT_ID: string;
        FACEBOOK_CLIENT_SECRET: string;
        //SUPPORT
        NEXT_PUBLIC_EMAIL_SUPPORT: string
        NEXT_PUBLIC_NUMBER_AGENT_AIRTEL: string
        NEXT_PUBLIC_NUMBER_AGENT_MOBICASH: string
        NEXT_PUBLIC_WHATSAPP_AGENT: string
        //REDIS / UPSTASH
        UPSTASH_REDIS_REST_URL: string;
        UPSTASH_REDIS_REST_TOKEN: string;
        // TTL optionnels (en secondes)
        REDIS_CATALOG_TTL?: string;
        REDIS_PROPERTY_TTL?: string;
        //VAULT
        VAULT_ADDR: string;
        VAULT_TOKEN: string;
        VAULT_PATH: string;
    }
}
