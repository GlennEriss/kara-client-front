import { IdentityFormMediator } from "@/mediators/IdentityFormMediator";
import { UseFormReturn } from "react-hook-form";
import { RegisterFormData } from "@/schemas/schemas";

export class IdentityFormMediatorFactory {
    private static instance: IdentityFormMediator|null = null
    static create(form: UseFormReturn<RegisterFormData>) {
        if (!this.instance) {
            this.instance = new IdentityFormMediator(form)
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