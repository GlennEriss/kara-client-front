import { Metadata } from 'next'
import CharityEventsList from '@/components/bienfaiteur/CharityEventsList'

export const metadata: Metadata = {
  title: 'Évènements Bienfaiteur | KARA Admin',
  description: 'Gestion des évènements caritatifs et récollections de l\'Association LE KARA'
}

export default function BienfaiteurPage() {
  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-indigo-50/30 p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6">
        <div className="rounded-3xl border border-cyan-100/60 bg-gradient-to-r from-[#1f4f67] via-[#245f78] to-[#2f7895] px-6 py-8 text-white shadow-[0_16px_40px_-24px_rgba(20,65,98,0.9)] sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Évènements Bienfaiteur
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-cyan-50/90 sm:text-base">
                Gérez les actions de solidarité, les participants et les contributions depuis un tableau de bord unifié.
              </p>
            </div>
            <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-100/90">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Collectes</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Participants</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Statuts</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-100/70 bg-white/70 p-4 shadow-[0_10px_30px_-24px_rgba(15,50,85,0.8)] backdrop-blur-sm sm:p-6">
          <CharityEventsList />
        </div>
      </div>
    </div>
  )
}
