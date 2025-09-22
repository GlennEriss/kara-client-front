import { FieldErrors, SubmitErrorHandler, SubmitHandler, UseFormReturn } from "react-hook-form";
import { MemberLoginFormData } from "@/schemas/login.schema";

export default class LoginMediator {
  private form: UseFormReturn<MemberLoginFormData>

  constructor(form: UseFormReturn<MemberLoginFormData>) {
    this.form = form
  }

  getForm(): UseFormReturn<MemberLoginFormData> {
    return this.form;
  }

  getErrors(): FieldErrors<MemberLoginFormData> {
    return this.form.formState.errors;
  }

  handleSubmit(onSubmit: SubmitHandler<MemberLoginFormData>, onInvalid: SubmitErrorHandler<MemberLoginFormData>) {
    return this.form.handleSubmit(onSubmit, onInvalid);
  }
}