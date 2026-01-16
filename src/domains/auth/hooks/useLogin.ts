import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MemberLoginFormData, memberLoginSchema } from "@/schemas/login.schema";
import { LoginMediatorFactory } from "@/factories/LoginMediatorFactory";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { toast } from "sonner";
import { ADMIN_ROLES } from '@/types/types';
import { auth } from '@/firebase/auth';
import { useRouter } from "next/navigation";
import routes from "@/constantes/routes";

/**
 * Hook pour gérer la connexion d'un membre
 * 
 * @returns Le formulaire, le médiateur, et les handlers de soumission
 */
export const useLogin = () => {
  const router = useRouter();
  const form = useForm<MemberLoginFormData>({
    resolver: zodResolver(memberLoginSchema)
  });
  const mediator = LoginMediatorFactory.create(form);

  const onInvalid = (errors: FieldErrors<MemberLoginFormData>) => {
    toast.error("Connexion échouée", {
      description: "Corrigez les erreurs du formulaire avant de soumettre.",
      duration: 3000
    });
  };

  const onSubmit = async (data: MemberLoginFormData) => {
    // Validation supplémentaire (déjà fait par Zod, mais on double-vérifie)
    const userData = memberLoginSchema.safeParse(data);
    if (!userData.success) {
      toast.error("Connexion échouée", {
        description: "Corrigez les erreurs du formulaire avant de soumettre.",
        duration: 3000
      });
      return;
    }

    const loginService = ServiceFactory.getLoginService();
    
    try {
      const idToken = await loginService.signIn(userData);
      
      // Sauvegarder le token dans un cookie (secure uniquement en production)
      const isProduction = window.location.protocol === 'https:';
      const cookieOptions = `path=/; max-age=3600; samesite=strict${isProduction ? '; secure' : ''}`;
      document.cookie = `auth-token=${idToken}; ${cookieOptions}`;

      toast.success('Connexion réussie !', {
        description: 'Bienvenue dans votre espace membre',
        style: {
          background: "#10b981",
          color: "white",
          border: "none"
        },
        duration: 2000
      });

      // Vérifier le rôle et rediriger
      // Attendre que l'utilisateur soit chargé dans auth
      await auth.currentUser?.reload();
      
      // Récupérer les custom claims
      const idTokenResult = await auth.currentUser?.getIdTokenResult();
      const role = idTokenResult?.claims?.role as string || '';
      const isAdmin = role && ADMIN_ROLES.includes(role as any);
      
      router.push(isAdmin ? routes.admin.dashboard : routes.member.home);

    } catch (error: any) {
      console.error('Erreur de connexion:', error);

      let errorMessage = "Une erreur est survenue";
      let errorDescription = "Vérifiez vos informations et réessayez.";

      // Gestion des erreurs métier
      if (error.message === 'USER_NOT_FOUND') {
        errorMessage = "Matricule incorrect";
        errorDescription = "Ce matricule n'existe pas dans notre base de données.";
      } else if (error.message === 'MATRICULE_EMAIL_MISMATCH') {
        errorMessage = "Matricule et email ne correspondent pas";
        errorDescription = "Le matricule saisi ne correspond pas à l'email utilisé.";
      } else if (error.message === 'WRONG_PASSWORD') {
        errorMessage = "Mot de passe incorrect";
        errorDescription = "Vérifiez votre mot de passe et réessayez.";
      } else if (error.message === 'INVALID_EMAIL') {
        errorMessage = "Email invalide";
        errorDescription = "Format d'email incorrect.";
      } else if (error.message === 'TOO_MANY_REQUESTS') {
        errorMessage = "Trop de tentatives";
        errorDescription = "Réessayez plus tard.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "Email incorrect";
        errorDescription = "Aucun compte associé à cet email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Mot de passe incorrect";
        errorDescription = "Vérifiez votre mot de passe et réessayez.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email invalide";
        errorDescription = "Format d'email incorrect.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives";
        errorDescription = "Réessayez plus tard.";
      }

      toast.error(errorMessage, {
        description: errorDescription,
        style: {
          background: "#ef4444",
          color: "white",
          border: "none"
        },
        duration: 4000
      });
    }
  };

  return {
    mediator,
    form,
    onInvalid,
    onSubmit
  };
};
