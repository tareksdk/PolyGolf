// Supabase private Broadcast. No positions are written to Postgres.
export class LiveTransport {
  constructor({url,key,token,user,scope,receive,status=()=>{},socket=WebSocket}) {
    Object.assign(this,{url,key,token,user,scope,receive,status,Socket:socket});
    this.ref=0;this.failures=0;this.closed=false;this.joined=new Set();this.refs=new Map();this.connect();
  }
  topic(id){return `realtime:polygolf:${this.scope.key}:${id}`;}
  send(event,payload,topic='phoenix',ref=String(++this.ref)){
    if(this.ws?.readyState!==1)return false;
    this.ws.send(JSON.stringify({topic,event,payload,ref,...(this.joins?.has(topic)?{join_ref:this.joins.get(topic)}:{})}));return true;
  }
  connect(){
    if(this.closed)return;
    this.joined.clear();this.refs.clear();this.joins=new Map();this.status('connecting');
    const ws=this.ws=new this.Socket(this.url.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(this.key)+'&vsn=1.0.0');
    this.deadline=setTimeout(()=>ws.close(),12000);
    ws.onopen=()=>{
      for(const p of this.scope.members){
        const topic=this.topic(p.id),ref=String(++this.ref);this.refs.set(ref,p.id);this.joins.set(topic,ref);
        this.send('phx_join',{config:{broadcast:{ack:false,self:false},presence:{enabled:false},postgres_changes:[],private:true},access_token:this.token},topic,ref);
      }
      this.heartbeat=setInterval(()=>{if(this.pendingHeartbeat){ws.close();return;}this.pendingHeartbeat=String(++this.ref);this.send('heartbeat',{},'phoenix',this.pendingHeartbeat);},25000);
    };
    ws.onmessage=e=>{
      let m;try{if(typeof e.data!=='string'||e.data.length>10000)return;m=JSON.parse(e.data);}catch{return;}
      if(m.event==='phx_reply'){
        if(m.ref===this.pendingHeartbeat)this.pendingHeartbeat=null;
        const id=this.refs.get(m.ref);
        if(id){this.refs.delete(m.ref);if(m.payload?.status==='ok'){this.joined.add(id);if(this.joined.size===this.scope.members.length){clearTimeout(this.deadline);this.failures=0;this.status('live');}}else ws.close();}
      }
      if(m.event==='phx_error'||m.event==='phx_close')ws.close();
      if(m.event==='broadcast'&&m.payload?.event==='state'){
        const id=this.scope.members.find(p=>p.id!==this.user&&this.topic(p.id)===m.topic)?.id;
        if(id && this.joined.has(id))this.receive(id,m.payload.payload);
      }
    };
    ws.onerror=()=>ws.close();
    ws.onclose=()=>{
      clearTimeout(this.deadline);clearInterval(this.heartbeat);this.pendingHeartbeat=null;this.joined.clear();
      if(!this.closed){this.status('reconnecting');this.retry=setTimeout(()=>this.connect(),Math.min(30000,1500*2**Math.min(this.failures++,5)));}
    };
  }
  publish(state){return this.joined.has(this.user)&&this.send('broadcast',{type:'broadcast',event:'state',payload:state},this.topic(this.user));}
  updateToken(token){if(!token||token===this.token)return;this.token=token;for(const id of this.joined)this.send('access_token',{access_token:token},this.topic(id));}
  close(){this.closed=true;clearTimeout(this.retry);clearTimeout(this.deadline);clearInterval(this.heartbeat);if(this.ws){this.ws.onclose=null;this.ws.close();}this.joined.clear();}
}
