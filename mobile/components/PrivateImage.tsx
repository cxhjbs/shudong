import {useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Image,Modal,Pressable,Text,View} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {supabase} from '@/lib/supabase';

export function PrivateImage({path,className='h-28 w-28 rounded-2xl'}:{path:string;className?:string}){
 const [url,setUrl]=useState(''),[failed,setFailed]=useState(false),[open,setOpen]=useState(false),[saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;supabase.storage.from('diary-images').createSignedUrl(path,3600).then(({data,error})=>{if(!active)return;if(error||!data)setFailed(true);else setUrl(data.signedUrl)});return()=>{active=false}},[path]);
 async function save(){if(!url)return;setSaving(true);try{const permission=await MediaLibrary.requestPermissionsAsync();if(!permission.granted)throw new Error('请允许访问相册');const ext=(path.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'')||'jpg',target=`${FileSystem.cacheDirectory}shudong-${Date.now()}.${ext}`,result=await FileSystem.downloadAsync(url,target);await MediaLibrary.saveToLibraryAsync(result.uri);Alert.alert('已保存','照片已保存到系统相册。')}catch(error){Alert.alert('保存失败',error instanceof Error?error.message:'请稍后重试')}finally{setSaving(false)}}
 if(failed)return <View className={`${className} items-center justify-center bg-stone-200`}><Text className="text-xs text-brown">无法预览</Text></View>;
 if(!url)return <View className={`${className} items-center justify-center bg-white`}><ActivityIndicator color="#71866d"/></View>;
 return <><Pressable onPress={()=>setOpen(true)}><Image source={{uri:url}} resizeMode="cover" className={className}/></Pressable><Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><View className="flex-1 bg-black"><View className="flex-row justify-end gap-3 px-5 pb-3 pt-12"><Pressable onPress={save} className="rounded-full bg-white/20 px-4 py-2"><Text className="font-bold text-white">{saving?'保存中...':'保存到相册'}</Text></Pressable><Pressable onPress={()=>setOpen(false)} className="rounded-full bg-white/20 px-4 py-2"><Text className="font-bold text-white">关闭</Text></Pressable></View><Pressable onPress={()=>setOpen(false)} className="flex-1 items-center justify-center"><Image source={{uri:url}} resizeMode="contain" className="h-full w-full"/></Pressable></View></Modal></>;
}
