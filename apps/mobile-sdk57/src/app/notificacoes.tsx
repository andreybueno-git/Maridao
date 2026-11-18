import {Link} from 'expo-router';
import {Text,View} from 'react-native';
import {PrivateScreen,usePrivateResource,Feedback,Button,ui} from '@/components/private-screen';
import {styles} from '@/components/access-screen';
type Notice={id:string;request_id:string;title:string;created_at:string;read_at:string|null};
type Data={notifications:Notice[];hasMore:boolean;unread:number};
export default function Notifications(){const r=usePrivateResource<Data>('/notifications');
 async function read(n:Notice){const result=await r.perform('/notifications/'+n.id+'/read',{},'POST');if(result)r.setData(old=>old?{...old,unread:n.read_at?old.unread:Math.max(0,old.unread-1),notifications:old.notifications.map(item=>item.id===n.id?{...item,read_at:result.read_at}:item)}:old);}
 async function more(){const before=r.data?.notifications.at(-1)?.id;if(!before)return;const result=await r.perform('/notifications?before='+before);if(result)r.setData(old=>old?{...result,notifications:[...old.notifications,...result.notifications]}:result);}
 return <PrivateScreen title="Notificações"><Feedback {...r}/><Button secondary label="Atualizar notificações" disabled={r.busy} onPress={()=>void r.reload()}/>{r.data?<Text style={styles.note}>{r.data.unread} não lidas · Avisos dentro do aplicativo</Text>:null}{r.data?.notifications.length===0?<Text style={styles.note}>Nenhuma notificação por enquanto.</Text>:null}{r.data?.notifications.map(n=><View key={n.id} style={ui.card}><Text style={ui.label}>{n.read_at?'':'● '}{n.title}</Text><Text style={styles.note}>{new Date(n.created_at).toLocaleString('pt-BR')}</Text><Link href={{pathname:'/propostas',params:{id:n.request_id}}} style={styles.back}>Ver atendimento ↗</Link>{!n.read_at?<Button secondary label="Marcar como lida" disabled={r.busy} onPress={()=>void read(n)}/>:null}</View>)}{r.data?.hasMore?<Button label="Carregar avisos anteriores" disabled={r.busy} onPress={()=>void more()}/>:null}</PrivateScreen>;
}
