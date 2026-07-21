import { IdentityFormMediator } from "@/mediators/IdentityFormMediator";
import { UseFormReturn } from "react-hook-form";
import { RegisterFormData } from "@/schemas/schemas";

export class IdentityFormMediatorFactory {
    private static instance: IdentityFormMediator|null = null
    static create(form: UseFormReturn<RegisterFormData>) {
        if (!this.instance) {
            this.instance = new IdentityFormMediator(form)
        } else {
            // Rebrancher sur le formulaire courant : à chaque remontage de la
            // page, `useForm` crée une nouvelle instance. Sans ce rebind, le
            // singleton resterait lié au formulaire du premier montage (mort),
            // et setValue (photo, contacts…) n'atteindrait plus l'UI.
            this.instance.setForm(form)
        }
        return this.instance
    }

    static getInstance() {
        return this.instance
    }

    static resetInstance() {
        this.instance = null
    }
}