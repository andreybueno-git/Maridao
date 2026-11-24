import {useEffect,useRef,useState} from 'react';
import {ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStyles} from '@/components/access-screen';
import { BackButton } from '@/components/back-button';
import {Button,Feedback,useUi} from '@/components/private-screen';
import {api} from '@/lib/api';
import {asMailMode,canRequestCode,codeLabel,recoveryNote,type MailMode} from '@/lib/mail-mode';
import { useTheme } from '@/theme';
export default function Recovery(){
 const styles=useStyles();const {colors}=useTheme();const ui=useUi();
 const [email,setEmail]=useState(''),[token,setToken]=useState(''),[newPassword,setNewPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[requested,setRequested]=useState(false);const pending=useRef(false);
 // RF10.3: a tela pergunta à API como o código é entregue (e-mail de verdade, caixa local de teste ou envio não configurado).
 const [mode,setMode]=useState<MailMode|null>(null);
 useEffect(()=>{let active=true;api('/auth/recovery').then(r=>{if(active)setMode(asMailMode(r?.mailMode));}).catch(()=>{});return()=>{active=false;};},[]);
 const available=canRequestCode(mode);
 async function submit(reset=false){if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');try{const r=await api(reset?'/auth/reset-password':'/auth/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reset?{email,token,newPassword}:{email})});setMessage(r.message);if(reset){setToken('');setNewPassword('');setRequested(false);}else setRequested(true);}catch(e){setError(e instanceof Error?e.message:'Não foi possível continuar.');}finally{pending.current=false;setBusy(false);}}
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"><BackButton href="/entrar" label="Entrar na conta" /><Text accessibilityRole="header" style={styles.title}>Recuperar senha</Text><Text accessibilityRole={available?undefined:'alert'} style={styles.note}>{recoveryNote(mode)}</Text><Feedback busy={busy} error={error} message={message}/><TextInput placeholderTextColor={colors.placeholder} accessibilityLabel="E-mail da conta" placeholder="E-mail da conta" style={ui.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={254} editable={!busy}/><Button label={requested?'Solicitar novo código':'Solicitar recuperação'} onPress={()=>void submit()} disabled={busy||!available}/>{requested?<View style={ui.group}><TextInput placeholderTextColor={colors.placeholder} accessibilityLabel={codeLabel(mode)} placeholder="Código recebido" style={ui.input} value={token} onChangeText={setToken} autoCapitalize="none" maxLength={64} editable={!busy}/><TextInput placeholderTextColor={colors.placeholder} accessibilityLabel="Nova senha" placeholder="Nova senha, de 8 a 128 caracteres" style={ui.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" maxLength={128} editable={!busy}/><Button label="Redefinir senha" onPress={()=>void submit(true)} disabled={busy}/></View>:null}</ScrollView></SafeAreaView>;
}
