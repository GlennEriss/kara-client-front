import { RegisterFormData } from "@/schemas/schemas"
import { UseFormReturn } from "react-hook-form"
import { AddressFormMediator } from "@/mediators/AddressFormMediator"

export class AddressFormMediatorFactory {
    private static instance: AddressFormMediator|null = null
    static create(form: UseFormReturn<RegisterFormData>): AddressFormMediator {
        if (!this.instance) {
            this.instance = new AddressFormMediator(form)
        }
        return this.instance
    }

    static getInstance(): AddressFormMediator|null {
        return this.instance
    }

    static resetInstance(): void {
        this.instance = null
    }
}