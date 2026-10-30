export const sources = {
 isa: ['LoongArch · DBAR / IBAR 与内存属性', 'https://loongson.github.io/LoongArch-Documentation/LoongArch-Vol1-EN.html'],
 intel: ['Intel · Software Developer’s Manuals', 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html'],
 arm: ['Arm · Message Passing、DMB、STLR / LDAR', 'https://learn.arm.com/learning-paths/servers-and-cloud-computing/memory_consistency/examples/'],
 armScope: ['Arm · 内存屏障的共享域与访问类型', 'https://support.arm.com/documentation/102336/0100/Limiting-the-scope-of-memory-barriers'],
 riscv: ['RISC-V · RVWMO Memory Consistency Model', 'https://docs.riscv.org/reference/isa/unpriv/rvwmo.html'],
 riscvFence: ['RISC-V · FENCE 与 acquire / release 解释', 'https://docs.riscv.org/reference/isa/unpriv/mm-eplan.html'],
 linux: ['Linux · Memory barriers', 'https://docs.kernel.org/core-api/wrappers/memory-barriers.html'],
 dma: ['Linux · DMA API HOWTO', 'https://docs.kernel.org/core-api/dma-api-howto.html'],
 io: ['Linux · Device I/O', 'https://docs.kernel.org/driver-api/device-io.html']
};
export const architectures = [
 {id:'loongarch',name:'LoongArch',model:'弱序',orderedStores:false,full:'DBAR 0',release:'DBAR 0；写 ready',acquire:'读 ready；DBAR 0',note:'采用普通可缓存共享内存。DBAR 0 是保守的完整数据屏障示例，实际编译器或内核可使用更精确的屏障。',refs:['isa']},
 {id:'x86',name:'x86-64',model:'TSO · 普通 WB 内存',orderedStores:true,full:'MFENCE',release:'MOV（并约束编译器）',acquire:'MOV（并约束编译器）',note:'仅讨论普通对齐 WB 内存访问，排除 WC、非暂存写等特殊访问。TSO 保持写写与读读顺序，仍允许不同地址的 Store→Load 重排效果。',refs:['intel']},
 {id:'aarch64',name:'AArch64',model:'弱序 · Normal 内存',orderedStores:false,full:'DMB ISH',release:'STLR',acquire:'LDAR',note:'CPU 间实验假设 Normal 可缓存内存，两个核位于同一 Inner Shareable 域。DMB 约束观察顺序；DSB 的完成约束更强，二者不能混称“刷流水线”。',refs:['arm','armScope']},
 {id:'riscv',name:'RISC-V · RVWMO',model:'弱序 · RVWMO',orderedStores:false,full:'FENCE RW,RW',release:'FENCE RW,W；store ready',acquire:'load ready；FENCE R,RW',note:'按默认 RVWMO 和普通主存建模，不启用 Ztso。FENCE RW,RW 针对主存读写；I/O 还要考虑 I/O 集合、PMA 和设备协议。FENCE.I 用于指令获取同步。',refs:['riscv','riscvFence']}
];
export const scenarios = [
 {id:'message',name:'多核：先写数据，再置标志',toggle:'加入 release / acquire',title:'看见 ready=1，能保证读到新数据吗？',scope:'初始 data=0、ready=0；不同地址的对齐普通共享内存；已约束编译器。机器级示意，普通 C/C++ 数据竞争不合法。',why:'缓存一致性主要解决同一地址的协调；跨地址的发布顺序还要靠内存模型与同步协议。弱序反例也可能源于接收端提前读 data，本图选取发送端可见顺序变化的一条路径。',fix:'C++：生产者写一次 payload，再对 ready 做 release store；消费者的 acquire load 读到对应的发布值后，才读 payload。payload 发布后不再修改。不要仅用 volatile 代替同步。',refs:['linux']},
 {id:'self',name:'单核：自己写，自己读',toggle:'加入数据屏障（此例不需要）',title:'还没对外可见，自己也能读到 42。',scope:'单线程、私有普通内存；没有其他 CPU、设备或中断上下文并发修改同一对象。',why:'地址相关性检查、存储转发等机制保持本线程语义。架构不要求写入先到 DRAM，随后才能读到它。强弱序不是“自己的指令会不会算错”。',fix:'这个私有内存例子不需要屏障。图中的待处理写入是概念模型，不断言某款 CPU 的具体缓冲结构或性能。',refs:['linux']},
 {id:'device',name:'单核 + 设备：发布 DMA 数据',toggle:'加入正确的 DMA 发布屏障',title:'只有一个 CPU，设备也能成为观察者。',scope:'一致性 DMA；data 与 ready 均为共享普通内存，非 MMIO；设备保证先读 ready 再读 data。编译器顺序已固定。',why:'单核不等于没有外部观察者。设备看到 ready 时，数据可能尚未按所需顺序发布。屏障必须覆盖设备所在的域；不能直接照搬只用于 CPU 之间的同步。',fix:'真实驱动使用平台 DMA API、dma_wmb 和相应的发布协议。AArch64 的 DMB ISH 不自动覆盖外部设备；RISC-V 要区分主存与 I/O。设备端的有序读取也是前提。',refs:['dma','linux']},
 {id:'sb',name:'多核：两个 CPU 都读到 0',toggle:'两端加入完整读写屏障',title:'x86 也可能出现“双零”。',scope:'初始 x=0、y=0；不同地址的普通可缓存内存。每个核先写自己的地址，再读另一个地址。',why:'本次无屏障轨迹中，两个写入仍未提供给对方，两个读取已经取得初始值。完整屏障排除双零，但不要求每次都得到双一。',fix:'两端都在写后、读前加入匹配范围的完整读写屏障。语言层的 release/acquire 并不普遍排除双零：都读到初始值时没有建立同步。具体 ISA 可能更强，例如 AArch64 STLR→LDAR 有额外 RCsc 排序；本实验开关使用完整屏障，不将不同指令映射混为一谈。',refs:['linux']},
 {id:'dma',name:'非一致性 DMA：屏障不是刷缓存',toggle:'使用正确 DMA 同步与所有权交接',title:'排好了顺序，脏缓存仍可能没被设备看见。',scope:'抽象的非一致性 DMA 平台，CPU 核间一致不代表设备一致。是否存在这种映射取决于平台，不由架构名称单独决定。',why:'内存排序与缓存维护解决不同问题。数据屏障本身不能代替把脏缓存交给设备所需的维护操作，也不能代替缓冲区所有权管理。',fix:'使用 dma_map_* / dma_sync_* / dma_unmap_* 等平台 DMA API。交出缓冲区后 CPU 不再修改。x86 的常见一致性 DMA 平台未必需要同样的缓存维护，但不能把这一平台特征推广到所有系统。',refs:['dma']},
 {id:'io',name:'设备 I/O：发出、到达、做完',toggle:'加入安全回读 + 完成状态确认',title:'写了 STOP，不能立刻认定 DMA 已停。',scope:'存在 posted MMIO 写的总线与设备；使用正确内存属性和 I/O accessor。回读寄存器须由平台指定且无副作用。',why:'CPU 写入返回、命令到达设备、设备完成停止，是不同的事件。某些平台提供更强保证，但驱动仍须遵守具体总线与设备协议。',fix:'正确发送 STOP，按平台要求做安全回读，再带超时轮询设备 STOPPED 状态，确认后才释放 DMA 缓冲区。屏障不会替设备完成任意命令。',refs:['io','linux']},
 {id:'dbar',name:'LoongArch：乱序 CPU 怎样守住 DBAR',toggle:'加入 DBAR 0',title:'乱序执行，也能追踪屏障前后的年龄。',scope:'本实验只针对 LoongArch DBAR 0。内部实现为概念示意，不是 3A6000 微架构实测；不把 DMB、FENCE 等直接替换成相同的完成语义。',why:'一种概念实现是依据 ROB / 访存队列年龄，追踪所有较老访存，包括尚未发射的操作，并等待所需完成确认。按序退休不等于 store 已完成对外发布。',fix:'DBAR 0 是数据屏障，IBAR 面向指令获取同步，缓存维护另有机制。它们都不能简单解释为“把整个流水线清空”。',refs:['isa']}
];
const event=(id,lane,lines,note,tone='normal',extra={})=>({id,lane,lines,note,tone,...extra});
export function buildTrace(id,archId='loongarch',sync=false){
 const s=scenarios.find(s=>s.id===id),a=architectures.find(a=>a.id===archId);
 if(!s||!a)throw new Error('Unknown scenario or architecture');
 if(id==='dbar'&&archId!=='loongarch')throw new Error('DBAR example is LoongArch-specific');
 let events=[],actors=[],outcome='',tone='good',code=[],resultAt=0;
 const publish=id==='message'||id==='device';
 if(publish){
  const device=id==='device',safe=sync||a.orderedStores;
  actors=[device?'CPU · 发布者':'CPU 0 · 发布者',device?'DMA 设备 · 观察者':'CPU 1 · 接收者'];
  events.push(event('write-data',0,['写 data=42','尚未对外可见'],'CPU 已执行数据写入，另一个观察者此刻仍可能只能看到 0。'));
  if(safe){
   if(sync)events.push(event('release',0,[device?'DMA 发布屏障':'release 发布约束',device?'覆盖设备所在域':a.release],device?'调用覆盖设备域的发布屏障，保证数据在旗标之前被观察到。':'发布操作约束此前数据访问；硬件实现依架构而异。','barrier'));
   events.push(event('data-visible',0,['data=42','先于 ready 发布'],'数据先按所需顺序对外可见。'));
   events.push(event('ready-visible',0,['写 ready=1','随后对外可见'],'旗标现在可以被观察者读到。'));
   events.push(event('read-ready',1,[!device&&sync?'acquire 读取 ready':'读取 ready','得到 1'],!device&&sync?'这次 acquire 读取到了对应 release 的值，从而建立同步。':'读取到了已经发布的 ready=1。','normal',{from:'ready-visible'}));
   if(sync&&!device)events.push(event('acquire',1,['后续读取受 acquire 约束',a.acquire],'后续 data 读取必须遵守 acquire 的顺序约束。此框解释语义，不代表每种架构都额外执行一条指令。','barrier'));
   events.push(event('read-data',1,['读取 data','得到 42'],'观察者得到此前发布的新数据 42。','good'));
   outcome=sync?'同步后：读到 ready=1，就能读到已发布的 data=42。':'此访问类型的默认排序排除了 ready=1、data=0。';
  }else{
   events.push(event('ready-visible',0,['写 ready=1','先对外可见'],'允许 ready 比较早的数据写入先被观察到。','risk'));
   events.push(event('read-ready',1,['读取 ready','得到 1'],'观察者已看到旗标为 1。','normal',{from:'ready-visible'}));
   events.push(event('read-data',1,['读取 data','仍得到 0'],'此时读取 data 仍可得到旧值 0。','risk'));
   events.push(event('data-visible',0,['data=42','稍后才可见'],'即使数据后来可见，刚才读取到的 0 也不会自动更正。'));
   outcome='允许的反例：ready=1，但读取 data 得到 0。';tone='risk';
  }
  resultAt=events.findIndex(e=>e.id==='read-data')+1;
  code=[[actors[0],`写 data=42\n${sync?(device?'DMA 发布屏障':a.release):'写 ready=1'}`+(sync&&device?'\n写 ready=1':'')],[actors[1],`${sync&&!device?a.acquire:'读 ready'}\n若 ready == 1，读 data`]];
 }
 if(id==='self'){
  actors=['CPU · 本线程','访存系统 · 外部可见性'];
  events=[event('store',0,['写 data=42','进入待处理写入'],'CPU 写入自己的数据。')];
  if(sync){events.push(event('barrier',0,['加入数据屏障',a.full],'此例不需要屏障；这里选取一种写入先发布、随后读取的合法路径。','barrier'),event('visible',1,['data=42','对外可见'],'写入已经对外可见。','normal',{from:'store'}),event('load',0,['随后读取 data','得到 42'],'本线程正确读到 42。','good',{from:'visible'}));}
  else events.push(event('load',0,['随后读取 data','可经存储转发得到 42'],'自己的读取可从待处理写入取得新值，外部尚未看到也不会让本线程读错。','good'),event('visible',1,['data=42','稍后对外可见'],'写入稍后提供给外部观察者。','normal',{from:'store'}));
  outcome='四种架构都必须维持本线程结果：r=42。';resultAt=events.findIndex(e=>e.id==='load')+1;code=[['同一线程',`data = 42\n${sync?a.full+'\n':''}r = data  // 必须为 42`]];
 }
 if(id==='sb'){
  actors=['CPU 0','CPU 1'];
  events=[event('write-x',0,['写 x=1','尚未提供给 CPU 1'],'CPU 0 的写暂未被对方观察到。'),event('write-y',1,['写 y=1','尚未提供给 CPU 0'],'CPU 1 的写暂未被对方观察到。')];
  if(sync){events.push(event('fence-0',0,[a.full,'约束写后读的顺序'],'CPU 0 的完整屏障约束 x 写入和后续 y 读取。','barrier'),event('x-visible',0,['x=1 对外可见','CPU 0 可以继续读 y'],'本次合法执行先让 x 写入可见。'),event('read-y',0,['读取 y','r0 = 0'],'y 写入尚未可见，CPU 0 仍可读到 0。'),event('fence-1',1,[a.full,'约束写后读的顺序'],'CPU 1 也必须遵守同样的写后读约束。','barrier'),event('y-visible',1,['y=1 对外可见','CPU 1 可以继续读 x'],'CPU 1 的 y 写入现在可见。'),event('read-x',1,['读取 x','r1 = 1'],'因为 x 已经发布，这条路径读到 1。','good',{from:'x-visible'}));outcome='双完整屏障排除双零；本次展示 r0=0、r1=1。';}
  else {events.push(event('read-y',0,['读取 y','r0 = 0'],'CPU 0 读取对方尚未发布的 y，得到 0。','risk'),event('read-x',1,['读取 x','r1 = 0'],'CPU 1 同样可读到尚未发布的 x=0。','risk'),event('x-visible',0,['x=1','之后才对外可见'],'读取结果已经产生，不会随之后的写入自动更新。'),event('y-visible',1,['y=1','之后才对外可见'],'两个写最终都可见，但先前仍可能产生双零。'));outcome='四种架构都允许这条无屏障轨迹：r0=0、r1=0。';tone='risk';}
  resultAt=events.findIndex(e=>e.id==='read-x')+1;code=[['CPU 0',`x = 1\n${sync?a.full+'\n':''}r0 = y`],['CPU 1',`y = 1\n${sync?a.full+'\n':''}r1 = x`]];
 }
 if(id==='dma'){
  actors=['CPU · 缓存','非一致性 DMA 设备'];
  events=[event('dirty',0,['写 buffer=42','最新值在脏缓存中'],'设备可访问的内存仍可能保留旧值 0。')];
  if(sync){events.push(event('dma-sync',0,['DMA map / sync','按平台维护缓存并交出所有权'],'DMA API 完成设备需要的同步；CPU 随后不再修改该缓冲区。','barrier'),event('ram',0,['设备可访问的内存','更新为 42'],'所需缓存维护已使设备能访问到新数据。'),event('start',0,['按平台协议','启动 DMA'],'使用正确的设备启动协议。'),event('read',1,['DMA 读取 buffer','得到 42'],'设备读到已同步的数据。','good',{from:'start'}));outcome='正确 DMA 同步后，设备取得 42。';}
  else {events.push(event('only-fence',0,['只执行排序屏障','没有执行缓存维护'],'即使按正确范围执行数据排序屏障，也不代表自动清理所有脏缓存。','risk'),event('start',0,['按平台协议','启动 DMA'],'命令的发送并没有补上缓存维护。'),event('read',1,['DMA 读取内存','仍可能得到 0'],'设备不参与一致性，可能只能读到旧内存值。','risk',{from:'start'}));outcome='允许的错误：排序屏障并未让设备取得脏缓存中的 42。';tone='risk';}
  resultAt=events.length;code=[['平台协议',sync?'写 buffer\nDMA map / sync for device\n交出所有权并启动 DMA':'写 buffer\n仅做排序屏障\n启动 DMA  // 可能仍读旧值']];
 }
 if(id==='io'){
  actors=['CPU · 驱动','桥 / 设备'];
  events=[event('stop',0,['发出 STOP 写入','CPU 端操作返回'],'CPU 端操作返回，不能单凭它证明设备已经停止。'),event('posted',1,['STOP 可能仍在途中','DMA 仍在运行'],'桥或互连可能缓冲 posted write。','normal',{from:'stop'})];
  if(!sync)events.push(event('free-early',0,['此时释放缓冲区','存在被继续 DMA 的风险'],'释放早于设备停止确认，可能发生在途 DMA 访问。','risk'));
  events.push(event('arrival',1,['设备收到 STOP','开始停止，仍可能有在途 DMA'],'到达设备也不等于设备完成停止。'));
  if(sync)events.push(event('readback',0,['安全回读返回','确认前面的写已到达'],'仅在平台规定的安全回读语义下确认到达；仍不能替代设备完成状态。','barrier',{from:'arrival'}));
  events.push(event('stopped',1,['设备完成停止','报告 STOPPED'],'设备按协议报告完成状态。'));
  if(sync)events.push(event('free',0,['观察到 STOPPED','此后才释放缓冲区'],'驱动带超时等待并观察到停止，随后才释放。','good',{from:'stopped'}));
  outcome=sync?'确认设备完成停止后，再释放缓冲区。':'风险路径：CPU 返回与设备停止之间仍有时间窗口。';tone=sync?'good':'risk';resultAt=sync?events.length:3;code=[['设备协议',sync?'write STOP\nread back safe register\npoll STOPPED with timeout\nrelease buffer':'write STOP\nrelease buffer  // 缺少停止确认']];
 }
 if(id==='dbar'){
  actors=['访存 / 执行单元','屏障与年轻访存'];
  events=[event('old',0,['旧 load A 尚未完成','旧 store B 也在处理中'],'年龄由程序顺序确定；旧操作即使尚未发射也必须被追踪。'),event('add',0,['独立 ADD','可以先执行完成'],'数据屏障不意味着清空所有独立计算。')];
  if(sync)events.push(event('wait',1,['DBAR 0 等待','追踪所有较老访存'],'屏障需要访存子系统的完成状态，不只是按序退休。','barrier'));
  else events.push(event('young',1,['无屏障：年轻 ready 写','允许先产生可见效果'],'弱序中可以出现年轻写先对外可见的执行。','risk'));
  events.push(event('store-done',0,['旧 store B 完成','旧 load A 仍未完成'],'较老访存之间也可以乱序完成。'),event('load-done',0,['旧 load A 完成','所有较老访存条件满足'],'最后一个旧访存满足架构要求的完成条件。'));
  if(sync)events.push(event('young',1,['DBAR 0 条件满足','后续访存按约束继续'],'后续访存现在可以按屏障要求继续。','good',{from:'load-done'}));
  outcome=sync?'DBAR 0 守住规定的访存关系，不是清空整条流水线。':'无屏障时，年轻访存可能先被观察到。';tone=sync?'good':'risk';resultAt=sync?events.length:3;code=[['程序顺序',`load A\nstore B\nadd  // 独立计算\n${sync?'DBAR 0\n':''}store ready=1`]];
 }
 return {scenario:s,arch:a,sync,actors,events,outcome,tone,code,resultAt};
}

export const components = [
 {id:'compiler',name:'语言 / 编译器',sub:'先确定程序语义',x:160,y:42,role:'把源代码转换成机器访问；编译器本身也可能重排、合并或消除访问。',guarantee:'由语言原子操作、锁或平台封装表达编译器必须保留的顺序。',limit:'CPU 的强内存序不能修复普通 C/C++ 数据竞争；volatile 也不等于跨核同步。',refs:['linux']},
 {id:'core',name:'CPU 执行 / 退休',sub:'年龄、依赖与精确状态',x:480,y:42,role:'前端与执行后端跟踪程序年龄和依赖，可以乱序执行并按架构规则提交状态。',guarantee:'维持本线程语义和架构规定；独立计算仍可提前执行。',limit:'按序退休不等于所有写都已对其他核或设备可见；较强序也不等于顺序执行。',refs:['isa','linux']},
 {id:'lsu',name:'访存队列 / 写缓冲',sub:'访问跟踪与存储转发',x:800,y:42,role:'概念上跟踪未完成访问、检查地址依赖、提供存储转发，并参与屏障约束。',guarantee:'同地址相关性和同步约束需要得到遵守；具体阻塞或重放机制因实现不同。',limit:'写缓冲中的值可先被本核读取；其他地址的读可能先于旧写对外可见。',refs:['isa','intel','linux']},
 {id:'cache',name:'缓存 / 一致性',sub:'同地址协调',x:160,y:158,role:'缓存数据，并通过平台一致性机制协调其他参与者对同一位置的访问。',guarantee:'在一致性域内维护缓存一致性；并配合处理器满足内存模型。',limit:'一致性不能单独保证 data 与 ready 两个地址的发布顺序，也不必然覆盖 DMA。',refs:['linux','dma']},
 {id:'fabric',name:'互连 / 一致性域',sub:'传播与排序范围',x:480,y:158,role:'在核、缓存、内存和 I/O 路径之间传播事务；具体系统可能采用不同拓扑。',guarantee:'共同实现架构内存序，屏障必须覆盖对应访问类型和观察者所在的域。',limit:'不能把每次架构重排都归因于互连真的交换了包；外部可见顺序才是本实验重点。',refs:['armScope','riscv','linux']},
 {id:'bridge',name:'I/O 桥 / MMIO',sub:'寄存器属性与 posted 写',x:800,y:158,role:'按平台属性与 I/O 访问协议把寄存器事务送到设备；写可能被缓冲。',guarantee:'正确的内存属性、I/O accessor 与总线规则共同决定排序及完成点。',limit:'WB / Normal 主存保证不能直接套到 MMIO；CPU 写返回不等于设备收到或做完。',refs:['io','isa','riscvFence']},
 {id:'peer',name:'其他 CPU',sub:'接收方也要配合',x:160,y:274,role:'读取共享数据，可能具有自己的乱序执行、访存队列与缓存。',guarantee:'接收方 acquire 读到对应 release 的发布值后，后续数据读取受到同步约束。',limit:'只在发送方加屏障通常不足以约束弱序接收方；单边同步不等于完整协议。',refs:['linux','arm','riscvFence']},
 {id:'memory',name:'内存 / DMA 缓冲区',sub:'位置与所有权',x:480,y:274,role:'保存可供设备或 CPU 访问的数据；CPU 可见的最新版本也可能仍驻留于缓存。',guarantee:'非一致性 DMA 通过平台 API 做必要缓存维护并交接缓冲区所有权。',limit:'对外可见不等于一定写回 DRAM；CPU 交出 DMA 缓冲区后不能随意继续修改。',refs:['dma','linux']},
 {id:'device',name:'设备 / DMA 引擎',sub:'读取、执行与状态反馈',x:800,y:274,role:'观察发布信息、发起 DMA、执行命令并反馈完成状态，是 CPU 以外的参与者。',guarantee:'设备读取顺序、缓存一致性能力及完成语义由具体设备和平台协议约定。',limit:'CPU 屏障不自动命令设备刷新缓存、停止 DMA 或完成工作。',refs:['dma','io']}
];
export const connections = [
 {from:'compiler',to:'core',label:'生成访问',kind:'instruction'}, {from:'core',to:'lsu',label:'发射 / 跟踪',kind:'instruction'},
 {from:'lsu',to:'cache',label:'普通内存路径'}, {from:'lsu',to:'fabric',label:'I/O 路径',branch:'io'},
 {from:'cache',to:'fabric',label:'一致性传播'}, {from:'fabric',to:'bridge',label:'I/O 事务'},
 {from:'fabric',to:'peer',label:'跨核观察'}, {from:'fabric',to:'memory',label:'内存访问'},
 {from:'bridge',to:'device',label:'命令 / 回读'}, {from:'memory',to:'device',label:'DMA（经互连）'}
];
export function operationContext(trace,index){
 const e=trace.events[index];if(!e)throw new Error('Unknown event');
 const id=trace.scenario.id;let nodes,contract,difference;
 if(id==='io'){
  nodes=['compiler','core','lsu','fabric','bridge','device'];
  contract='I/O 属性与 accessor 保证所需访问顺序；安全回读按平台语义确认到达；设备状态确认工作完成。';
  difference='强弱主存序都不能替代设备完成协议。四种架构在这个例子中共享同一条平台约束，不能靠换 CPU 名称消除 posted 写。';
 }else if(id==='dma'){
  nodes=['compiler','core','lsu','cache','fabric','memory','device'];
  contract=trace.sync?'DMA API 完成所需缓存维护，并将缓冲区所有权交给设备。':'只做数据排序；缺少非一致性 DMA 所需缓存维护，设备仍可能读到旧内存。';
  difference='是否一致性 DMA 是平台能力，不能仅由 x86、LoongArch、AArch64 或 RISC-V 名称判断。强序也不能代替缓存维护。';
 }else if(id==='dbar'){
  nodes=e.id==='add'?['compiler','core']:['compiler','core','lsu','cache','fabric'];
  contract=trace.sync?'DBAR 0 依据程序年龄约束旧访存的完成与后续访存；LSU / 缓存 / 互连参与提供完成状态。':'没有屏障建立这组前后访存的强制关系，独立操作可以先完成。';
  difference='这是 LoongArch DBAR 0 的概念协作图，不断言具体 CPU 如何实现，也不将 AArch64 DMB / RISC-V FENCE 当成相同的完成屏障。';
 }else if(id==='self'){
  nodes=e.id==='visible'?['lsu','cache','fabric']:['compiler','core','lsu','cache'];
  contract='地址相关性与存储转发等机制维持本线程写后读的结果；不需要先把值送到 DRAM。';
  difference='四种架构都要求本线程读到自己的新值 42；强弱序不是本线程语义是否成立的区别。';
 }else{
  const read=e.id.startsWith('read')||e.id==='acquire';
  const visible=e.id.includes('visible');
  nodes=read?['compiler','core','lsu','cache','fabric',id==='device'?'device':'peer']:visible?['lsu','cache','fabric',id==='device'?'device':'peer']:['compiler','core','lsu','cache'];
  if(id==='device')nodes=[...new Set([...nodes,'fabric','memory','device'])];
  if(id==='sb'){
   contract=trace.sync?'两端写后读前的完整屏障，共同排除双零；屏障作用范围须覆盖两个核。':'写尚未供对方观察时，读取另一个地址可先取得初始值。';
   difference='x86 TSO 仍允许不同地址的 Store→Load 重排效果；LoongArch、AArch64、RVWMO 也允许。这个测试中四者都需要适当同步。';
  }else{
   contract=trace.sync?(id==='device'?'CPU 发布屏障覆盖设备域，设备保证先读 ready 再读 data。':'发送端 release 与接收端 acquire 配对；acquire 必须读到对应 release 的值。'):'编译器顺序已固定；硬件是否保持跨地址发布顺序，取决于访问类型与架构。';
   difference=trace.arch.orderedStores?'x86 普通 WB 内存默认保持本例所需的写写 / 读读顺序；仍不可据此省略语言层同步。':'LoongArch、AArch64 Normal、RISC-V RVWMO 都可能出现本例的旧数据反例；需要显式同步。它们的全部模型并不相同。';
  }
 }
 return {nodes,contract,difference,event:e};
}

export function orderingChain(trace){
 const id=trace.scenario.id,sync=trace.sync;
 if(id==='self')return ['本线程语义','地址依赖 / 存储转发','自己读到 42'];
 if(id==='message')return sync?['语言原子 / 编译器约束','发送端 release','读到对应发布值','接收端 acquire']:trace.arch.orderedStores?['编译器已约束','WB 默认写写 / 读读有序','本例排除旧值']:['编译器已约束','跨地址发布缺少同步','允许旧数据反例'];
 if(id==='device')return sync?['CPU 发布屏障','覆盖设备所在域','设备先旗标后数据']:trace.arch.orderedStores?['普通 WB 写写有序','设备读取已约束','本例排除旧值']:['编译器已约束','缺少设备域发布排序','允许旧值'];
 if(id==='sb')return sync?['CPU 0 完整读写屏障','CPU 1 完整读写屏障','共同排除双零']:['两个写尚未可见','不同地址的读先完成','四种架构均允许双零'];
 if(id==='dma')return sync?['平台缓存维护','交出缓冲区所有权','设备读取新值']:['仅保证访存顺序','缺少缓存维护','设备仍可读到旧值'];
 if(id==='io')return sync?['正确 I/O accessor','安全回读确认到达','STOPPED 确认做完','此后才释放']:['CPU 写入返回','尚未确认设备停止','过早释放有风险'];
 return sync?['追踪程序年龄','旧访存完成确认','DBAR 0 后访存继续']:['可识别程序年龄','未建立屏障关系','年轻写可能先可见'];
}
