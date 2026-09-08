import { it,expect,vi } from 'vitest';
import { apiGet,apiPost,apiPut,apiPatch,apiDelete,setLogoutCallback } from '../src/utils/Api';
it.each([['GET',apiGet],['POST',apiPost],['PUT',apiPut],['PATCH',apiPatch],['DELETE',apiDelete]])('%s sends authorization and parses JSON',async(method,fn)=>{
    localStorage.setItem('authToken','test-token');fetch.mockResolvedValue(new Response(JSON.stringify({success:true,data:{id:1}}),{status:200}));
    expect(await fn('/test',{name:'Test'})).toEqual({success:true,data:{id:1}});
    const [url,options]=fetch.mock.calls[0];expect(url).toBe('http://localhost:5000/api/v1/test');expect(options.method).toBe(method);expect(options.headers.Authorization).toBe('Bearer test-token');
});
it('uploads FormData without overriding its multipart boundary',async()=>{
    fetch.mockResolvedValue(new Response('{}'));const form=new FormData();form.append('name','Test');await apiPost('/upload',form);
    expect(fetch.mock.calls[0][1].body).toBe(form);expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
});
it('preserves validation status and field errors',async()=>{
    fetch.mockResolvedValue(new Response(JSON.stringify({message:'Invalid email',errors:{email:'required'}}),{status:422}));
    await expect(apiPost('/auth/register',{})).rejects.toMatchObject({status:422,message:'Invalid email',data:{errors:{email:'required'}}});
});
it('expired sessions clear credentials and invoke logout',async()=>{
    localStorage.setItem('authToken','expired');localStorage.setItem('user','{}');const logout=vi.fn();setLogoutCallback(logout);
    fetch.mockResolvedValue(new Response('{}',{status:401}));await expect(apiGet('/profile')).rejects.toThrow('Session expired');expect(localStorage.getItem('authToken')).toBeNull();expect(logout).toHaveBeenCalledOnce();setLogoutCallback(null);
});
it('incorrect login does not expire an existing session',async()=>{
    localStorage.setItem('authToken','existing');fetch.mockResolvedValue(new Response('{"message":"Wrong password"}',{status:401}));
    await expect(apiPost('/auth/login',{})).rejects.toMatchObject({status:401});expect(localStorage.getItem('authToken')).toBe('existing');
});
it('empty responses succeed and network failures propagate',async()=>{
    fetch.mockResolvedValueOnce(new Response(null,{status:204}));expect(await apiDelete('/test')).toEqual({});
    fetch.mockRejectedValueOnce(new Error('Offline'));await expect(apiGet('/test')).rejects.toThrow('Offline');
});
