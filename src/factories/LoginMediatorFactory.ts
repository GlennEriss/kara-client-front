import { UseFormReturn } from "react-hook-form";
import { MemberLoginFormData } from "@/schemas/login.schema";
import LoginMediator from "@/mediators/LoginMediator";

export class LoginMediatorFactory {
  private static instance: LoginMediator | null = null;

  static create(form: UseFormReturn<MemberLoginFormData>): LoginMediator {
    // Si c'est le même form, retourner l'instance existante
    if (this.instance) {
      return this.instance;
    }

    // Créer une nouvelle instance avec le nouveau form
    this.instance = new LoginMediator(form);    
    return this.instance;
  }

  static getInstance(): LoginMediator | null {
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
