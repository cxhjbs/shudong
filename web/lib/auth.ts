export function validEmail(email:string){return /^\S+@\S+\.\S+$/.test(email)}
export function authError(message:string){
  const value=message.toLowerCase();
  if(value.includes('invalid login credentials'))return '邮箱或密码不正确；如果刚注册，请先完成邮箱确认。';
  if(value.includes('email not confirmed'))return '邮箱尚未确认，请打开注册邮件并点击确认链接。';
  if(value.includes('user already registered'))return '这个邮箱已经注册，请直接登录。';
  if(value.includes('signup')&&value.includes('disabled'))return '当前禁止新用户注册，请在 Supabase Authentication 中开启注册。';
  if(value.includes('same password'))return '新密码不能与原密码相同。';
  if(value.includes('password'))return `密码不符合安全要求：${message}`;
  if(value.includes('email'))return `邮箱无法使用：${message}`;
  return `操作失败：${message}`;
}
