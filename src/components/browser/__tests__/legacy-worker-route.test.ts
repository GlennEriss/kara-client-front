// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { GET } from '@/app/sw.js/route'
it('sert un worker public de retrait, sans cache de pages ni suppression du push',async()=>{
 const response=GET(),source=await response.text()
 expect(response.headers.get('Content-Type')).toContain('application/javascript')
 expect(response.headers.get('Cache-Control')).toContain('no-store')
 const handlers:Record<string,(event?:unknown)=>void>={},remove=vi.fn(async(_name:string)=>true),unregister=vi.fn(async()=>true),skip=vi.fn()
 runInNewContext(source,{self:{addEventListener:(name:string,fn:()=>void)=>{handlers[name]=fn},skipWaiting:skip,registration:{unregister}},caches:{keys:async()=>['workbox-precache-v2','start-url','fcm-data','documents-personnels'],delete:remove}})
 expect(Object.keys(handlers).sort()).toEqual(['activate','install'])
 handlers.install();expect(skip).toHaveBeenCalledOnce()
 let activation=Promise.resolve();handlers.activate({waitUntil:(promise:Promise<void>)=>{activation=promise}});await activation
 expect(remove.mock.calls.map(c=>c[0])).toEqual(['workbox-precache-v2','start-url'])
 expect(unregister).toHaveBeenCalledOnce()
})
