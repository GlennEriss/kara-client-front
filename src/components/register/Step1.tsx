'use client'

import React from 'react'
import {
  User,
  Lightbulb
} from 'lucide-react'

import PhotoIdentityForm from '../identity-form/PhotoIdentityForm'
import CivilityIdentityForm from '@/components/identity-form/CivilityIdentityForm'
import LastNameIdentityForm from '@/components/identity-form/LastNameIdentityForm'
import FirstNameIdentityForm from '@/components/identity-form/FirstNameIdentityForm'
import EmailIdentityForm from '@/components/identity-form/EmailIdentityForm'
import BirthDateIdentityForm from '@/components/identity-form/BirthDateIdentityForm'
import BirthPlaceIdentityForm from '@/components/identity-form/BirthPlaceIdentityForm'
import BirthCertificateNumberIdentityForm from '@/components/identity-form/BirthCertificateNumberIdentityForm'
import PrayerPlaceIdentityForm from '@/components/identity-form/PrayerPlaceIdentityForm'
import ReligionIdentityForm from '@/components/identity-form/ReligionIdentityForm'
import IntermediaryCodeIdentityForm from '@/components/identity-form/IntermediaryCodeIdentityForm'
import ContactsIdentityForm from '@/components/identity-form/ContactsIdentityForm'
import MaritalStatusIdentityForm from '@/components/identity-form/MaritalStatusIdentityForm'
import HasCarIdentityForm from '@/components/identity-form/HasCarIdentityForm'
import NationalityIdentityForm from '@/components/identity-form/NationalityIdentityForm'
import SpouseInfoSection from '@/components/identity-form/SpouseInfoSection'
interface Step1Props {
  requestId?: string // ID de la demande pour exclure lors de la vérification des numéros
}

export default function Step1({ requestId: _requestId }: Step1Props) {

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <User className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-base sm:text-lg">Informations d'identité</span>
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base break-words font-medium">
          Renseignez vos informations personnelles pour créer votre profil
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 w-full">
        {/* Section Photo */}
        <PhotoIdentityForm />

        {/* Section Formulaire */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Civilité */}
          <CivilityIdentityForm />

          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <LastNameIdentityForm />
            <FirstNameIdentityForm />
          </div>

          {/* Email et Date de naissance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <EmailIdentityForm />
            <BirthDateIdentityForm />
          </div>

          {/* Lieu de naissance et Numéro d'acte de naissance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <BirthPlaceIdentityForm />
            <BirthCertificateNumberIdentityForm />
          </div>

          {/* Lieu de prière et Religion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <ReligionIdentityForm />
            <PrayerPlaceIdentityForm />
          </div>

          {/* Code entremetteur */}
          <IntermediaryCodeIdentityForm />

          {/* Contacts */}
          <ContactsIdentityForm />

          {/* Selects et Checkbox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">

            {/* Nationalité */}
            <NationalityIdentityForm />


          </div>

          {/* Situation matrimoniale et Question voiture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
            <MaritalStatusIdentityForm />
            <HasCarIdentityForm />
          </div>

          {/* Informations du conjoint (conditionnelles) */}
          <SpouseInfoSection />


        </div>
      </div>

      {/* Message d'aide */}
      <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-xl border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-1300 w-full max-w-full break-words shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <Lightbulb className="w-6 h-6 text-[#CBB171]" />
          <p className="text-sm sm:text-base text-[#224D62] font-bold">
            <strong>Conseil :</strong> Assurez-vous que vos informations correspondent exactement à vos documents officiels
          </p>
        </div>
      </div>
    </div>
  )
}