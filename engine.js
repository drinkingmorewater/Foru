(function(root){
'use strict';
const scenes=[
{name:'健身房 · 组间有回应',time:'17:40',desc:'训练时保持安静；喘气与器械声不触发对话。',mode:'耳机短句',device:'耳机'},
{name:'驾车 · 专注眼前',time:'18:10',desc:'同一场约见接力到车机，复杂路段暂存非紧急内容。',mode:'车机短句',device:'车机'},
{name:'咖啡馆 · 安静也能继续',time:'18:35',desc:'到达约见地点；长内容上屏，耳机断开立即静音。',mode:'静默文字',device:'手机'},
{name:'回家 · 默契留下来',time:'20:00',desc:'整理今晚，选择哪些偏好值得留给下一次。',mode:'手机文字',device:'手机'}];
function initial(memories=[]){return {session:null,active:false,scene:0,device:'耳机',mode:'耳机短句',state:'Dormant',decision:'等待开启',reason:'只在你明确开启的伴随期内接收模拟事件。',transcript:[],ledger:[],tasks:[],pending:null,memories,queue:[],route:'咖啡馆正门',rest:0,step:-1,events:[],heard:'',remaining:'',draft:'',load:false,candidate:false};}
function reduce(s,e){let n=JSON.parse(JSON.stringify(s)); const log=(type,text)=>n.transcript.push({type,text}); const decide=(a,b,c)=>{n.decision=a;n.reason=b;n.state=c||n.state}; const reply=t=>{log('ai',t);n.heard='';n.remaining=t;n.state=n.mode.includes('文字')?'Silent Act':'Speaking'};
n.events.push({time:new Date().toISOString(),event:e.type,session:n.session});
if(e.type==='START'){n.active=true;n.session='FORU-'+Date.now().toString(36).toUpperCase();n.state='Listening';decide('LISTEN','显式开启伴随期；无需在每轮重新唤醒。');log('user','怀民，陪我练完，去咖啡馆接小林，再回家。');reply('我在。训练时少说，组间再聊。今晚接小林这件事，我帮你接着。');n.tasks=[{id:'meet',text:'18:40 咖啡馆接小林',status:'进行中'}];return n;}
if(e.type==='DELETE_MEMORY'){n.memories=n.memories.filter(x=>x.id!==e.id);return n;}
if(e.type==='EDIT_MEMORY'){n.memories=n.memories.map(x=>x.id===e.id?{...x,text:e.text,source:'用户编辑',updated:new Date().toISOString()}:x);return n;}
if(!n.active){decide('SESSION CLOSED','伴随期未开启；请点击“开启伴随”。','Closed');return n;}
switch(e.type){
case 'NOISE':log('env','喘气 / 器械声 / 旁人聊天（模拟事件）');decide('IGNORE','WHO：无明确对话指向。保留当前播报、计时与任务。');break;
case 'PAUSE':log('user','下一组……呃，我想想……');decide('WAIT','WHEN：语义未完成。保持倾听，不把停顿当作句号。','Waiting');n.heard='';n.remaining='';break;
case 'REST':log('user','先休息一下，下一组等我说开始。');n.rest=Date.now()+10000;decide('WAIT','训练中只保留计时，下一组由用户决定。','Waiting');reply('好，先休息。这次用 10 秒演示计时，不会自动开始下一组。');break;
case 'PLAN':log('user','讲讲我今晚接人的安排。');decide('SPEAK','HOW：耳机短句，可随时打断。');reply('练完先去咖啡馆正门接小林。预计十八点四十到。然后一起回家，路上再商量晚饭。');break;
case 'TICK':if(n.remaining){n.heard+=n.remaining.slice(0,e.count||1);n.remaining=n.remaining.slice(e.count||1);if(!n.remaining)n.state=n.mode.includes('文字')?'Silent Act':'Listening';}break;
case 'INTERRUPT':log('user','等等，不去正门，改到北门接她。');if(n.heard||n.remaining)n.ledger.push({heard:n.heard,unheard:n.remaining,status:'旧入口说明已失效；不再续播'});n.heard='';n.remaining='';n.route='咖啡馆北门';decide('BARGE-IN','立即停止当前输出。用户改口覆盖旧路线，未播部分不计入已说。','Barge-in');n.tasks[0]={id:'meet',text:'18:40 咖啡馆北门接小林',status:'进行中'};reply('改为北门。旧入口说明已取消。');break;
case 'DRAFT':log('user','跟小林说，我十八点四十到北门。');n.pending={id:'msg-001',to:'小林（演示联系人）',text:'我18:40到咖啡馆北门接你。',status:'等待确认'};decide('CONFIRM','SURE：发送消息有外部影响，先核对收件人和完整内容。','Confirming');log('ai','给小林发送：“我18:40到咖啡馆北门接你。”确认吗？');break;
case 'CONFIRM':if(n.pending){n.tasks.push({id:n.pending.id,text:n.pending.text,status:'模拟发送成功'});n.pending=null;decide('EXECUTE','确认通过；生成本地模拟回执，不连接真实通讯软件。','Listening');reply('模拟消息已发送。');}else decide('NO-OP','没有待确认消息，不重复执行。');break;
case 'CANCEL':n.pending=null;decide('CANCEL','草稿已取消，没有执行发送。','Listening');log('ai','好，先不发。');break;
case 'DRIVE':n.scene=1;n.device='车机';n.mode='车机短句';n.heard='';n.remaining='';decide('HANDOFF','同一 Session 移交播放权；耳机停止输出，任务与确认状态保留。','Handoff');log('env','耳机 → 车机：设备接力（模拟）');reply('接到车机了，继续去咖啡馆北门。');break;
case 'LOAD':n.load=true;n.queue.push('今晚约见：北门接小林，预计18:40。');n.heard='';n.remaining='';decide('DEFER','复杂路段只保留必要导航，约见详情存入队列。','Waiting');log('env','进入复杂路口（模拟）；约见详情暂存，等待停车。');break;
case 'PARK':n.load=false;decide('RESUME','已停车，用户允许后恢复暂存摘要。');reply(n.queue.length?'刚才暂存的是：'+n.queue.shift():'目前没有暂存内容。');break;
case 'QUIET':n.scene=2;n.device='手机';n.mode='静默文字';n.heard='';n.remaining='';decide('SILENT ACT','公共空间默认文字；耳语也可能被旁人听见。','Silent Act');log('env','走进安静咖啡馆；切换文字与可选触觉反馈。');reply('已到咖啡馆北门。约见详情只显示在屏幕上。');break;
case 'UNPLUG':n.device='手机';n.mode='静默文字';n.heard='';n.remaining='';decide('MUTE FIRST','耳机连接中断：先取消输出，禁止自动切到扬声器。','Silent Act');log('env','耳机断开（模拟）；已阻止外放。');break;
case 'PRIVATE':log('user','把我和小林的约见详情给我看一下。');decide('SCREEN','含联系人与行程，长内容上屏。','Silent Act');reply('小林 · 18:40 · 咖啡馆北门。消息状态：'+(n.tasks.some(t=>t.status==='模拟发送成功')?'已确认，模拟发送成功。':'未发送。')+'这是演示数据，仅存于当前浏览器。');break;
case 'HOME':n.scene=3;n.device='手机';n.mode='手机文字';n.tasks[0].status='已完成（模拟）';decide('REVIEW','回家后再复盘，提供记忆候选而非默认长期保存。','Silent Act');log('user','到家了。以后训练只在组间提醒，开车也说短一点。');n.candidate=true;reply('这两条要保存为以后使用的偏好吗？你可以只用于本次，或保存后随时改掉。');break;
case 'SAVE_MEMORY':if(n.candidate){for(const [id,text] of [['gym','训练：仅组间提醒'],['drive','驾驶：默认简短确认']]){n.memories=n.memories.filter(m=>m.id!==id);n.memories.push({id,text,scope:id==='gym'?'健身房':'驾驶',source:'用户明确确认',updated:new Date().toISOString()});}n.candidate=false;decide('SAVE','两条偏好已保存到当前浏览器，可修改、删除和导出。','Silent Act');log('ai','记住了，下次按这个节奏。');}break;
case 'SKIP_MEMORY':n.candidate=false;decide('SESSION ONLY','本次偏好不写入长期记忆。');break;
case 'OFFLINE':n.heard='';n.remaining='';decide('LOCAL FALLBACK','模拟网络不可用；保留本地计时与草稿，联网任务等待恢复。','Waiting');log('env','网络不可用（模拟）；无外部执行，不生成假成功回执。');break;
case 'CLOSE':n.active=false;n.state='Closed';n.heard='';n.remaining='';n.pending=null;n.queue=[];n.rest=0;n.candidate=false;decide('SESSION CLOSED','伴随期结束，取消待办确认与输出，已授权偏好保留。','Closed');log('ai','今晚就到这里。下次需要时再叫我。');break;
case 'UNKNOWN':log('user',e.text);decide('CLARIFY','这是本地规则原型，仅支持演示意图。','Listening');log('ai','试试“讲讲安排”“等等，改北门”“发消息”“确认”“上车”“安静模式”或“结束”。');break;
}return n;}
const flow=[['START','开启伴随'],['NOISE','喘气与器械声'],['PAUSE','一句话没说完'],['REST','等我休息一下'],['PLAN','讲讲今晚安排'],['INTERRUPT','等等，改到北门'],['DRAFT','拟一条接人消息'],['CONFIRM','确认模拟发送'],['DRIVE','上车继续同一任务'],['NOISE','路噪不抢话'],['LOAD','复杂路口先安静'],['PARK','停车接着说'],['QUIET','进入安静咖啡馆'],['UNPLUG','耳机断开不外放'],['PRIVATE','约见详情只上屏'],['HOME','到家，整理今晚'],['SAVE_MEMORY','保存两条偏好'],['CLOSE','结束伴随']];
const api={scenes,initial,reduce,flow};if(typeof module!=='undefined')module.exports=api;else root.ForuEngine=api;
})(typeof window!=='undefined'?window:this);
