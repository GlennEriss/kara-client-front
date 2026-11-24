// @vitest-environment node
import {beforeEach,describe,it,expect,vi} from 'vitest'
import {NextRequest,NextResponse} from 'next/server'
const state=vi.hoisted(()=>({caller:vi.fn(),db:null as any}))
vi.mock('../server/access',()=>({requireMemberCaller:state.caller}))
vi.mock('@/firebase/adminFirestore',()=>({get adminFirestore(){return state.db}}))
vi.mock('@/firebase/adminAuth',()=>({adminAuth:{}}))
import {GET,POST} from '@/app/api/mobile/member/[resource]/route'
import {memoryDb,memberCaller} from './memory-db'
const context=(resource:string)=>({params:Promise.resolve({resource})})
const request=(resource:string,payload?:unknown)=>new NextRequest(`https://test/api/mobile/member/${resource}`,payload?{method:'POST',body:JSON.stringify(payload)}:undefined)
beforeEach(()=>{vi.clearAllMocks();state.caller.mockResolvedValue(memberCaller);state.db=memoryDb({}).db})
describe('routes personnelles du lot 4',()=>{
 it('contrôle la session et le règlement avant toute donnée du lot',async()=>{
  state.caller.mockResolvedValue(NextResponse.json({error:'Interdit'},{status:403}))
  for(const resource of ['insurance','charity','groups','group'])expect((await GET(request(resource),context(resource))).status).toBe(403)
  for(const resource of ['insurance-prospect','charity-intent']){expect((await POST(request(resource,{}),context(resource))).status).toBe(403);expect(state.caller).toHaveBeenLastCalledWith(expect.anything(),false,resource==='insurance-prospect')}
 })
 it('retourne des réponses privées et ne lit aucun groupe sans appartenance vérifiée',async()=>{
  const {db,reads}=memoryDb({'users/UID-TEST':{groupIds:[]},'groups/OTHER':{name:'secret'}});state.db=db
  const r=await GET(request('insurance'),context('insurance'));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');expect(await r.json()).toMatchObject({insurance:[],prospects:[]})
  expect((await GET(request('placements'),context('placements'))).status).toBe(404)
  expect((await GET(request('group?id=OTHER'),context('group'))).status).toBe(404);expect(reads).not.toContain('groups')
 })
 it('retourne uniquement les boutiques de la personne authentifiée', async () => {
  state.db = memoryDb({
    'shops/OWN': { name: 'Boutique du membre', ownerMemberId: memberCaller.matricule, status: 'pending' },
    'shops/LEGACY': { name: 'Boutique historique', submittedBy: memberCaller.uid },
    'shops/TRANSFER': { name: 'Boutique transférée', ownerMemberId: 'OTHER', submittedBy: memberCaller.uid },
  }).db
  const response = await GET(request('shop'), context('shop'))
  expect(response.status).toBe(200)
  const data = await response.json()
  expect(data.items.map((row: { id: string }) => row.id).sort()).toEqual(['LEGACY', 'OWN'])
 })
 it('publie uniquement les boutiques visibles et leurs coordonnées publiques dans l’annuaire mobile',async()=>{
  state.db=memoryDb({
    'shops/OPEN': { name:'Atelier', isActive:true, status:'approved', ownerMemberId:'M1', phone:'077000000', acceptsCredit:true },
    'shops/PENDING': { name:'Brouillon privé', status:'pending', isActive:false },
    'shops/HIDDEN': { name:'Fermée', status:'approved', isActive:false },
    'shops/LEGACY': { name:'Commerce historique' },
  }).db
  const response=await GET(request('shop?view=directory'),context('shop'))
  const { items }=await response.json()
  expect(items.map((item:{id:string})=>item.id)).toEqual(['OPEN','LEGACY'])
  expect(items[0]).toMatchObject({ name:'Atelier', phone:'077000000', acceptsCredit:true })
  expect(items[0]).not.toHaveProperty('ownerMemberId')
 })
 it('refuse les champs administratifs et les actions inconnues sans écriture',async()=>{
  const {db,writes}=memoryDb({});state.db=db
  const r=await POST(request('insurance-prospect',{sponsorMemberId:'OTHER'}),context('insurance-prospect'));expect(r.status).toBe(400);expect(writes).toHaveLength(0)
  expect((await POST(request('placement-demand',{}),context('placement-demand'))).status).toBe(404)
  expect((await POST(request('approve',{}),context('approve'))).status).toBe(404)
 })
})
