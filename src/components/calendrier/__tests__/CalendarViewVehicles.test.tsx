import {describe,it,expect,vi,afterEach} from 'vitest'
import {render,screen,fireEvent,cleanup} from '@testing-library/react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {CalendarViewVehicles} from '../CalendarViewVehicles'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const base={date:'2026-11-21',ownerName:'Marie Exemple',plateNumber:'AB-123',phase:'today',phaseLabel:'Expire aujourd’hui',insuranceCompany:'Assureur',phone:'077466973',whatsapp:'077466973',quarter:'Awendjé',quarterId:'Q',city:'Libreville'}
describe('calendrier des véhicules web',()=>{
 it('ouvre les dossiers existants et filtre les prospects par origine et quartier',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({items:[{...base,id:'insurance:A',recordId:'A',source:'insurance'},{...base,id:'prospects:P',recordId:'P',source:'prospects',ownerName:'Paul Exemple',plateNumber:'PROSPECT-456',quarterId:'OTHER',quarter:'Akanda'}]})}))
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><CalendarViewVehicles month={new Date('2026-11-01T12:00:00Z')} onMonthChange={vi.fn()}/></QueryClientProvider>)
  expect(await screen.findByText('AB-123')).toBeInTheDocument();expect(screen.getAllByRole('link',{name:'Ouvrir le dossier'}).map(a=>a.getAttribute('href'))).toEqual(['/vehicules/A','/vehicules/prospection?focus=P']);expect(screen.getAllByRole('link',{name:'WhatsApp'})[0]).toHaveAttribute('href','https://wa.me/24177466973')
  fireEvent.change(screen.getByLabelText('Origine du dossier'),{target:{value:'insurance'}});expect(screen.queryByText('PROSPECT-456')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'21 novembre 2026 : 1 échéance(s) de véhicule'}));expect(screen.getByRole('heading',{name:'Véhicules du 21 novembre 2026'})).toBeInTheDocument()
 })
 it('affiche une erreur serveur plutôt qu’un calendrier vide',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({error:'Source véhicules indisponible'})}));render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><CalendarViewVehicles month={new Date('2026-11-01T12:00:00Z')} onMonthChange={vi.fn()}/></QueryClientProvider>);expect(await screen.findByRole('alert')).toHaveTextContent('Source véhicules indisponible');expect(screen.queryByText('Aucune échéance de véhicule pour cette sélection.')).not.toBeInTheDocument()
 })
})
