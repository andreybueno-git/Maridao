import {useState} from 'react';
import {Link,useLocalSearchParams} from 'expo-router';
import {Text,TextInput,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {PrivateScreen,usePrivateResource,Feedback,Button,ui} from '@/components/private-screen';
import {styles} from '@/components/access-screen';
type Message={id:string;mine:boolean;message:string;created_at:string};
type Data={messages:Message[];hasMore:boolean;canSend:boolean};
export default function Chat(){const {id}=useLocalSearchParams<{id:string}>(),path=`/requests/${encodeURIComponent(id??'')}/messages`,r=usePrivateResource<Data>(path);const [message,setMessage]=useState(''),[draftId,setDraftId]=useState<string|null>(null);
 async function send(){const clientId=draftId??Crypto.randomUUID();setDraftId(clientId);const result=await r.perform(path,{clientId,message},'POST');if(result){setMessage('');setDraftId(null);await r.reload();}}
 async function older(){const before=r.data?.messages[0]?.id;if(!before)return;const result=await r.perform(path+'?before='+before);if(result)r.setData(old=>old?{...result,messages:[...result.messages,...old.messages]}:result);}
 return <PrivateScreen title="Conversa do atendimento"><Link href={{pathname:'/propostas',params:{id}}} style={styles.back}>‹ Voltar ao atendimento</Link><Feedback {...r}/><Button secondary label="Atualizar conversa" disabled={r.busy} onPress={()=>void r.reload()}/>{r.data?.hasMore?<Button secondary label="Carregar mensagens anteriores" disabled={r.busy} onPress={()=>void older()}/>:null}{r.data?.messages.length===0?<Text style={styles.note}>Combine os detalhes por aqui. Não compartilhe senhas nem documentos.</Text>:null}{r.data?.messages.map(m=><View key={m.id} style={[ui.card,{backgroundColor:m.mine?'#EEF8E3':'white'}]}><Text style={ui.label}>{m.mine?'Você':'Outra parte do atendimento'}</Text><Text selectable style={styles.note}>{m.message}</Text><Text style={styles.note}>{new Date(m.created_at).toLocaleString('pt-BR')}</Text></View>)}{r.data?.canSend?<View style={ui.group}><TextInput accessibilityLabel="Mensagem para o atendimento" value={message} onChangeText={value=>{setMessage(value);setDraftId(null);}} editable={!r.busy} style={ui.input} multiline maxLength={2000} placeholder="Escreva sua mensagem"/><Button label="Enviar mensagem" disabled={r.busy||!message.trim()} onPress={()=>void send()}/></View>:r.data?<Text style={styles.note}>Atendimento encerrado. A conversa foi preservada para consulta.</Text>:null}</PrivateScreen>;
}
