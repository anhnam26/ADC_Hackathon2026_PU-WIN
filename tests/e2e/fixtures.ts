import {test as base,expect} from '@playwright/test';
export {expect};
export type {Page} from '@playwright/test';
export const test=base.extend<{signedIn:void}>({signedIn:[async({context},use)=>{
 const response=await context.request.post('/api/auth/login',{data:{email:'employee@dayzero.local',password:'DayZero2026!'}});
 expect(response.ok()).toBe(true);await use();
},{auto:true}]});
