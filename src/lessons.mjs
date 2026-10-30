// Deliberately selected executions, not a hardware scheduler or formal ISA model.
// Visible values refer to the illustrated observer, never a universal DRAM copy.
export const lessons = [
 {id:'self',short:'① 自己读',title:'自己刚写了 42，自己会读到什么？',setup:'只有 CPU 0 在运行。数据原来是 0；它先把数据改成 42，然后立即读取同一个位置。',takeaway:'自己能读到新值，不等于别人已经能看到新值。',term:'这种从待处理写入中取得新值的机制，可以叫“存储转发”。这是可能的实现方式，不是每一次读取都必须这样实现。',advanced:'self',sync:false},
 {id:'message',short:'② 别人读',title:'通知到了，数据为什么还没到？',setup:'这一节先看弱序 CPU、没有同步的情况。CPU 0 先写“数据 = 42”，再写另一个位置“准备好了 = 是”；CPU 1 看到通知后，再读取数据。',takeaway:'代码里的先后，不自动等于另一个 CPU 观察到的先后。',term:'“内存序”约束的是读写之间允许出现的观察结果。弱序允许某些重排；并不是每次都会乱，也不是任意结果都合法。',advanced:'message',sync:false},
 {id:'fix',short:'③ 补规则',title:'让“准备好了”真的代表数据已准备好',setup:'还是交付 42。这次给双方加规则：发送方保证数据先于通知发布；接收方读到这次通知后，再按同步约束读取数据。',takeaway:'读到对应的发布通知，加上双方的同步约束，才完成这次交接。',term:'发送方的发布约束叫 release；接收方的获取约束叫 acquire。只有 acquire 读到对应 release 发布的值，才建立这里的同步。',advanced:'message',sync:true},
 {id:'dbar',short:'④ 认识 DBAR',title:'DBAR 像一道有条件放行的门',setup:'换到一个 LoongArch CPU 内部：DBAR 0 前面有一次读、一次写尚未完成，后面有新的访存。看这道门在等什么。',takeaway:'DBAR 0 管访存的先后和完成条件；它不等于刷新全部缓存，也不代表设备已经干完活。',term:'这是架构语义的概念动画。实际 CPU 怎样跟踪指令、阻塞或重放，由具体实现决定；其他 DBAR hint 的约束可能更细。',advanced:'dbar',sync:true}
];
export function lessonFrames(id) {
 const f=(title,explain,state={},focus='sender')=>({title,explain,focus,...state});
 const initial={writtenData:0,writtenReady:false,visibleData:0,visibleReady:false,readData:null,readReady:null,pending:[]};
 let changes;
 if(id==='self')changes=[
  f('先看起点：数据是 0','还没有执行任何读写。左边是本核写入记录，右边是本次读取结果。'),
  f('CPU 0 写下 42','本核已经记录这次写入。它还没有对外可见，但这不妨碍本核取得自己的新值。',{writtenData:42,pending:['数据 42：尚未对外可见']}),
  f('CPU 0 读取同一个位置，得到 42','注意：读取结果已经是 42，中间的对外可见值仍是 0。这两件事可以同时成立。',{readData:42},'reader'),
  f('稍后，42 才对外可见','自己的程序始终读对了。只看这一段单线程程序，不能拿这个现象区分强序和弱序。',{visibleData:42,pending:[]},'visibility')
 ];
 else if(id==='message')changes=[
  f('先看起点：数据 0，还没准备好','此时 CPU 1 还没有读取。右侧的“未读”不是读到了 0。'),
  f('① CPU 0：先写数据 42','CPU 可以先记录写入，随后再让它对外可见。代码确实先写了数据，但此刻 CPU 1 还没看到这次变化。',{writtenData:42,pending:['数据 42：等待对方可见']}),
  f('② CPU 0：再写“准备好了”','代码的先后没有写反，但这两个不同地址的写入尚未建立发布顺序。',{writtenReady:true,pending:['数据 42：等待对方可见','准备好了：等待对方可见']}),
  f('③ 通知先被 CPU 1 看到','看中间：通知已经是“是”，数据仍是 0。弱序且没有同步时，允许这样的路径。',{visibleReady:true,pending:['数据 42：仍在等待']},'visibility'),
  f('④ CPU 1：读通知，得到“是”','它以为数据已经准备好。可“我读到了通知”本身，并没有补上缺少的顺序保证。',{readReady:true},'reader'),
  f('⑤ CPU 1：读数据，得到 0','问题就在这里：它收到了通知，却取到了旧数据。不是算错了 42，而是这次读取还没看到那个写入。',{readData:0},'reader'),
  f('⑥ 42 终于可见，但已经晚了','中间变成 42；右边那次读取仍是 0。后来的可见性变化，不会自动修改已经读回的值。',{visibleData:42,pending:[]},'visibility')
 ];
 else if(id==='fix')changes=[
  f('同样从数据 0 开始','这次双方按发布 / 获取规则交接数据。'),
  f('① CPU 0 写数据 42','仍然可以先暂存写入；同步规则并不要求每条指令都慢慢串行执行。',{writtenData:42,pending:['数据 42：等待发布']}),
  f('② 发布规则：通知不能抢到数据前面','发送端约束是“数据先于通知发布”。这里把规则单独画出来，不代表它一定是一条独立指令。',{pending:['数据 42：先发布','准备好了：受发布规则约束']},'rule'),
  f('③ 先让数据 42 可见','数据的发布顺序已经安排在通知之前。CPU 1 还没有读到通知。',{visibleData:42,pending:['准备好了：下一步发布']},'visibility'),
  f('④ 再发布“准备好了”','这时 CPU 1 若观察到这次通知，数据已经按发布规则排在它前面。',{writtenReady:true,visibleReady:true,pending:[]},'visibility'),
  f('⑤ CPU 1 按获取规则读到这次通知','接收端也配合：后续数据读取受获取约束。发送端和接收端的规则在这里接上。',{readReady:true},'reader'),
  f('⑥ CPU 1 读取数据，得到 42','这组条件下，刚才“通知为是、数据为 0”的结果被排除了。',{readData:42},'reader')
 ];
 else if(id==='dbar'){
  changes=[
   f('门前有两件事没完成','旧读和旧写都在 DBAR 0 之前。后面新的访存要等它们满足屏障要求。',{olderLoad:false,olderStore:false,gateOpen:false,younger:false,addDone:false},'gate'),
   f('CPU 可以先完成无关的加法','这个例子里的加法不访问内存，也没有相关依赖。DBAR 的数据访存约束，不等于要求整个 CPU 清空重来。',{addDone:true},'compute'),
   f('旧写完成了，还不能开门','前面的旧读仍未完成。仅仅等到一条写完成，不足以满足这里 DBAR 0 的条件。',{olderStore:true},'older'),
   f('旧读也完成了，门的条件满足','前面的读和写都满足完成要求，DBAR 0 后面的访存才被允许继续。',{olderLoad:true,gateOpen:true},'gate'),
   f('后面的访存获准执行','这是“按条件放行”。图中没有把全部缓存擦掉，也没有让独立加法重新算一次。',{younger:true},'younger')
  ];
 }else throw new Error('Unknown lesson');
 let state={...initial};
 return changes.map((frame,index)=>{state={...state,...frame};return {...state,index};});
}
