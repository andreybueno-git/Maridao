import {useCallback,useRef,useState} from 'react';
import { PressableScale } from '@/components/pressable-scale';
import {Link,Redirect,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {Alert,Keyboard,Platform,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStyles} from '@/components/access-screen';
import { BackButton } from '@/components/back-button';
import {WorkflowHeading,StatusBadge,useFlow} from '@/components/workflow-screen';
import {DateField} from '@/components/date-field';
import {useSession} from '@/components/session';
import {api,ApiError} from '@/lib/api';
import {ServiceProgressActions,type ServiceProgress} from '@/components/service-progress';
import {CancellationNote,CancelLink,canCancel,type Cancellable} from '@/components/cancellation';
import {usePullRefresh} from '@/components/pull-refresh';
import { ListEntrance, Reflow, StaggerItem } from '@/components/list-entrance';
import { Skeleton } from '@/components/skeleton';
import { themed, useTheme } from '@/theme';

type Proposal={id:string;amount:string;description:string;estimated_duration:string;valid_until:string;status:string;provider_name:string;provider_id:string;expired:boolean;version:number;created_at:string;updated_at:string|null;withdrawn_at:string|null};
type Result={request:ServiceProgress & Cancellable & {id:string;category:string;description:string;neighborhood:string;neighborhood_label?:string;created_at:string;city:string;state:string;preferred_date:string|null;preferred_period:string|null;status:string};proposals:Proposal[];role:'customer'|'provider';page:number;hasMore:boolean};
const empty={amount:'',description:'',estimatedDuration:'',validUntil:''};
export default function ProposalsScreen(){
 const s=useS();const styles=useStyles();const flow=useFlow();const {colors}=useTheme();
 const {id,from}=useLocalSearchParams<{id:string;from?:string}>();
 const {session,setSession}=useSession();
 const [data,setData]=useState<Result|null>(null),[form,setForm]=useState(empty),[errors,setErrors]=useState<Record<string,string>>({});
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [editing,setEditing]=useState<{id:string;version:number}|null>(null);
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const pending=useRef(false),generation=useRef(0);
 const validId=typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id);
 // quiet: recarga do gesto de puxar; não liga o `busy` (sem "Carregando…" nem botões travados) e a lista fica na tela.
 const load=useCallback(async(page=1,quiet=false)=>{
  if(!session||!validId||pending.current)return;
  const run=generation.current;pending.current=true;if(!quiet)setBusy(true);setError('');
  try{
   const result:Result=await api(`/requests/${encodeURIComponent(id)}/proposals?page=${page}`,{headers:{Authorization:`Bearer ${session.token}`}});
   if(run!==generation.current)return;
   setData(old=>page===1||!old?result:{...result,proposals:[...old.proposals,...result.proposals.filter(item=>!old.proposals.some(previous=>previous.id===item.id))]});
  }catch(failure){if(run!==generation.current)return;if(failure instanceof ApiError&&failure.status===401)setSession(null);else setError(failure instanceof Error?failure.message:'Não foi possível carregar as propostas.');}
  finally{if(run===generation.current){pending.current=false;setBusy(false);}}
 },[session,setSession,validId,id]);
 useFocusEffect(useCallback(()=>{
  generation.current++;pending.current=false;setData(null);setEditing(null);setForm(empty);setErrors({});setMessage('');void load();
  return()=>{generation.current++;pending.current=false;};
 },[load]));
 function change(key:keyof typeof form,value:string){setForm(old=>({...old,[key]:value}));setErrors(old=>({...old,[key]:''}));setError('');}
 function beginEdit(proposal:Proposal){
  if(pending.current)return;
  setEditing({id:proposal.id,version:proposal.version});setForm({amount:proposal.amount.replace('.',','),description:proposal.description,estimatedDuration:proposal.estimated_duration,validUntil:proposal.valid_until});setErrors({});setError('');setMessage('');
 }
 function cancelEdit(){setEditing(null);setForm(empty);setErrors({});}
 async function submit(){
  if(!session||!validId||pending.current)return;
  const next:Record<string,string>={};
  for(const key of Object.keys(form) as (keyof typeof form)[])if(!form[key].trim())next[key]='Preencha este campo.';
  setErrors(next);setError('');if(Object.keys(next).length)return;
  const run=generation.current;pending.current=true;setBusy(true);Keyboard.dismiss();
  let sent=false;
  try{await api(`/requests/${encodeURIComponent(id)}/proposals${editing?'/'+encodeURIComponent(editing.id):''}`,{method:editing?'PATCH':'POST',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:JSON.stringify(editing?{...form,version:editing.version}:form)});if(run!==generation.current)return;setMessage(editing?'Proposta atualizada!':'Proposta enviada!');setEditing(null);setForm(empty);sent=true;}
  catch(failure){if(run!==generation.current)return;if(failure instanceof ApiError&&failure.status===401)setSession(null);else{if(failure instanceof ApiError&&failure.fields)setErrors(failure.fields);setError(failure instanceof Error?failure.message:'Não foi possível enviar a proposta.');}}
  finally{if(run===generation.current){pending.current=false;setBusy(false);}}
  if(sent)await load();
 }
 async function accept(proposalId:string,version:number){
  if(!session||pending.current||data?.role!=='customer'||data.request.status!=='Aberta')return;
  const run=generation.current;pending.current=true;setBusy(true);setError('');setMessage('');
  let accepted=false;
  try{
   await api(`/requests/${encodeURIComponent(id)}/proposals/${encodeURIComponent(proposalId)}/accept`,{method:'POST',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:JSON.stringify({version})});
   if(run!==generation.current)return;
   setData(old=>old?{...old,request:{...old.request,status:'Aceita'},proposals:old.proposals.map(item=>({...item,status:item.id===proposalId?'Aceita':item.status==='Pendente'?'Não selecionada':item.status}))}:old);
   setMessage('Proposta aceita!');accepted=true;
  }catch(failure){
   if(run!==generation.current)return;
   if(failure instanceof ApiError&&failure.status===401)setSession(null);
   else setError(failure instanceof Error?failure.message:'Não foi possível confirmar o aceite. Atualize as propostas para conferir o resultado.');
  }finally{if(run===generation.current){pending.current=false;setBusy(false);}}
  if(accepted)await load();
 }
 function confirmAcceptance(proposal:Proposal){
  if(pending.current)return;
  const run=generation.current;
  const amount=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(proposal.amount));
  Alert.alert('Aceitar esta proposta?',`${proposal.provider_name} · ${amount}\nAs demais propostas deste pedido ficarão como Não selecionadas.`,[
   {text:'Voltar',style:'cancel'},
   {text:'Confirmar aceite',onPress:()=>{if(run===generation.current)void accept(proposal.id,proposal.version);}},
  ]);
 }
 async function withdraw(proposal:Proposal){
  if(!session||pending.current||data?.role!=='provider'||data.request.status!=='Aberta')return;
  const run=generation.current;pending.current=true;setBusy(true);setError('');setMessage('');
  let changed=false;
  try{
   await api(`/requests/${encodeURIComponent(id)}/proposals/${encodeURIComponent(proposal.id)}/withdraw`,{method:'POST',headers:{Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'},body:JSON.stringify({version:proposal.version})});
   if(run!==generation.current)return;
   setData(old=>old?{...old,proposals:old.proposals.map(item=>item.id===proposal.id?{...item,status:'Retirada'}:item)}:old);
   cancelEdit();setMessage('Proposta retirada. Ela continuará no seu histórico.');changed=true;
  }catch(failure){if(run!==generation.current)return;if(failure instanceof ApiError&&failure.status===401)setSession(null);else setError(failure instanceof Error?failure.message:'Não foi possível retirar a proposta. Atualize para conferir o resultado.');}
  finally{if(run===generation.current){pending.current=false;setBusy(false);}}
  if(changed)await load();
 }
 // Puxar para atualizar recarrega pedido e propostas; uma edição em andamento continua aberta.
 const refresh=useCallback(()=>load(1,true),[load]);
 const pull=usePullRefresh(validId?refresh:undefined);
 function confirmWithdrawal(proposal:Proposal){
  if(pending.current)return;const run=generation.current;
  Alert.alert('Retirar esta proposta?','O cliente não poderá aceitá-la. O registro continuará no histórico e não poderá ser reenviado para este pedido.',[
   {text:'Voltar',style:'cancel'},
   {text:'Retirar proposta',style:'destructive',onPress:()=>{if(run===generation.current)void withdraw(proposal);}},
  ]);
 }
 if(!session)return <Redirect href="/entrar"/>;
 // Aceite, retirada e andamento mudam o status com a tela aberta: as pílulas pulsam (StatusBadge) e os cartões se
 // reacomodam com transição de layout (reflow) em vez de pular.
 return <SafeAreaView style={styles.safe}><ListEntrance ready={!!data}><ScrollView {...pull.props} ref={scroll} contentContainerStyle={[flow.page,{paddingBottom:64}]} automaticallyAdjustKeyboardInsets keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} keyboardShouldPersistTaps="handled">
  <BackButton href={from==='history'?'/historico':'/solicitacoes'} label={from==='history'?'Meu histórico':'Meus pedidos'} />
  <WorkflowHeading eyebrow="CADA DETALHE FAZ DIFERENÇA" title={data?.role==='provider'?'Sua proposta':'Propostas recebidas'} description={data?.role==='provider'?'Confira o pedido e apresente o que você pode oferecer.':'Compare as condições e escolha quem vai ajudar você.'}/>
  {!validId?<Text style={s.error}>Solicitação inválida. Volte à lista e tente novamente.</Text>:null}
  {data?<StaggerItem index={0} reflow><View style={flow.card}><Text accessibilityRole="header" style={flow.cardTitle}>{data.request.category}</Text><Text style={flow.field}>{data.request.neighborhood_label??data.request.neighborhood}</Text><Text style={flow.description}>{data.request.description}</Text><StatusBadge status={data.request.status}/><Text style={flow.note}>Publicado em {new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Araguaina'}).format(new Date(data.request.created_at))} · {data.request.city} – {data.request.state}</Text>{data.request.status==='Cancelada'?<><CancellationNote cancellation={data.request.cancellation}/><Text style={flow.note}>Este pedido foi encerrado. As propostas ficam disponíveis para consulta.</Text></>:null}{data.request.can_chat?<Link href={{pathname:'./chat',params:{id:data.request.id,status:data.request.status}}} style={styles.back}>Conversar sobre o atendimento ↗</Link>:null}<ServiceProgressActions request={data.request} role={data.role} from={from==='history'?'history':undefined} disabled={busy} onReload={refresh} onUpdated={updated=>setData(old=>old?{...old,request:{...old.request,...updated}}:old)}/>{canCancel(data.request)?<CancelLink id={data.request.id} role={data.role} from={from==='history'?'history':undefined} disabled={busy}/>:null}</View></StaggerItem>:null}
  {message?<Text accessibilityRole="alert" style={s.success}>{message}</Text>:null}
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {busy&&!data?<Skeleton shape="detail"/>:null}
  {data?.proposals.map((proposal,index)=><StaggerItem key={proposal.id} index={index+1} reflow><View style={[flow.card,proposal.status==='Aceita'&&flow.acceptedCard]}>
   <Text style={flow.cardTitle}>{proposal.provider_name}</Text><Link href={{pathname:'./perfil-prestador',params:{id:proposal.provider_id}}} style={styles.back}>Ver perfil e avaliações ↗</Link><Text style={s.price}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(proposal.amount))}</Text>
   <StatusBadge status={proposal.expired&&proposal.status==='Pendente'?'Validade encerrada':proposal.status}/>
   <Text style={flow.description}>{proposal.description}</Text><Text style={s.label}>Prazo estimado</Text><Text style={flow.field}>{proposal.estimated_duration}</Text>
   <Text style={s.label}>Válida até</Text><Text style={flow.field}>{proposal.valid_until.split('-').reverse().join('/')}</Text>
   {proposal.updated_at?<Text style={flow.note}>Atualizada em {new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Araguaina'}).format(new Date(proposal.updated_at))}</Text>:null}
   {data.role==='provider'&&data.request.status==='Aberta'&&proposal.status==='Pendente'&&!editing?<View style={s.group}>
    <PressableScale accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} style={s.button} onPress={()=>beginEdit(proposal)}><Text style={s.buttonText}>Editar proposta</Text></PressableScale>
    <PressableScale accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} style={s.secondary} onPress={()=>confirmWithdrawal(proposal)}><Text style={s.error}>Retirar proposta</Text></PressableScale>
   </View>:null}
   {data.role==='customer'&&data.request.status==='Aberta'&&proposal.status==='Pendente'&&!proposal.expired?<PressableScale accessibilityRole="button" accessibilityLabel={`Aceitar proposta de ${proposal.provider_name}`} accessibilityState={{disabled:busy,busy}} disabled={busy} style={s.button} onPress={()=>confirmAcceptance(proposal)}><Text style={s.buttonText}>Aceitar proposta</Text></PressableScale>:null}

  </View></StaggerItem>)}
  {data?.role==='customer'&&!data.proposals.length?<Text style={flow.description}>Você ainda não recebeu propostas para este pedido.</Text>:null}
  {data?.role==='provider'&&data.request.status==='Aberta'&&(editing||(!data.proposals.length&&!message))?<Reflow><View onLayout={()=>{if(editing)scroll.current?.scrollToEnd({animated:true});}} style={[s.form,flow.card]}>
   <Text accessibilityRole="header" style={flow.cardTitle}>{editing?'Editar proposta':'Enviar proposta'}</Text>{editing?<Text style={flow.note}>Confira todos os campos. As alterações serão exibidas ao cliente depois de salvar.</Text>:null}
   {([{key:'amount',label:'Valor total (R$)',placeholder:'Ex.: 150,00',max:9},{key:'description',label:'Descrição da proposta',placeholder:'Descreva o que está incluído no serviço',max:3000},{key:'estimatedDuration',label:'Prazo estimado',placeholder:'Ex.: 2 dias após combinar o início',max:200}] as const).map(field=><View key={field.key} style={s.group}><Text style={s.label}>{field.label}</Text><TextInput accessibilityLabel={field.label} editable={!busy} value={form[field.key]} onChangeText={text=>change(field.key,text)} maxLength={field.max} placeholder={field.placeholder} placeholderTextColor={colors.placeholder} keyboardType={field.key==='amount'?'decimal-pad':'default'} multiline={field.key==='description'} scrollEnabled={false} style={[s.input,errors[field.key]&&s.invalid]}/>{errors[field.key]?<Text style={s.error}>{errors[field.key]}</Text>:null}</View>)}
   <View style={s.group}><Text style={s.label}>Validade da proposta</Text><DateField label="validade da proposta" value={form.validUntil} onChange={value=>change('validUntil',value)} disabled={busy} error={errors.validUntil}/>{errors.validUntil?<Text style={s.error}>{errors.validUntil}</Text>:null}<Text style={flow.note}>Válida até o fim do dia escolhido, no horário de Palmas.</Text></View>
   <PressableScale accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy,busy}} style={s.button} onPress={submit}><Text style={s.buttonText}>{busy?'Salvando…':editing?'Salvar alterações':'Enviar proposta'}</Text></PressableScale>
   {editing?<PressableScale accessibilityRole="button" disabled={busy} style={s.secondary} onPress={cancelEdit}><Text style={s.label}>Cancelar edição</Text></PressableScale>:null}
  </View></Reflow>:null}
  {data?.hasMore?<PressableScale accessibilityRole="button" disabled={busy} style={s.secondary} onPress={()=>load(data.page+1)}><Text style={s.label}>Carregar mais propostas</Text></PressableScale>:null}
 </ScrollView></ListEntrance></SafeAreaView>;
}
const useS = themed(colors => StyleSheet.create({form:{gap:24},group:{gap:10},label:{fontSize:16,fontWeight:'600',color:colors.text},price:{fontSize:32,lineHeight:39,letterSpacing:-0.8,fontWeight:'800',color:colors.onAccentSoft,backgroundColor:colors.accentSoft,padding:14,borderRadius:16,alignSelf:'flex-start'},input:{minHeight:58,borderWidth:1,borderColor:colors.borderStrong,borderRadius:16,padding:16,fontSize:17,color:colors.text},invalid:{borderColor:colors.danger,borderWidth:2},error:{color:colors.danger,fontSize:16,lineHeight:24},success:{backgroundColor:colors.accentSoft,padding:16,borderRadius:14,fontSize:18,fontWeight:'600',color:colors.onAccentSoft},button:{backgroundColor:colors.primary,padding:18,minHeight:56,borderRadius:16,alignItems:'center'},buttonText:{color:colors.onPrimary,fontSize:17,fontWeight:'700'},secondary:{minHeight:48,padding:14,justifyContent:'center',borderWidth:1,borderColor:colors.border,borderRadius:16,alignItems:'center'}}));
