'use client'
import React from 'react'
import { Car, Users, UserPlus, FileText, TrendingUp, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MembershipRequest, InsurancePolicy, DashboardStats } from '@/types/types'
import { getNationalityName } from '@/constantes/nationality'

// Fausses données typées pour le dashboard
const statsData = [
  {
    title: "Membres Actifs",
    value: "1,247",
    change: "+12.5%",
    changeType: "positive",
    icon: Users,
    description: "Comparé au mois dernier"
  },
  {
    title: "Demandes d'Adhésion",
    value: "34",
    change: "+5",
    changeType: "positive", 
    icon: UserPlus,
    description: "En attente de validation"
  },
  {
    title: "Polices d'Assurance",
    value: "1,892",
    change: "+47",
    changeType: "positive",
    icon: Car,
    description: "Actives ce mois"
  },
  {
    title: "Articles Publiés",
    value: "156",
    change: "+23",
    changeType: "positive",
    icon: FileText,
    description: "Cette année"
  }
]

const recentMembershipRequests: Partial<MembershipRequest>[] = [
  {
    id: "req-001",
    identity: {
      firstName: "Marie",
      lastName: "Dubois",
      email: "marie.dubois@email.com",
      nationality: "Française",
      civility: "Madame",
      birthDate: "1990-05-15",
      birthPlace: "Paris",
      birthCertificateNumber: "BC-001234",
      prayerPlace: "Mosquée Al-Noor",
      religion: "Islam",
      contacts: ["+33123456789"],
      gender: "Femme",
      maritalStatus: "Célibataire",
      hasCar: true,
      intermediaryCode: ""
    },
    status: "pending",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "req-002",
    identity: {
      firstName: "Ahmed",
      lastName: "Hassan",
      email: "ahmed.hassan@email.com",
      nationality: "Marocaine",
      civility: "Monsieur",
      birthDate: "1985-03-22",
      birthPlace: "Casablanca",
      birthCertificateNumber: "BC-001235",
      prayerPlace: "Mosquée Hassan II",
      religion: "Islam",
      contacts: ["+212654321987"],
      gender: "Homme",
      maritalStatus: "Marié(e)",
      hasCar: false,
      intermediaryCode: ""
    },
    status: "approved",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
    processedAt: new Date("2024-01-14"),
    memberNumber: "KARA-2024-001"
  },
  {
    id: "req-003",
    identity: {
      firstName: "Sophie",
      lastName: "Martin",
      email: "sophie.martin@email.com",
      nationality: "Belge",
      civility: "Madame",
      birthDate: "1992-11-08",
      birthPlace: "Bruxelles",
      birthCertificateNumber: "BC-001236",
      prayerPlace: "Centre Islamique de Bruxelles",
      religion: "Islam",
      contacts: ["+32487654321"],
      gender: "Femme",
      maritalStatus: "Célibataire",
      hasCar: true,
      intermediaryCode: ""
    },
    status: "pending",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13")
  },
  {
    id: "req-004",
    identity: {
      firstName: "Jean-Paul",
      lastName: "Ngozi",
      email: "jp.ngozi@email.com",
      nationality: "Congolaise",
      civility: "Monsieur",
      birthDate: "1988-07-30",
      birthPlace: "Kinshasa",
      birthCertificateNumber: "BC-001237",
      prayerPlace: "Mosquée Omar Ibn Al-Khattab",
      religion: "Islam",
      contacts: ["+243987654321"],
      gender: "Homme",
      maritalStatus: "Divorcé(e)",
      hasCar: false,
      intermediaryCode: ""
    },
    status: "rejected",
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
    processedAt: new Date("2024-01-12"),
    adminComments: "Documents incomplets"
  }
]

const insurancePolicies: InsurancePolicy[] = [
  {
    id: "ins-001",
    policyholder: {
      firstName: "Marie",
      lastName: "Dubois",
      email: "marie.dubois@email.com",
      phone: "+33123456789",
      memberNumber: "KARA-2024-001"
    },
    policyNumber: "POL-2024-001234",
    status: "Active",
    vehicle: {
      make: "Citroën",
      model: "C3",
      year: 2020,
      plateNumber: "AB-123-CD"
    },
    premium: {
      amount: 245,
      currency: "EUR",
      frequency: "monthly",
      displayText: "€245/mois"
    },
    startDate: new Date("2024-01-15"),
    expiryDate: new Date("2024-12-15"),
    coverage: {
      type: "comprehensive",
      description: "Tous risques",
      deductible: 300
    },
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    createdBy: "admin-001"
  },
  {
    id: "ins-002",
    policyholder: {
      firstName: "Ahmed",
      lastName: "Hassan",
      email: "ahmed.hassan@email.com",
      phone: "+212654321987",
      memberNumber: "KARA-2024-002"
    },
    policyNumber: "POL-2024-001235",
    status: "Active",
    vehicle: {
      make: "Peugeot",
      model: "308",
      year: 2019,
      plateNumber: "EF-456-GH"
    },
    premium: {
      amount: 189,
      currency: "EUR",
      frequency: "monthly",
      displayText: "€189/mois"
    },
    startDate: new Date("2023-11-20"),
    expiryDate: new Date("2024-11-20"),
    coverage: {
      type: "third_party",
      description: "Responsabilité civile",
      deductible: 0
    },
    createdAt: new Date("2023-11-20"),
    updatedAt: new Date("2024-01-10"),
    createdBy: "admin-001"
  },
  {
    id: "ins-003",
    policyholder: {
      firstName: "Sophie",
      lastName: "Martin",
      email: "sophie.martin@email.com",
      phone: "+32487654321"
    },
    policyNumber: "POL-2024-001236",
    status: "Expirée",
    vehicle: {
      make: "Renault",
      model: "Clio",
      year: 2018,
      plateNumber: "IJ-789-KL"
    },
    premium: {
      amount: 156,
      currency: "EUR",
      frequency: "monthly",
      displayText: "€156/mois"
    },
    startDate: new Date("2023-01-10"),
    expiryDate: new Date("2024-01-10"),
    coverage: {
      type: "collision",
      description: "Collision et vol",
      deductible: 250
    },
    createdAt: new Date("2023-01-10"),
    updatedAt: new Date("2024-01-11"),
    createdBy: "admin-002"
  },
  {
    id: "ins-004",
    policyholder: {
      firstName: "Jean-Paul",
      lastName: "Ngozi",
      email: "jp.ngozi@email.com",
      phone: "+243987654321"
    },
    policyNumber: "POL-2024-001237",
    status: "Active",
    vehicle: {
      make: "Volkswagen",
      model: "Golf",
      year: 2021,
      plateNumber: "MN-012-OP"
    },
    premium: {
      amount: 203,
      currency: "EUR",
      frequency: "monthly",
      displayText: "€203/mois"
    },
    startDate: new Date("2024-03-25"),
    expiryDate: new Date("2025-03-25"),
    coverage: {
      type: "comprehensive",
      description: "Tous risques",
      deductible: 350
    },
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
    createdBy: "admin-001"
  }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "En attente":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    case "Approuvée":
      return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    case "rejected":
      return <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    case "Active":
      return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    case "Expirée":
      return <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de votre organisation KARA
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${
                    stat.changeType === 'positive' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {stat.changeType === 'positive' ? '↗' : '↘'} {stat.change}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stat.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Contenu principal */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Demandes d'adhésion récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Demandes d'Adhésion Récentes</CardTitle>
            <CardDescription>
              Les dernières demandes reçues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMembershipRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between space-x-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {request.identity?.firstName} {request.identity?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.identity?.email} • {getNationalityName(request.identity?.nationality)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status!)}
                    <span className="text-xs text-muted-foreground">
                      {request.createdAt?.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                Voir toutes les demandes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Polices d'assurance récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Polices d'Assurance Auto</CardTitle>
            <CardDescription>
              Aperçu des polices d'assurance récentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insurancePolicies.map((policy) => (
                <div key={policy.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {policy.policyholder.firstName} {policy.policyholder.lastName}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Car className="w-3 h-3" />
                        <span>{policy.vehicle.make} {policy.vehicle.model}</span>
                        <span>•</span>
                        <span>{policy.policyNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Expire le {policy.expiryDate.toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getStatusBadge(policy.status)}
                      <span className="text-xs font-medium text-primary">
                        {policy.premium.displayText}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                Voir toutes les polices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique de croissance simple */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Évolution des Membres</span>
          </CardTitle>
          <CardDescription>
            Croissance du nombre de membres au cours de l'année
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Graphique simple avec des barres CSS */}
            <div className="flex items-end space-x-2 h-32">
              {[65, 75, 85, 92, 88, 96, 100].map((height, index) => (
                <div key={index} className="flex-1 bg-primary rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" 
                     style={{ height: `${height}%` }}>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Jan</span>
              <span>Fév</span>
              <span>Mar</span>
              <span>Avr</span>
              <span>Mai</span>
              <span>Jun</span>
              <span>Jul</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
