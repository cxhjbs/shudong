import './globals.css';
export const metadata={title:'我的树洞',description:'只属于你的温暖角落',manifest:'/manifest.json'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN" suppressHydrationWarning><body>{children}</body></html>}
