import { useForm } from "react-hook-form";
import { MemberLoginFormData } from "@/schemas/login.schema";
import { LoginMediatorFactory } from "@/factories/LoginMediatorFactory";
import { toast } from "sonner"
import { ADMIN_ROLES } from '@/types/types'
import { auth } from '@/firebase/auth'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from "next/navigation";
import routes from "@/constantes/routes";

export const useLogin = () => {
  const router = useRouter()  
  const form = useForm<MemberLoginFormData>();
  const mediator = LoginMediatorFactory.create(form);

  const onInvalid = (errors: any) => {
    toast.error("Validation finale échouée", {
      description: "Corrigez les erreurs du formulaire avant de soumettre.",
      duration: 3000
    })
  }

  const onSubmit = async (data: MemberLoginFormData) => {
    try {
      // 1) Vérifier l'existence de l'utilisateur par UID (matricule)
      const resp = await fetch('/api/firebase/auth/get-user/by-uid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: data.matricule.trim() }),
      })

      if (!resp.ok) throw new Error('USER_CHECK_FAILED')
      const userInfo = await resp.json()
      if (!userInfo?.found) throw new Error('USER_NOT_FOUND')

      // 2) Tentative de connexion avec email/mot de passe
      const userCred = await signInWithEmailAndPassword(auth, data.email, data.password)

      if (userCred.user) {
        // Vérifier que l'utilisateur connecté correspond au matricule
        if (userCred.user.uid !== data.matricule.trim()) {
          throw new Error('MATRICULE_EMAIL_MISMATCH')
        }

        // Obtenir le token ID pour l'authentification côté serveur
        const idToken = await userCred.user.getIdToken()

        // Sauvegarder le token dans un cookie
        document.cookie = `auth-token=${idToken}; path=/; max-age=3600; secure; samesite=strict`

        toast.success('Connexion réussie !', {
          description: 'Bienvenue dans votre espace membre',
          style: {
            background: "#10b981",
            color: "white",
            border: "none"
          },
          duration: 2000
        })

        // Vérifier le rôle et rediriger
        const role = await JSON.parse(((auth?.currentUser as any)?.reloadUserInfo?.customAttributes))["role"]
        const isAdmin = role && ADMIN_ROLES.includes(role)
        router.push(isAdmin ? routes.admin.dashboard : routes.member.home)
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error)

      let errorMessage = "Une erreur est survenue"
      let errorDescription = "Vérifiez vos informations et réessayez."

      if (error.message === 'USER_NOT_FOUND') {
        errorMessage = "Matricule incorrect"
        errorDescription = "Ce matricule n'existe pas dans notre base de données."
      } else if (error.message === 'MATRICULE_EMAIL_MISMATCH') {
        errorMessage = "Matricule et email ne correspondent pas"
        errorDescription = "Le matricule saisi ne correspond pas à l'email utilisé."
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "Email incorrect"
        errorDescription = "Aucun compte associé à cet email."
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Mot de passe incorrect"
        errorDescription = "Vérifiez votre mot de passe et réessayez."
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email invalide"
        errorDescription = "Format d'email incorrect."
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives"
        errorDescription = "Réessayez plus tard."
      }

      toast.error(errorMessage, {
        description: errorDescription,
        style: {
          background: "#ef4444",
          color: "white",
          border: "none"
        },
        duration: 4000
      })
    }
  }
  return {
    mediator,
    form,
    onInvalid,
    onSubmit
  };
};
