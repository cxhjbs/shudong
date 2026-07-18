import '../global.css';
import {Stack} from 'expo-router';
export default function Layout(){return <Stack screenOptions={{headerStyle:{backgroundColor:'#f7f1e7'},headerShadowVisible:false,headerTintColor:'#3b352f',contentStyle:{backgroundColor:'#f7f1e7'}}}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="editor" options={{title:'写给树洞',presentation:'modal'}}/></Stack>}
