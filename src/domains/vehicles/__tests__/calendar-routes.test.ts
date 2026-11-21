// @vitest-environment node
import {beforeEach,describe,it,expect,vi} from 'vitest'
import {NextRequest,NextResponse} from 'next/server'
const state=vi.hoisted(()=>({mobile:vi.fn(),web:vi.fn(),access:vi.fn(),allowed:vi.fn(),calendar:vi.fn()}))
vi.mock('@/domains/mobile/server/access',async()=>({requireMobileCaller:state.mobile,mobileJson:(data:any,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store, private'}})}))
vi.mock('@/domains/auth/server/requireAdminCaller',()=>({requireAdminCaller:state.web}))
vi.mock('@/domains/auth/server/admin-access',()=>({loadAdminAccess:state.access}))
vi.mock('@/domains/auth/access-policy',()=>({canWithAccess:state.allowed}))
vi.mock('@/domains/vehicles/calendar-server',()=>({getVehicleCalendar:state.calendar}))
vi.mock('@/firebase/adminFirestore',()=>({adminFirestore:{}}))
import {GET as mobile} from '@/app/api/mobile/calendar/vehicles/route'
import {GET as web} from '@/app/api/calendar/vehicles/route'
const request=(month='2026-11')=>new NextRequest(`https://test/api/calendar/vehicles?month=${month}`)
beforeEach(()=>{vi.clearAllMocks();state.mobile.mockResolvedValue({access:{}});state.web.mockResolvedValue({claims:{}});state.access.mockResolvedValue({});state.allowed.mockReturnValue(true);state.calendar.mockResolvedValue({items:[]})})
describe('accès au calendrier véhicules',()=>{
 it.each([mobile,web])('refuse une session absente avant de charger les véhicules',async handler=>{state.mobile.mockResolvedValue(NextResponse.json({error:'Authentification requise'},{status:401}));state.web.mockResolvedValue(NextResponse.json({error:'Authentification requise'},{status:401}));expect((await handler(request())).status).toBe(401);expect(state.calendar).not.toHaveBeenCalled()})
 it.each([mobile,web])('ne contourne pas le droit véhicules',async handler=>{state.allowed.mockImplementation((_:unknown,permission:string)=>permission!=='vehicules.view');expect((await handler(request())).status).toBe(403);expect(state.calendar).not.toHaveBeenCalled()})
 it('exige aussi le droit calendrier web et la garde calendrier mobile',async()=>{state.allowed.mockImplementation((_:unknown,p:string)=>p!=='calendar.view');expect((await web(request())).status).toBe(403);await mobile(request());expect(state.mobile).toHaveBeenCalledWith(expect.anything(),'calendar')})
 it.each([mobile,web])('valide le mois et protège le cache',async handler=>{expect((await handler(request('2026-13'))).status).toBe(400);const r=await handler(request());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');expect(await r.json()).toEqual({items:[]})})
 it.each([mobile,web])('ne transforme pas une erreur source en liste vide',async handler=>{state.calendar.mockRejectedValue(Error('indisponible'));expect((await handler(request())).status).toBe(503)})
})
