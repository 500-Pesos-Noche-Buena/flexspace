import React from 'react';
import { it,expect,vi } from 'vitest';
import { render,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
// External/API boundaries fail predictably; page render/effect logic stays real.
vi.mock('@/utils/Api',()=>({apiGet:vi.fn(async()=>({success:false,data:[]})),apiPost:vi.fn(async()=>({success:false,data:[]})),apiPut:vi.fn(),apiPatch:vi.fn(),apiDelete:vi.fn(),setLogoutCallback:vi.fn(),downloadFile:vi.fn()}));
const auth=vi.hoisted(()=>({user:{_id:'test-user',id:'test-user',role:'admin',name:'Test user'},isAuthenticated:true,logout:vi.fn(),login:vi.fn()}));
vi.mock('@/context/AuthContext',async()=>({AuthContext:(await import('react')).createContext(auth),useAuth:()=>auth}));
const navigate=vi.hoisted(()=>vi.fn());
vi.mock('react-router-dom',async original=>({...await original(),useNavigate:()=>navigate}));
vi.mock('@/components/ui/SweetAlert2',()=>({showToast:vi.fn(),showConfirm:vi.fn(),showAlert:vi.fn()}));
vi.mock('@/hooks/useSocket',()=>({useSocket:()=>({socket:null,isConnected:false})}));
const pages=import.meta.glob('../src/pages/**/*.{jsx,js}');
for(const [path,load] of Object.entries(pages)) {
    it(`${path}: opens safely when API has no successful data`,async()=>{
        auth.user.role = path.includes('/Admin/') ? 'admin' : path.includes('/Space/') ? 'space' : 'user';
        const page=await load();
        // Empty scaffolds have no executable page. Record them in project inventory.
        if(typeof page.default!=='function') { expect(Object.keys(page)).toHaveLength(0);return; }
        const Page=page.default;
        const {container,unmount}=render(<MemoryRouter><Page/></MemoryRouter>);
        await waitFor(()=>expect(container).toBeDefined());
        await new Promise(resolve=>setTimeout(resolve,20));
        unmount();
    });
}
