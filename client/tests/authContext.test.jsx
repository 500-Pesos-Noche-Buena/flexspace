import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act} from '@testing-library/react';
import {AuthProvider,useAuth} from '../src/context/AuthContext';
vi.mock('@/utils/Api',()=>({setLogoutCallback:vi.fn()}));
function Probe(){const auth=useAuth();return <><span>{auth.user?.name||'Guest'}</span><button onClick={()=>auth.login({name:'Customer',role:'user'},'test-token')}>Login</button><button onClick={auth.logout}>Logout</button></>;}
it('login persists identity and logout clears it',()=>{
    render(<AuthProvider><Probe/></AuthProvider>);fireEvent.click(screen.getByText('Login'));expect(screen.getByText('Customer')).toBeVisible();expect(localStorage.getItem('authToken')).toBe('test-token');fireEvent.click(screen.getByText('Logout'));expect(screen.getByText('Guest')).toBeVisible();expect(localStorage.getItem('authToken')).toBeNull();
});
it('corrupt stored users do not crash startup, and logout syncs between tabs',()=>{
    localStorage.setItem('user','not-json');render(<AuthProvider><Probe/></AuthProvider>);expect(screen.getByText('Guest')).toBeVisible();fireEvent.click(screen.getByText('Login'));
    act(()=>window.dispatchEvent(new StorageEvent('storage',{key:'authToken',newValue:null})));expect(screen.getByText('Guest')).toBeVisible();
});
