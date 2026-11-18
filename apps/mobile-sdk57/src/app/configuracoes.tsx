import {useState} from 'react';
import {Alert,Text,TextInput,View} from 'react-native';
import {useSession} from '@/components/session';
import {PrivateScreen,usePrivateResource,Feedback,Button,ui} from '@/components/private-screen';
import {SelectionField,CatalogNotice} from '@/components/selection-field';
import {useCatalog} from '@/hooks/use-catalog';
import {styles} from '@/components/access-screen';
type Profile={name:string;phone:string;neighborhood?:string;categories?:string[];specialties?:string[];neighborhoods?:string[];availability?:string;email:string;email_verified_at:string|null;role:'customer'|'provider'};
type SettingsData={profile:Profile;mailMode:string};
export default function Settings(){const resource=usePrivateResource<SettingsData>('/account');return <PrivateScreen title="Configurações"><Feedback {...resource}/><Button secondary label="Atualizar meus dados" disabled={resource.busy} onPress={()=>void resource.reload()}/>{resource.data?<ProfileForm key={JSON.stringify(resource.data.profile)} profile={resource.data.profile} mailMode={resource.data.mailMode} resource={resource}/>:null}</PrivateScreen>;}
function ProfileForm({profile,mailMode,resource}:{profile:Profile;mailMode:string;resource:ReturnType<typeof usePrivateResource<SettingsData>>}){
 const catalog=useCatalog(),{setSession}=useSession();
 const [form,setForm]=useState({name:profile.name,phone:profile.phone,neighborhood:profile.neighborhood??'',categories:profile.categories??[],specialties:profile.specialties??[],neighborhoods:profile.neighborhoods??[],availability:profile.availability??''});
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[token,setToken]=useState('');
 const provider=profile.role==='provider',busy=resource.busy;
 const specialties=(catalog.data?.services.filter(s=>form.categories.includes(s.value)).flatMap(s=>s.specialties)??[]).filter((v,i,a)=>a.indexOf(v)===i).map(value=>({value,label:value}));
 async function save(){const body=provider?{name:form.name,phone:form.phone,categories:form.categories,specialties:form.specialties,neighborhoods:form.neighborhoods,availability:form.availability,currentPassword}:{name:form.name,phone:form.phone,neighborhood:form.neighborhood,currentPassword};const result=await resource.perform('/account',body,'PATCH');if(result){setCurrentPassword('');resource.setMessage(result.message);}}
 async function changePassword(){const result=await resource.perform('/account/password',{currentPassword,newPassword},'POST');if(result){Alert.alert('Senha alterada','Entre novamente com sua nova senha.');setSession(null);}}
 function close(){Alert.alert('Excluir acesso à conta?','Você deixará de entrar e aparecer nas buscas. Pedidos e registros dos serviços serão preservados. Atendimentos aceitos ou em andamento precisam ser resolvidos antes.',[{text:'Voltar',style:'cancel'},{text:'Excluir acesso',style:'destructive',onPress:()=>void resource.perform('/account/close',{currentPassword},'POST').then(result=>{if(result)setSession(null);})}]);}
 return <View style={ui.group}>
  <Text style={styles.note}>Palmas – TO · {profile.email}</Text>
  {(['name','phone'] as const).map(key=><View key={key} style={ui.group}><Text style={ui.label}>{key==='name'?'Nome':'Telefone com DDD'}</Text><TextInput accessibilityLabel={key==='name'?'Nome':'Telefone com DDD'} editable={!busy} value={form[key]} maxLength={key==='name'?150:30} keyboardType={key==='phone'?'phone-pad':'default'} onChangeText={v=>setForm(old=>({...old,[key]:v}))} style={ui.input}/></View>)}
  {!catalog.data?<CatalogNotice error={catalog.error} retry={catalog.retry}/>:provider?<>
   <Text style={ui.label}>Categorias de serviço</Text><SelectionField label="Categorias de serviço" options={catalog.data.services} multiple values={form.categories} disabled={busy} onChange={categories=>setForm(old=>({...old,categories,specialties:old.specialties.filter(value=>catalog.data!.services.filter(s=>categories.includes(s.value)).some(s=>s.specialties.includes(value)))}))}/>
   <Text style={ui.label}>Especialidades</Text><SelectionField label="Especialidades" options={specialties} multiple values={form.specialties} disabled={busy} onChange={specialties=>setForm(old=>({...old,specialties}))}/>
   <Text style={ui.label}>Locais de atendimento</Text><SelectionField label="Locais de atendimento" options={[...catalog.data.coverageRegions,...catalog.data.neighborhoods]} multiple max={50} values={form.neighborhoods} disabled={busy} onChange={values=>setForm(old=>({...old,neighborhoods:values.includes('CIDADE:PALMAS')?['CIDADE:PALMAS']:values}))}/>
   <Text style={ui.label}>Disponibilidade</Text><TextInput accessibilityLabel="Disponibilidade" style={ui.input} value={form.availability} onChangeText={availability=>setForm(old=>({...old,availability}))} multiline maxLength={500} editable={!busy}/>
  </>:<><Text style={ui.label}>Bairro ou quadra</Text><SelectionField label="Bairro ou quadra" options={catalog.data.neighborhoods} values={form.neighborhood?[form.neighborhood]:[]} disabled={busy} onChange={v=>setForm(old=>({...old,neighborhood:v[0]??''}))}/></>}
  <Text style={ui.label}>Senha atual para confirmar alterações</Text><TextInput accessibilityLabel="Senha atual" secureTextEntry autoCapitalize="none" style={ui.input} maxLength={128} value={currentPassword} onChangeText={setCurrentPassword} editable={!busy}/>
  <Button label="Salvar perfil" disabled={busy||!catalog.data} onPress={()=>void save()}/>
  <View style={ui.card}><Text style={ui.label}>Trocar senha</Text><TextInput accessibilityLabel="Nova senha" secureTextEntry autoCapitalize="none" placeholder="Nova senha, de 8 a 128 caracteres" style={ui.input} maxLength={128} value={newPassword} onChangeText={setNewPassword} editable={!busy}/><Button label="Alterar senha e sair" disabled={busy} onPress={()=>void changePassword()}/></View>
  <View style={ui.card}><Text style={ui.label}>{profile.email_verified_at?'E-mail confirmado':'Confirmar meu e-mail'}</Text><Text style={styles.note}>{mailMode==='local'?'Modo de teste: as instruções são gravadas na caixa de saída local do computador.':'O envio de e-mail precisa ser configurado.'}</Text>{!profile.email_verified_at?<><Button secondary label="Solicitar código de confirmação" disabled={busy||mailMode!=='local'} onPress={()=>void resource.perform('/account/verify-email',{},'POST').then(r=>{if(r)resource.setMessage(r.message);})}/><TextInput accessibilityLabel="Código recebido no e-mail de teste" autoCapitalize="none" style={ui.input} maxLength={64} value={token} onChangeText={setToken} editable={!busy}/><Button label="Confirmar e-mail" disabled={busy} onPress={()=>void resource.perform('/account/confirm-email',{token},'POST').then(r=>{if(r)void resource.reload();})}/></>:null}</View>
  <Button secondary label="Excluir acesso à minha conta" disabled={busy} onPress={close}/>
 </View>;
}
