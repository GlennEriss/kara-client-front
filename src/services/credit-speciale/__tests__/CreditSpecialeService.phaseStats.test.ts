import {describe,it,expect,vi} from 'vitest'
vi.mock('@/db/upload-image.db',()=>({createFile:vi.fn(),deleteFile:vi.fn()}))
vi.mock('@/factories/RepositoryFactory',()=>({RepositoryFactory:{getContractCIRepository:()=>({}),getPaymentCIRepository:()=>({}),getMemberRepository:()=>({}),getCreditInstallmentRepository:()=>({}),getDocumentRepository:()=>({})}}))
vi.mock('@/factories/ServiceFactory',()=>({ServiceFactory:{getNotificationService:()=>({})}}))
import {CreditSpecialeService} from '../CreditSpecialeService'
const base={total:6,fixedPhase:0,totalPenalties:0}
function setup(){
 const contracts=[{id:'running',creditType:'SPECIALE',status:'ACTIVE'},{id:'fixed',creditType:'SPECIALE',status:'OVERDUE'},{id:'closed',creditType:'SPECIALE',status:'CLOSED'},{id:'discharged',creditType:'SPECIALE',status:'DISCHARGED'},{id:'lost',creditType:'SPECIALE',status:'WRITTEN_OFF'},{id:'other',creditType:'FIXE',status:'ACTIVE'}]
 const repo={getContractsStats:vi.fn(async()=>base),getContractsWithFilters:vi.fn(async()=>contracts)}
 const service=new CreditSpecialeService({} as never,repo as never,{} as never,{} as never,{} as never,{} as never)
 const internals=service as unknown as {sumPenaltiesOfContracts:()=>Promise<number>;countFixedPhaseContracts:()=>Promise<number>}
 vi.spyOn(internals,'sumPenaltiesOfContracts').mockResolvedValue(0)
 const fixed=vi.spyOn(internals,'countFixedPhaseContracts').mockResolvedValue(1)
 return{service,repo,fixed}
}
describe('compteurs de phase des crédits spéciale',()=>{
 it('complète la partie fixe par les contrats spéciale encore suivis uniquement',async()=>{const {service}=setup();expect(await service.getContractsStats()).toMatchObject({fixedPhase:1,nonFixedPhase:1})})
 it('ne présente pas une phase inconnue comme un zéro calculé',async()=>{const {service,fixed}=setup();fixed.mockRejectedValue(Error('versements indisponibles'));expect(await service.getContractsStats()).toMatchObject({nonFixedPhase:null})})
 it('signale une lecture de contrats impossible',async()=>{const {service,repo}=setup();repo.getContractsWithFilters.mockRejectedValue(Error('indisponible'));expect(await service.getContractsStats()).toMatchObject({nonFixedPhase:null})})
 it('garde un zéro explicite quand il n’y a aucun contrat',async()=>{const {service,repo}=setup();repo.getContractsWithFilters.mockResolvedValue([]);expect(await service.getContractsStats()).toMatchObject({nonFixedPhase:0})})
})
