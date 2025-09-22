import { ZodSafeParseSuccess } from "zod";
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/auth'

export default class LoginService {
    private readonly userExistUrl = '/api/firebase/auth/get-user/by-uid'
    private static instance: LoginService
    private constructor() { }
    static getInstance() {
        if (!LoginService.instance) {
            LoginService.instance = new LoginService()
        }
        return LoginService.instance
    }
    async signIn(data: ZodSafeParseSuccess<{
        matricule: string;
        email: string;
        password: string;
    }>) {
        const { matricule, email, password } = data.data
        // 1) Vérifier l'existence de l'utilisateur par UID (matricule)
        const resp = await fetch(this.userExistUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: matricule.trim() }),
        })
        if (!resp.ok) throw new Error('USER_CHECK_FAILED')
        const userInfo = await resp.json()
        if (!userInfo?.found) throw new Error('USER_NOT_FOUND')
        // 2) Tentative de connexion avec email/mot de passe
        const userCred = await signInWithEmailAndPassword(auth, email, password)

        if (userCred.user) {
            // Vérifier que l'utilisateur connecté correspond au matricule
            if (userCred.user.uid !== matricule.trim()) {
                throw new Error('MATRICULE_EMAIL_MISMATCH')
            }

            // Obtenir le token ID pour l'authentification côté serveur
            return await userCred.user.getIdToken()
        }
    }
}