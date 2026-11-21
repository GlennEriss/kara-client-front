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
  for(const resource of ['placements','charity','groups','group'])expect((await GET(request(resource),context(resource))).status).toBe(403)
  for(const resource of ['placement-demand','charity-intent']){expect((await POST(request(resource,{}),context(resource))).status).toBe(403);expect(state.caller).toHaveBeenLastCalledWith(expect.anything(),false)}
 })
 it('retourne des réponses privées et ne lit aucun groupe sans appartenance vérifiée',async()=>{
  const {db,reads}=memoryDb({'users/UID-TEST':{groupIds:[]},'groups/OTHER':{name:'secret'}});state.db=db
  const r=await GET(request('placements'),context('placements'));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');expect(await r.json()).toEqual({items:[],demands:[]})
  expect((await GET(request('group?id=OTHER'),context('group'))).status).toBe(404);expect(reads).not.toContain('groups')
 })
 it('refuse les champs administratifs et les actions inconnues sans écriture',async()=>{
  const {db,writes}=memoryDb({});state.db=db
  const r=await POST(request('placement-demand',{operationId:'test-operation-000001',payload:{benefactorId:'OTHER'}}),context('placement-demand'));expect(r.status).toBe(400);expect(writes).toHaveLength(0)
  expect((await POST(request('approve',{}),context('approve'))).status).toBe(404)
 })
})
