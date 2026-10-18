import test from 'node:test';
import assert from 'node:assert/strict';
import {installEmotes,ownedEmotes,emoteKind} from '../dist/src/emotes.js';
import {defaultSave} from '../dist/src/save.js';
import {ITEMS} from '../dist/src/catalog.js';

test('emote wheel pages once per click, closes, and keyboard shortcuts animate without firing a shot',async t=>{
 const previous={window:globalThis.window,document:globalThis.document,performance:globalThis.performance};
 t.after(()=>Object.assign(globalThis,previous));
 let now=0,clears=0,stopped=0;const listeners={},nodes=[];
 const focus={isConnected:true,focus(){},closest(){return null;}};
 const element=()=>({style:{setProperty(){}},listeners:{},addEventListener(n,f){this.listeners[n]=f;},setAttribute(){},querySelector:()=>focus,querySelectorAll:()=>[focus],remove(){nodes.splice(nodes.indexOf(this),1);},isConnected:true});
 globalThis.performance={now:()=>now};globalThis.window={addEventListener:(n,f)=>listeners[n]=f};
 globalThis.document={activeElement:focus,createElement:element,body:{append:el=>nodes.push(el)}};
 const data=defaultSave();data.owned.push(...ITEMS.filter(i=>i.category==='emote').map(i=>i.id));
 const ui={root:{inert:false},modalRoot:{children:[]},progress:{data},world:{golferScreen:()=>({x:200,y:200,visible:true})},game:{state:'playing',physics:{active:false},mode:'golf',clearInput:()=>clears++},audio:{play(){}},action(){},tick(){},toast(){}};
 installEmotes(ui);await ui.action('emote-wheel');const wheel=nodes[0];assert.ok(ui.root.inert);assert.match(wheel.innerHTML,/1 \/ 14/);
 const click=name=>({stopPropagation:()=>stopped++,target:{closest:s=>s==='[data-action]'?{dataset:{action:name,step:'1'}}:null}});
 wheel.listeners.click(click('emote-page'));assert.match(wheel.innerHTML,/2 \/ 14/);assert.equal(stopped,1);
 wheel.listeners.click(click('emote-close'));assert.equal(nodes.length,0);assert.equal(ui.root.inert,false);
 const key=code=>({code,target:focus,preventDefault(){},stopImmediatePropagation(){}});
 listeners.keydown(key('Digit1'));assert.equal(ui.world.emotePose.kind,emoteKind(ownedEmotes(data)[0]));assert.ok(clears>=2);
 now+=1100;ui.world.emotePose=null;listeners.keydown(key('KeyV'));assert.ok(ui.world.emotePose);
 now+=1100;ui.world.emotePose=null;ui.game.physics.active=true;listeners.keydown(key('KeyV'));assert.equal(ui.world.emotePose,null);
 ui.game.physics.active=false;listeners.keydown({...key('KeyV'),repeat:true});assert.equal(ui.world.emotePose,null);
 listeners.keydown(key('KeyB'));assert.ok(ui.root.inert);listeners.keydown(key('Escape'));assert.equal(ui.root.inert,false);
});

test('name-based dance emotes select a dance pose',()=>{
 assert.equal(emoteKind({id:'emote-77',name:'Copperline Groove'}),'dance');
 assert.equal(emoteKind({id:'emote-78',name:'Moonlit Twirl'}),'dance');
});
