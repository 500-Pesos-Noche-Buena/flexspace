import React from 'react';
import {it,expect,vi} from 'vitest';
import {createRoutesFromElements,matchRoutes} from 'react-router-dom';
import {AppRoutes} from '../src/routes/AppRoutes';
vi.mock('@/utils/Api',()=>({apiGet:vi.fn(),apiPost:vi.fn(),apiPut:vi.fn(),apiPatch:vi.fn(),apiDelete:vi.fn(),downloadFile:vi.fn(),setLogoutCallback:vi.fn()}));
const routes=createRoutesFromElements(AppRoutes().props.children);
function leaves(nodes,parent='') {
    return nodes.flatMap(route=>{
        const path=route.path?.startsWith('/')?route.path:[parent,route.path].filter(Boolean).join('/').replace(/\/+/g,'/');
        const own=route.element && !route.children?.length ? [{route,path:path||'/'}] : [];
        return [...own,...leaves(route.children||[],path)];
    });
}
for(const {route,path} of leaves(routes)) {
    if(path==='*')continue;
    it(`client route ${path}: resolves to its registered page`,()=>{
        const example='/'+path.replace(/^\//,'').replace(/:[A-Za-z0-9_]+/g,'test-id');
        const matched=matchRoutes(routes,example);
        expect(matched?.at(-1).route.id).toBe(route.id);
        expect(React.isValidElement(route.element)).toBe(true);
    });
}
it('unknown URLs resolve to the not-found route',()=>expect(matchRoutes(routes,'/unknown-test-page')?.at(-1).route.path).toBe('*'));
