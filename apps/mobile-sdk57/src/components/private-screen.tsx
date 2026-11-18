import {useCallback,useRef,useState,type PropsWithChildren} from 'react';
import {Link,Redirect,useFocusEffect} from 'expo-router';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSession} from './session';
import {colors,styles} from './access-screen';
import {api,ApiError} from '@/lib/api';
export function usePrivateResource<T>(path:string){
 const {session,setSession}=useSession();
 const [data,setData]=useState<T|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const generation=useRef(0),pending=useRef(false);
 const perform=useCallback(async(url:string,body?:unknown,method='GET')=>{
  if(!session||pending.current)return null;
  const run=generation.current;pending.current=true;setBusy(true);setError('');setMessage('');
  try{
   const result=await api(url,{method,headers:{Authorization:`Bearer ${session.token}`,...(method==='GET'?{}:{'Content-Type':'application/json'})},...(method==='GET'?{}:{body:JSON.stringify(body??{})})});
   return run===generation.current?result:null;
  }catch(e){if(run===generation.current){if(e instanceof ApiError&&e.status===401)setSession(null);else setError(e instanceof Error?e.message:'Não foi possível concluir.');}return null;}
  finally{if(run===generation.current){pending.current=false;setBusy(false);}}
 },[session,setSession]);
 const reload=useCallback(async()=>{const result=await perform(path);if(result)setData(result);},[path,perform]);
 useFocusEffect(useCallback(()=>{generation.current++;pending.current=false;setData(null);void reload();return()=>{generation.current++;pending.current=false;};},[reload]));
 return {data,setData,busy,error,message,setMessage,perform,reload};
}
export function PrivateScreen({title,children}:PropsWithChildren<{title:string}>){const {session}=useSession();if(!session)return <Redirect href="/entrar"/>;return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"><Link href="/minha-conta" style={styles.back}>‹ Minha conta</Link><Text accessibilityRole="header" style={styles.title}>{title}</Text>{children}</ScrollView></SafeAreaView>;}
export function Feedback({busy,error,message}:{busy:boolean;error:string;message:string}){return <View>{busy?<Text style={styles.note}>Aguarde…</Text>:null}{error?<Text accessibilityRole="alert" style={ui.error}>{error}</Text>:null}{message?<Text accessibilityRole="alert" style={ui.success}>{message}</Text>:null}</View>;}
export function Button({label,onPress,disabled=false,secondary=false}:{label:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={[secondary?ui.secondary:ui.button,disabled&&{opacity:0.5}]}><Text style={secondary?ui.label:ui.buttonText}>{label}</Text></Pressable>;}
export const ui=StyleSheet.create({group:{gap:12},label:{fontSize:16,fontWeight:'600',color:colors.black},input:{minHeight:54,borderWidth:1,borderColor:'#A4AF98',borderRadius:14,padding:14,fontSize:17,color:colors.black},button:{minHeight:54,backgroundColor:colors.black,borderRadius:16,padding:16,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:16,fontWeight:'700',color:colors.white},secondary:{minHeight:48,padding:14,borderWidth:1,borderColor:'#DDE6D4',borderRadius:14,alignItems:'center',justifyContent:'center'},card:{gap:12,padding:18,borderWidth:1,borderColor:'#DDE6D4',borderRadius:20},error:{color:'#A32121',fontSize:16,lineHeight:23},success:{backgroundColor:colors.pale,padding:14,borderRadius:14,fontSize:16,lineHeight:23}});
