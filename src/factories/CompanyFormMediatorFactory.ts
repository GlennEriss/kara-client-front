import { CompanyFormMediator } from "@/mediators/CompanyFormMediator";
import { RegisterFormData } from "@/schemas/schemas";
import { UseFormReturn } from "react-hook-form";

export class CompanyFormMediatorFactory {
    private static instance: CompanyFormMediator | null = null
    static create(form: UseFormReturn<RegisterFormData>): CompanyFormMediator {
        if (!this.instance) {
            this.instance = new CompanyFormMediator(form)
        }
        return this.instance
    }
    static getInstance(): CompanyFormMediator | null {
        return this.instance
    }
    static resetInstance(): void {
        this.instance = null
    }
}