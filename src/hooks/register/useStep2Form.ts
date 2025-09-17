import { useForm } from "react-hook-form"
import { RegisterFormData } from "@/schemas/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema } from "@/schemas/schemas"
import { defaultValues } from "@/schemas/schemas"
import { AddressFormMediatorFactory } from "@/factories/AddressFormMediatorFactory"

export const useStep2Form = () => {
    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema) as any,
        defaultValues,
        mode: 'onChange'
    })
    const mediator = AddressFormMediatorFactory.create(form)
    return {
        form,
        mediator
    }
}