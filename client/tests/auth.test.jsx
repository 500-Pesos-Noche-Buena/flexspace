import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Login from '../src/pages/Auth/Login';
import Register from '../src/pages/Auth/Register';
import {ChangePasswordModal} from '../src/components/modal/ChangePasswordModal';
import {apiPost,apiPut} from '../src/utils/Api';
import {showToast} from '../src/components/ui/SweetAlert2';
vi.mock('@/utils/Api',()=>({apiPost:vi.fn(),apiPut:vi.fn(),apiGet:vi.fn(async()=>({maintenance:false}))}));
vi.mock('@/components/ui/SweetAlert2',()=>({showToast:vi.fn()}));
const auth=vi.hoisted(()=>({login:vi.fn(),user:null}));
vi.mock('@/context/AuthContext',()=>({useAuth:()=>auth}));
it('login rejects empty and malformed fields before calling the API',()=>{
    const {container}=render(<MemoryRouter><Login/></MemoryRouter>);
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText('Email is required')).toBeVisible();expect(screen.getByText('Password is required')).toBeVisible();expect(apiPost).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('name@email.com'),{target:{value:'bad-email'}});
    fireEvent.submit(container.querySelector('form'));expect(apiPost).not.toHaveBeenCalled();
});
it('valid credentials still require security verification',()=>{
    const {container}=render(<MemoryRouter><Login/></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('name@email.com'),{target:{value:'guest@example.test'}});
    fireEvent.change(container.querySelector('input[name=password]'),{target:{value:'Password1!'}});
    fireEvent.submit(container.querySelector('form'));expect(apiPost).not.toHaveBeenCalled();expect(showToast).toHaveBeenCalledWith(expect.objectContaining({title:'Security Check Required'}));
});
it('registration requires identity, strong password and confirmation',()=>{
    const {container}=render(<MemoryRouter><Register/></MemoryRouter>);fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText('Full name is required')).toBeVisible();expect(apiPost).not.toHaveBeenCalled();
});
it('password change blocks weak/mismatched passwords and submits a valid change',async()=>{
    const onClose=vi.fn(),onSuccess=vi.fn();apiPut.mockResolvedValue({success:true});
    const {container}=render(<ChangePasswordModal isOpen onClose={onClose} onSuccess={onSuccess}/>);
    const inputs=container.querySelectorAll('input');
    fireEvent.change(inputs[0],{target:{value:'OldPassword1!'}});fireEvent.change(inputs[1],{target:{value:'weak'}});fireEvent.change(inputs[2],{target:{value:'different'}});
    fireEvent.submit(container.querySelector('form'));expect(apiPut).not.toHaveBeenCalled();
    fireEvent.change(inputs[1],{target:{value:'NewPassword1!'}});fireEvent.change(inputs[2],{target:{value:'NewPassword1!'}});fireEvent.submit(container.querySelector('form'));
    await waitFor(()=>expect(onSuccess).toHaveBeenCalledOnce());expect(apiPut).toHaveBeenCalledWith('/auth/profile/update-password',{current_password:'OldPassword1!',new_password:'NewPassword1!'});expect(onClose).toHaveBeenCalledOnce();
});
