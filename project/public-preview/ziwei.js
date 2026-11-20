import { getBirthDateError } from './content.js?v=0.9.0';

const READING_TOPICS = {
  官祿: { label: '事業', hint: '我點做事', invite: '同一份工，有人鍾意帶頭，有人鍾意執好細節。你最享受邊一樣？我哋由官祿宮睇起。', lead: '諗返最近一次有人臨時搵你幫手，你最先答咗邊句？', question: '下次有人話「好趕」，你想即刻接手，定先問邊樣可以遲啲交？' },
  夫妻: { label: '愛情', hint: '我點同人相處', invite: '有句說話未諗好點開口？唔使講對方係邊個，我哋由夫妻宮睇親密關係入面嘅相處方式。', lead: '試諗一幕：如果你想有人聽你講完，會點開口？有冇伴侶都可以睇。', question: '如果可以補返一句，邊句最接近你嗰刻真正想講嘅嘢？' },
  田宅: { label: '家庭', hint: '我想點樣安頓', invite: '返到屋企，邊件小事最令你覺得自在？由田宅宮講起，睇吓你重視點樣嘅生活空間。', lead: '由返到屋企嗰一刻諗起：邊件小事最令你放鬆，邊件你成日就住其他人？', question: '今晚返到屋企，有邊件小事你想照自己意思做一次？' },
  財帛: { label: '財運', hint: '我點用手上資源', invite: '有筆錢可以自己安排，你會留起，定用喺最在意嗰件事？由財帛宮睇你點分配資源。', lead: '試拎最近一筆你有猶豫過嘅開支做例，諗返落決定前你最在意乜。', question: '下次遇到同樣一筆數，你想保留咩預算，又想留幾多畀自己自由用？' },
  命宮: { label: '未來方向', hint: '我下一步想點行', invite: '眼前有幾條路，邊條值得先試一小步？我哋由命宮睇你慣常點揀，唔替你定去向。', lead: '諗一件你最近未揀定嘅事，對照下自己通常點樣踏出第一步。', question: '如果只試一個星期，邊一小步可以幫你睇清楚仲想唔想繼續？' }
};

// A scene is an invitation to compare with lived experience, not a finding about the visitor.
const STAR_READINGS = {
  紫微: { theme:'定方向',
    官祿:'開完會冇人拍板，你可能會先定一個方向，等大家有路行。留意散會之後，係咪連本來可以分出去嘅事都返到你手。',
    夫妻:'兩個人揀去邊，你可能習慣提早訂好位。係對方鍾意你安排，定係你哋一直冇問過大家想點？',
    田宅:'家人聚餐要夾時間，你可能好快就整好一張名單。試留一件事畀另一個人話事，睇下晚餐仲係咪一樣順。',
    財帛:'遇到一筆要一齊用嘅錢，你可能想先定好用途。留意最後個安排，有冇連提出唔同意見嘅人都照顧到。',
    命宮:'面前幾條路都行得，你可能最想揀嗰條可以自己話事嘅。諗清楚你想決定嘅係方向，定係連每個細節都要自己管。' },
  天機: { theme:'搵做法',
    官祿:'份工一轉要求，你可能好快諗到第二、第三個做法。如果草稿改咗幾次仲未交，可能差嘅唔係主意，而係一句「咁就夠」。',
    夫妻:'收到一個好短嘅回覆，腦入面可能即刻浮起幾種解釋。與其估邊個啱，不如問返對方嗰句想講乜。',
    田宅:'屋企有樣嘢唔順手，你可能即刻諗到點調位。不妨先問成日用嗰件嘢嘅人，最麻煩係邊一步。',
    財帛:'想買一樣嘢，你可能開幾頁慢慢比。若果越睇越難揀，返去睇最初想用佢解決邊個問題，未必需要再搵多十款。',
    命宮:'新線索一出現，你可能又想改計劃。留意今次係真係多咗重要資料，定純粹想等到再穩陣啲先開始。' },
  太陽: { theme:'主動幫一把',
    官祿:'有人卡住，你可能第一個行埋去幫。若果次次都幫到收工，不如先問佢係想你示範一次，定替佢做晒。',
    夫妻:'對方講今日好攰，你可能好快幫佢諗辦法。有時最啱用嘅幫忙，反而係問一句：「想我聽，定一齊諗？」',
    田宅:'屋企多嘢做，你可能唔出聲就執多兩手。留意呢個係今次自願幫手，定係大家已經當咗你會做。',
    財帛:'夾份送禮，你可能想出多啲等大家方便。落實之前對一對自己個數，慷慨同勉強唔一定要一齊出現。',
    命宮:'見到有人等你出手，件事可能突然變得好值得做。試想像冇人等你幫忙嗰日，你自己又最想做乜。' },
  武曲: { theme:'動手落實',
    官祿:'有人臨收工話「好急」，你可能已經覆咗「我嚟」，先發現原本嗰份都係今日交。你想幫手，同你手上仲有幾多時間，係兩件事。',
    夫妻:'屋企有嘢壞咗，你可能當晚就整好，當係一句關心。如果對方仲想傾耐啲，佢要嘅可能唔係另一個解決方法。',
    田宅:'屋企要執，你可能捲起衫袖就做，做到一半先發現得自己一個。不妨開頭就問清楚，邊個洗碗、邊個收枱。',
    財帛:'見到銀碼未對清，你可能寧願逐項計過先安心。睇返最近一筆，邊部分真係要計準，邊部分只要預個上限就夠？',
    命宮:'同坐低諗相比，你可能更鍾意落手試一次。若果揀唔落去，試分清楚：你係唔想行嗰條路，定只係唔知第一步做乜。' },
  天同: { theme:'留住舒服',
    官祿:'同事問你接唔接多件事，你可能怕大家尷尬，於是話「冇問題」。如果之後連午飯都要趕，嗰句答應仲合唔合你心意？',
    夫妻:'大家唔同意嗰陣，你可能會先講笑，等氣氛鬆一鬆。如果笑完仍然介意，遲啲搵個舒服嘅時候講返都得。',
    田宅:'屋企人問食乜，你可能順口講「是但」。一次半次係隨和；如果成個禮拜都冇食過自己想食嗰樣，今晚可以講一個菜名。',
    財帛:'忙完一日，買杯鍾意嘅飲品可能係你畀自己嘅休息。留意邊次真係享受，邊次其實只係想早十分鐘收工。',
    命宮:'有個做慣嘅選擇擺喺面前，舒服未必等於停滯。可以問吓自己：休息完，我仲想留喺度，定有件事想試？' },
  廉貞: { theme:'把界線講清楚',
    官祿:'兩個同事接同一類差事，規矩卻唔一樣，你可能會特別在意。講出邊一步唔一致，通常比估邊個偏幫邊個容易傾。',
    夫妻:'有句玩笑聽落唔舒服，你可能要過一陣先知自己介意乜。講返嗰句說話，比替對方定性更容易畀人聽得明。',
    田宅:'屋企人未問就入房，介意嘅可能唔係道門，而係可唔可以先敲一敲。講一條做得到嘅約定，大家先知道點尊重你。',
    財帛:'同朋友夾錢，份額明明唔大，你可能都想講清楚。你在意嘅未必係嗰幾蚊，而係大家用唔用同一個規矩。',
    命宮:'有條捷徑好快，但做法同你重視嘅嘢唔夾，你可能寧願慢啲。分清楚邊條線唔想過，其他條件就有得傾。' },
  天府: { theme:'留有餘地',
    官祿:'接新差事之前，你可能先望一望人手同日程。嗰下停頓唔一定係唔肯做，可能係想知邊個頂得住原有嗰攤。',
    夫妻:'關係入面，你可能鍾意有啲約定唔使次次再問，例如星期日一齊食飯。不妨間中問吓：大家仲係享受，定只係照做？',
    田宅:'櫃桶入面留定一份後備，可能令你住得踏實。今次執屋可以分開：邊樣真係會用，邊樣留低只因未諗好點處理。',
    財帛:'有筆新開支，你可能先留起日常要用嗰份，先諗剩低點用。睇返你留嘅餘額，有冇顧到一樣真心想做嘅事。',
    命宮:'揀一條新路之前，你可能想保留一個退路。若果退路已經喺度，下一個等緊嘅條件係必要，定係錦上添花？' },
  太陰: { theme:'留意細微變化',
    官祿:'開會時你可能留意到，有人本來想講嘢，最後冇出聲。散會私下問一句，會比替佢估原因實在。',
    夫妻:'對方今日覆少咗一句，你可能比平日更留神。先問「今日過成點？」可以畀對方講，亦唔使你自己估晒。',
    田宅:'返到屋企想靜一陣，你可能見大家忙，又起身幫手。如果係咁，試吓早少少講：「我想坐十分鐘，一陣再一齊執。」',
    財帛:'有啲開支細到唔覺眼，但加埋可能佔咗你原本想留低嗰份。試揀一個星期睇，唔使為每一蚊責怪自己。',
    命宮:'一個決定喺人多時聽落好合理，安靜落嚟，你可能有第二種感覺。不如記低令你遲疑嘅嗰個細節，再返去問清楚。' },
  貪狼: { theme:'試新嘢',
    官祿:'同事拋出新點子，你可能即刻想試，手上舊嗰件又唔想放低。如果兩件都開咗頭，邊件試完半個鐘，你仲想做落去？',
    夫妻:'一齊試新地方可能特別有話題；但冇節目嗰晚，又唔代表冇嘢可講。留意你掛住嘅係嗰次新鮮感，定係同邊個一齊。',
    田宅:'見到一個新佈置，你可能想即刻搬吓張枱。試擺一日，睇吓屋企人同自己用落順唔順手，先決定留唔留。',
    財帛:'打開購物籃，可能一眼中意咗幾樣。留到聽朝再望，邊樣你仲講得出會喺邊度用？',
    命宮:'同一晚報幾堂興趣班可能好過癮，但時間未必夠晒。不如先試一堂，留意完咗之後你仲想唔想返去。' },
  巨門: { theme:'問到明白',
    官祿:'收到一句「執靚啲」，你可能想追問到有個實例先開工。與其一路估，不如請對方揀一版，指畀你睇邊度未啱。',
    夫妻:'同一個字，兩個人可能聽出唔同意思。若果你哋兜咗幾個圈都傾唔埋，可以先問：「你講嘅係頭先嗰件事？」',
    田宅:'屋企傾分工，大家口中嘅「幫手」未必係同一樣嘢。不妨逐件講明係買餸、煮飯定洗碗，睇吓仲有冇爭拗。',
    財帛:'睇一張收據，如果銀碼同預期唔同，你可能會問個明白。逐項對返約定，唔使一開始就假設邊個計錯。',
    命宮:'聽到一個好肯定嘅建議，你可能反而多咗疑問。試揀出一條真係會改變你決定嘅問題，先搵嗰個答案。' },
  天相: { theme:'照顧分工',
    官祿:'兩邊要嘅嘢唔一樣，你可能自然做咗中間人。下次傳話前先問：呢個決定係咪應該由佢哋直接傾？',
    夫妻:'揀地方時，你可能好快就講得出對方鍾意乜。試喺嗰句之後加半句「我今日就想……」，兩個人先真係有得揀。',
    田宅:'想家人分工公平，你可能會睇邊個做多咗，卻冇計自己安排時間嗰份工。傾分工嗰陣，記得將呢件事都擺上枱。',
    財帛:'夾一餐飯，平均分最易計，未必人人都覺得公平。你可能想顧晒大家；最好落單前先問大家點分。',
    命宮:'大家有唔同意見時，你可能好快搵到一個人人接受嘅方法。留意嗰個方法入面，有冇計埋你自己想要嘅嘢。' },
  天梁: { theme:'照顧與承擔',
    官祿:'新人問多兩句，你可能索性代佢做埋。若果想佢下次自己識做，今次有邊一步可以留返畀佢試？',
    夫妻:'見到對方為難，你可能第一時間想替佢擋開。問清楚佢想你陪住定幫手決定，可以少一份好心做多咗。',
    田宅:'家人一遇到麻煩就搵你，你可能慣咗先接電話再諗自己得唔得閒。今次可以先講你做到邊一步，唔使一口應承到底。',
    財帛:'有人開口想你幫補，你可能先諗對方點算。答之前留一晚，睇清你願意幫幾多，同自己實際負擔到幾多。',
    命宮:'諗下一步時，你可能由「邊個需要我」開始。試將「我想點過呢一日」都寫低，兩樣可以有唔同答案。' },
  七殺: { theme:'當機立斷',
    官祿:'限期逼近，你可能寧願先落一個決定，好過成班人繼續等。開工前確認邊步可以改、邊步改唔返，快得嚟會踏實啲。',
    夫妻:'一有分歧，你可能想即晚講出個決定；對方可能仲未諗好。不如約實幾時再傾，停一停唔等於避開。',
    田宅:'屋企一亂，你可能即刻清走一批嘢。揀走自己嗰份可以好爽快；到共用嘅物件，問多一聲先落手。',
    財帛:'見到限時優惠，你可能想即刻拍板。試問自己：如果冇個倒數，我仲會唔會覺得呢樣嘢值得？',
    命宮:'一條路行唔通，你可能寧願轉彎，都唔想原地等。諗一個最細、改得返嘅決定先試，唔使今日押晒落去。' },
  破軍: { theme:'試另一套做法',
    官祿:'舊表格越填越慢，你可能想索性重做。先揀最阻時間嗰一欄改，試完先知要唔要成份換晒。',
    夫妻:'同一件事又拗撬，你可能想徹底換個相處方式。不如先改一個開場白，睇下今次係咪傾到平時傾唔到嘅嘢。',
    田宅:'如果一返屋企就喺門口搵鎖匙，你可能想成個玄關重新執過。今個星期先換個放鎖匙嘅位，用得順先再郁其他。',
    財帛:'一個月超咗預算，你可能想將成套計法推倒重來。先搵出最唔合用嗰一項，其他幫到手嘅做法唔使一齊掉。',
    命宮:'想重新開始嗰陣，成套換晒可能最有感覺。試講得出邊一樣真係唔再啱用，亦講一樣你想帶埋行落去嘅嘢。' }
};

// Questions choose a conversation, never the palace or its stars.
// Each entry: words to recognise, first answer, reflection, next step, perspective.
const careerPrompts = {
  '升職': [/升職|升遷|晉升|職級|\bpromotions?\b/i,
    '想傾升職，可以咁開口：「如果我想行到下一級，仲要做到邊樣？」',
    '有冇一件事，以前要人帶住做，而家你已經可以自己跟到尾？',
    '見上司前，寫低嗰件事：你負責邊一步，做完有咩唔同。帶住呢個例子去傾。',
    '問清楚下一級要負咩責任，唔等於要人即刻畀你答覆。升唔升，唔係張盤話事。'],
  '待遇': [/加薪|加人工|人工(?!智能)|調薪|薪酬|\b(?:pay rise|pay raise|salary|raise)\b/i,
    '想傾待遇，可以先約個時間：「我想對一對而家份工嘅職責，同埋薪酬點樣檢討。」',
    '有邊項責任係入職嗰陣未需要做，而家由你跟？',
    '揀一項新增嘅責任，寫低一個做完嘅例子，傾待遇時就由嗰度講起。',
    '講薪酬可以講具體工作，唔需要將自己同同事比高低。'],
  '工作先後': [/先後|優先|死線|限期|交期|先做邊[件份樣項]|做邊[件份樣項]先|撞埋|太忙|做唔切|工作量|\b(?:deadlines?|workload)\b/i,
    '先問清楚各自幾點要交。同樣急，就先做有人等緊接手嗰份。',
    '如果今日只交到初稿，邊個收到已經可以開工？',
    '揀一位等緊你嘅人，問：「你最遲幾點要初稿，先趕得切做下一步？」',
    '幾件事都話急，唔一定要靠自己估。問清楚邊個等緊，再排一次都未遲。'],
  '加班安排': [/加班(?!費)|超時工作|準時[收放]工|\b(?:OT|overtime)\b/i,
    '傾加班安排，可以先講收工前做得完邊份，再同上司揀邊份押後。',
    '臨收工多一件事，係真係今晚要交，定只係未講幾時要？',
    '下次有急件，可以試一句：「我今日仲夠時間做好一份，你想我先交邊份？」',
    '講清楚時間唔等於唔幫手。你可以應承做到嗰部分，唔使一次過應承晒。'],
  '見工': [/見工|面試|求職|搵工|\binterviews?\b/i,
    '準備面試唔使背晒啲答案。先揀一件你處理過嘅難題，講清楚自己做咗乜。',
    '如果對方只聽得切一個例子，邊件事最貼近份工要做嘅嘢？',
    '試用半分鐘講一次：「當時要解決乜、我做咗乜、結果點。」',
    '份工啱唔啱，除咗對方揀你，亦要睇你想唔想日日做嗰啲事。'],
  '轉工': [/轉工|轉行|換工|離職|辭職|轉職|\bcareer change\b/i,
    '諗緊轉唔轉，唔使今日決定。先睇一份招聘廣告：新工會唔會多啲你想做嘅事？',
    '如果而家份工可以改一樣安排，你仲有幾想走？',
    '揀一份你有興趣嘅工，圈一項想做多啲嘅工作，同一項要問清楚嘅安排。',
    '想換嘅有時係工作內容，有時係返工方式；兩樣唔一定要用同一個決定解決。'],
  '分工交接': [/分工|交接|交棒|合作|分(?:清(?:楚)?|返|配)(?:邊個|大家|各自|工作|職責|任務)|邊個(?:負責|跟)|各自負責|\b(?:teamwork|handoff|team)\b/i,
    '想講清楚分工，可以先問：「我跟到邊一步，之後邊個接手？」',
    '兩個人講「做完」，一個指交初稿，另一個指交定稿。你哋要交嘅係邊份？',
    '下次交接試一句：「我整理好資料就畀你，你接住做初稿，咁分啱唔啱？」',
    '問清楚唔等於計較。大家講明點交手，就唔使靠估。'],
  '工作溝通': [/溝通|聽意見|收意見|意見唔同|意見不合|俾意見/,
    '可以由一件具體嘅事開口：「頭先嗰個安排，我理解係咁。你嗰邊點睇？」',
    '你最想對方知道嘅，係發生咗乜，定係下次想點配合？',
    '下次傾之前，揀一句自己真係講得出口嘅說話，留返時間聽埋對方嗰句。',
    '問返對方點理解，唔代表要同意晒；至少可以唔使估。'],
  '進修': [/想學|學咩|學邊樣|學習|進修|報讀|讀邊科|報班|技能|成長|\b(?:skills?|learn|training)\b/i,
    '想知進修有冇用，先揀工作入面一件想自己做到嘅事，搵個細例試做一次。',
    '嗰一步最欠嘅係知點做、有人示範，定係搵時間練習？',
    '睇課程之前，寫低一句：「學完，我要可以自己做到＿＿。」再對課程有冇教嗰一步。',
    '未揀到邊科唔緊要，知道想用喺邊度，比即刻報名更有用。'],
  '接單創業': [/創業|接單|生意|客源|\bfreelanc(?:e|ing)\b/i,
    '想試自己接單，可以先搵一位有需要嘅人，問清楚對方想收到咩成品。',
    '如果只做一單，你最想確認有冇人需要，定係自己夠唔夠時間做？',
    '試問一句：「如果我只做最有用嗰部分，你想我先交咩畀你？」',
    '有人有興趣，同埋你有時間交到貨，係兩個唔同問題。可以分開試。']
};
const generalCareerPrompt = [null,
  '冇特別問題都得。我哋先翻開官祿宮，睇吓工作嗰格。',
  '接到一件新差事，你通常先問想要咩結果，定係先試做一小步？',
  '下次開工前，試用一句講清楚：「我做到邊一步，就可以交畀下一位？」',
  '揀一幕你認得嘅日常就夠。唔似你嘅地方，唔使夾硬對號入座。'];

const lovePrompts = {
  '講出心意': [/表白|告白|示愛|曖昧|講出.{0,4}心意|鍾唔鍾意|鐘唔鐘意|喜不喜歡|鍾意我|鐘意我|喜歡我|對我有冇意思|對方.{0,4}心意|有冇機會一齊/,
    '想講心意，可以由自己講起：「我想再認識你多啲，你想唔想？」然後留位畀對方答。',
    '你想對方知道你有好感，定係想邀請對方做一件事？兩樣唔一定要同一次講。',
    '寫低一句「我想……」嘅說話，讀一次。唔似平時把聲就改，唔使急住送出。',
    '有好感係你可以表達嘅事。對方點諗，要由對方講，唔係由夫妻宮代答。'],
  '見面安排': [/想見多|見多[啲點些]|見少面|見面.{0,4}(?:幾密|幾耐)|約會|幾時(?:得閒)?見|約(?:佢|對方).{0,4}(?:見|食飯)|約時間見|見面時間/,
    '想見多啲，可以先約實一次，唔使一開口就傾晒以後要見幾密。',
    '你最想要嘅係見多一日，定係有一餐飯可以坐定慢慢傾？',
    '如果雙方都想見，可以咁問：「我想同你一齊食餐飯。今個星期邊晚你得閒？」',
    '今次可以只傾下一次幾時見。對方唔方便，唔代表你要即刻替呢段關係落結論。'],
  '相處界線': [/私人空間|個人空間|多啲空間|留.{0,4}空間|獨處|自己(?:一個|靜|嘅時間)|想靜|界線|界限|距離|慢慢嚟|慢啲|太黐|太痴|太黏/,
    '想留啲時間畀自己，可以咁講：「今晚我想自己靜吓，聽日再傾好唔好？」',
    '你想留返畀自己嘅，係一個夜晚、一段唔睇電話嘅時間，定係一件未想講嘅事？',
    '揀一個你真係做得到嘅安排，將「畀啲空間我」改成一句具體嘅說話。',
    '講自己需要幾多空間，唔等於話對方做錯。你亦可以聽聽對方覺得點樣先舒服。'],
  '聯絡節奏': [/已讀|未讀|唔覆|未覆|遲覆|冇覆|無覆|覆得慢|秒回|覆機|訊息|信息|短訊|消息|聯絡|聯繫|幾耐覆|回覆/,
    '隔咗一陣未覆，未必知道原因。唔使追住再問；有機會傾時，可以問：「你通常幾時方便傾偈？」',
    '如果唔睇覆得快定慢，你最想交流嘅係邊件事？',
    '下次方便傾偈時，試用一句講你鍾意點聯絡，再聽對方想點；唔使而家補發訊息。',
    '有人鍾意即時傾，有人想得閒先慢慢答。單靠一個「已讀」，分唔到係邊一種。'],
  '傾返分歧': [/嗌交|鬧交|嘈交|拗撬|冷戰|爭執|吵架|誤會|鬧翻|道歉|和好|分歧|意見唔同/,
    '想傾返一次拗撬，唔使重講成晚。等大家都願意傾，先揀一句你想講清楚嘅說話。',
    '如果今次只講一幕，你最想對方聽明邊一刻？',
    '喺紙上補完呢句：「頭先講到＿＿，我其實想講＿＿。」先留畀自己睇。',
    '先聽明一句，唔代表要同意晒。未準備好，亦可以遲啲先傾。'],
  '認識新朋友': [/單身|識新(?:人|朋友|對象)|認識.{0,3}(?:新朋友|對象)|識人|拍拖機會|幾時.{0,5}(?:遇到|拍拖)|桃花|脫單|正緣/,
    '想認識人，可以由自己本身想去嘅活動開始。唔使將第一次見面當成要搵到伴侶。',
    '有咩活動就算未識到新朋友，你自己都想去？',
    '揀一樣你本身鍾意嘅活動，睇吓下次幾時有場；去唔去可以遲啲先決定。',
    '夫妻宮係個傳統宮名，唔代表你要拍拖，亦唔會話到你幾時遇到邊個。'],
  '分開之後': [/分手|分開|失戀|復合|前度|前任|放低舊情/,
    '諗緊分開定重新開始，可以先寫低：你想念嘅係邊一樣，又有邊一樣唔想重演？',
    '如果唔使今日作決定，你最想留啲時間畀自己諗清楚乜？',
    '開張只畀自己睇嘅便條，寫一句「下段相處，我想保留＿＿」。唔需要傳畀任何人。',
    '想念一個人同要唔要再一齊，係兩件事。張盤唔會替任何一方答應復合。'],
  '講出需要': [/溝通|開口|講需要|傾心事|相處|傾偈/,
    '如果有句說話唔知點開口，試由一件小事講起：「頭先嗰刻，我其實想……」',
    '嗰次你想要嘅，係有人聽你講完，定係一齊諗辦法？',
    '揀一件想講嘅小事，試寫「我想你先聽我講完」或者一句更似你嘅講法。',
    '講自己想點，比替對方估原因容易。你可以按自己節奏，揀講幾多。'],
  '先顧安全': [/(?:恐嚇|威脅|跟蹤|打我|打咗我|唔畀我走|唔俾我走|逼我見面)/,
    '如果你覺得唔安全，唔需要單獨見面或者即刻回覆。先去一個安全嘅地方，搵信得過嘅人陪你。',
    '而家邊個係你可以安心聯絡嘅人？唔使將事情由頭講晒先可以求助。',
    '可以同信得過嘅人講：「我而家唔想一個人，你可唔可以陪我？」如有即時危險，請聯絡當地緊急服務。',
    '你提到嘅情況值得認真看待。安唔安全，唔靠張盤判斷。'],
  '尊重對方意願': [/(?:話|講明|表明|明確表示|叫我)(?:咗|過)?[「『：:\s]*(?:唔好再|不要再|唔想再|唔想我再)(?:搵|見|傳|發|約|聯絡|聯繫)|(?:封鎖|拉黑|block)(?:咗)?我|拒絕(?:再)?(?:聯絡|聯繫)/i,
    '如果有人已經講明唔想再聯絡，就以嗰句為準：唔再聯絡，亦唔需要託朋友傳話。',
    '有句說話未講完，都可以只留畀自己，唔一定要送到對方面前。',
    '如果有一段未發嘅訊息，可以放入自己嘅便條，唔撳傳送。',
    '停低聯絡係尊重對方講過嘅界線。張盤唔能夠將一句「唔想」變成答應。']
};
const notebooks = {
  官祿: {prompts:careerPrompts, general:generalCareerPrompt, intro:'官祿宮就係睇工作嗰格。', question:'最近工作上，想問啲乜？', example:'例如：幾樣嘢同時要交，點排先後？', privacy:'用虛構處境試，唔好寫真名、公司名或聯絡資料。'},
  夫妻: {prompts:lovePrompts, intro:'夫妻宮睇嘅係兩個人點相處，單身都可以參考。', question:'感情上，有咩想問？', example:'例如：想見多啲，但一開口就拗，點講好？', privacy:'用虛構處境試，唔好寫自己或對方嘅真名、帳號或聯絡資料。', general:[null,
    '冇特別問題都得。我哋先睇夫妻宮，諗吓自己鍾意點樣同人相處。',
    '有人陪你時，你最珍惜嘅係一齊做一件事，定係可以自在咁靜一陣？',
    '揀一個令你覺得自在嘅相處片段，寫低：「我鍾意嗰刻，因為＿＿。」',
    '而家有冇拍拖都用得着。唔似你嘅例子，唔使夾硬認。']}
};

function notebookTopics(question, prompts) {
  if (prompts === lovePrompts) {
    for (const boundary of ['先顧安全','尊重對方意願']) if (prompts[boundary][0].test(question)) return [boundary];
  }
  // shortcut: only explicit topics and priorities; if more than one fits, let the reader choose.
  const topics = new Set(), preferred = new Set();
  let hasPriority = false;
  const parts = question.normalize('NFKC').split(/[,。！？!?;；、\n]|但[係是]?|不過|而[係是]|(?=唔想|不想|(?:只(?:係)?|淨係|主要|反而|又|仲)想)|\bbut\b/i);
  for (let part of parts) {
    if (!part.trim()) continue;
    // Refusing overtime is a request about hours, unlike refusing to discuss overtime.
    const reduceHours = /(?:唔想|不想)(?:再|成日|日日|晚晚|繼續|被迫|\s)*(?:加班(?!費)|OT\b|超時工作)/i.test(part);
    const declined = /(?:唔係|不是|並非)(?:想|要|問|傾)|唔想|不想|唔打算|冇打算|唔考慮|唔(?:再)?諗(?:住)?|不打算|無意|暫不考慮|(?:唔係|不是)(?:我)?(?:最)?想(?:問|傾|講)|\b(?:not asking|not interested|(?:don't|do not) want)\b/i.test(part);
    if (declined && !reduceHours) continue;
    const first = /只(?:係)?想|淨係想|主要想|反而想|想先|最想|先(?:問|傾|處理)|\bonly (?:ask|want)/i.test(part);
    if (first) {
      hasPriority = true;
      part = part.split(/之後|跟住|然後|再(?:傾|諗|問|談|睇|考慮)/,1)[0];
    }
    for (const [topic,[words]] of Object.entries(prompts)) {
      if (words.test(part)) (first ? preferred : topics).add(topic);
    }
  }
  const found = hasPriority ? preferred : topics;
  // How to talk about a specific goal is not a second, competing goal.
  if (found.size > 1 && /點(?:樣)?(?:同.{0,6})?溝通|如何.{0,8}溝通/.test(question)) found.delete('工作溝通');
  if (prompts === lovePrompts && found.size > 1) {
    found.delete('講出需要');
    if (found.size > 1 && question.includes('單身') && !lovePrompts['認識新朋友'][0].test(question.replaceAll('單身',''))) found.delete('認識新朋友');
  }
  return [...found];
}

const NOTEBOOK_EXAMPLE = Object.freeze({ year:'1995', month:'08', day:'15', time:'09:30', precision:'exact', gender:'male', place:'' });

const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥'];
const OPPOSITE = { 官祿:'夫妻', 夫妻:'官祿', 田宅:'子女', 財帛:'福德', 命宮:'遷移' };
const palaceTitle = name => name.endsWith('宮') ? name : name + '宮';

function readStars(palace, topic) {
  const list = palace?.majorStars;
  if (!Array.isArray(list) || list.some(s => !s || typeof s.name !== 'string' || typeof s.type !== 'string')) return null;
  const stars = list.filter(s => s.type === 'major');
  if (stars.length > 2 || new Set(stars.map(s => s.name)).size !== stars.length || stars.some(s => !Object.hasOwn(STAR_READINGS, s.name))) return null;
  return stars.map(({ name }) => ({ name, theme: STAR_READINGS[name].theme, behaviour: STAR_READINGS[name][topic] }));
}

export function getPalaceReading(chart, name) {
  if (chart?.status !== 'ready' || !Object.hasOwn(READING_TOPICS, name) || !Array.isArray(chart.palaces) || chart.palaces.length !== 12) return null;
  const matches = chart.palaces.filter(p => p?.name === name);
  if (matches.length !== 1) return null;
  const palace = matches[0], i = BRANCHES.indexOf(palace.earthlyBranch);
  const stars = readStars(palace, name);
  if (i < 0 || !stars) return null;
  let opposite = null;
  if (!stars.length) {
    const branch = BRANCHES[(i + 6) % 12], oppositeName = OPPOSITE[name];
    const donors = chart.palaces.filter(p => p?.earthlyBranch === branch || p?.name === oppositeName);
    if (donors.length !== 1 || donors[0].name !== oppositeName || donors[0].earthlyBranch !== branch) return null;
    const borrowed = readStars(donors[0], name);
    if (!borrowed?.length) return null;
    opposite = { palace: oppositeName, branch, stars: borrowed };
  }
  return {
    label: READING_TOPICS[name].label, lead: READING_TOPICS[name].lead, question: READING_TOPICS[name].question,
    palace: name, branch: palace.earthlyBranch, stars, opposite
  };
}


function readingFact(reading) {
  const {stars, opposite} = reading;
  const names = (opposite ? opposite.stars : stars).map(s => s.name).join('、');
  return palaceTitle(reading.palace) + '喺' + reading.branch + '位，' + (opposite
    ? '本宮無十四主星。借對宮' + palaceTitle(opposite.palace) + '（' + opposite.branch + '位）嘅' + names + '嚟參看。'
    : '本宮主星係' + names + '。');
}

export const ZIWEI_RULES = Object.freeze({ yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: 'forward', algorithm: 'default' });

export function getZiweiError(input, today = new Date()) {
  if (!input || typeof input !== 'object') return { field: 'year', message: '請填寫出生資料。' };
  const dateError = getBirthDateError(input, today);
  if (dateError) return dateError;
  if (Number(input.year) < 1900 || Number(input.year) > 2099) return { field: 'year', message: '請填1900至2099年之間嘅西曆出生日期。' };
  if (!['exact', 'unknown'].includes(input.precision)) return { field: 'precision', message: '請選擇已知時間或不知道。' };
  if (input.precision === 'exact' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { field: 'time', message: '請填有效出生時間，或選不知道。' };
  if (input.precision === 'unknown' && input.time !== '') return { field: 'time', message: '未知時辰不能同時填入時間。' };
  if (!['male', 'female', 'withheld'].includes(input.gender)) return { field: 'gender', message: '請選擇性別，或暫不提供。' };
  if (typeof input.place !== 'string' || input.place.length > 80) return { field: 'place', message: '出生地最多80字，唔需要詳細地址。' };
  return null;
}

export function calculateZiwei(input, engine = globalThis.iztro) {
  const error = getZiweiError(input);
  if (error) throw new Error(error.message);
  if (input.precision === 'unknown' || input.gender === 'withheld') return { status: 'needs-input' };
  if (engine?.version !== '2.6.5' || typeof engine.astro?.withOptions !== 'function') throw new Error('排盤暫時未能使用，請重新載入後再試。');
  const hour = Number(input.time.slice(0, 2));
  const timeIndex = hour === 23 ? 12 : Math.floor((hour + 1) / 2);
  engine.astro.resetConfig();
  const chart = engine.astro.withOptions({
    type: 'solar', dateStr: `${Number(input.year)}-${Number(input.month)}-${Number(input.day)}`,
    timeIndex, gender: input.gender === 'male' ? '男' : '女', fixLeap: true, language: 'zh-TW', config: ZIWEI_RULES
  });
  if (typeof chart.lunarDate !== 'string' || typeof chart.fiveElementsClass !== 'string' || !Array.isArray(chart.palaces) || chart.palaces.length !== 12 || new Set(chart.palaces.map(p => p.earthlyBranch)).size !== 12 || !chart.palaces.every(p => '子丑寅卯辰巳午未申酉戌亥'.includes(p.earthlyBranch) && typeof p.name === 'string' && ['majorStars', 'minorStars', 'adjectiveStars'].every(key => Array.isArray(p[key]))) || !chart.palaces.some(p => p.name === '命宮') || chart.palaces.filter(p => p.isBodyPalace).length !== 1) throw new Error('未能核對命盤，請稍後再試。');
  return { status: 'ready', timeIndex, lunarDate: chart.lunarDate, fiveElementsClass: chart.fiveElementsClass, palaces: chart.palaces };
}

// Copper dial, twelve houses and seal from the approved interactive study.
function drawNotebookDial(svg, palaces, {palace, branch}) {
  const pt = (j,r) => [160+r*Math.sin(j*Math.PI/6),160-r*Math.cos(j*Math.PI/6)];
  function add(tag, attrs, label='', parent=svg) {
    const node = document.createElementNS(svg.namespaceURI, tag);
    for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v);
    node.textContent = label; parent.append(node); return node;
  }
  const dial=add('g',{class:'dial-sweep'});
  for (const r of [90,106,113,147,151]) add('circle',{cx:160,cy:160,r,fill:'none',stroke:r===113?'#c6a473':'#596c56'},'',dial);
  for (let j=0;j<72;j++) {
    const [x1,y1]=pt(j/6,115), [x2,y2]=pt(j/6,j%6?118:124);
    add('line',{x1,y1,x2,y2,stroke:'#bba57d'},'',dial);
  }
  const selected=BRANCHES.indexOf(branch);
  BRANCHES.forEach((b,j) => {
    const [x,y]=pt(j,133), [dx,dy]=pt(j,98);
    add('text',{x,y:y+4,'text-anchor':'middle','font-size':11,fill:j===selected?'#ffbe92':'#ede0ba',class:'dial-house',style:'animation-delay:'+j*.075+'s'},palaces.find(p=>p.earthlyBranch===b).name);
    add('text',{x:dx,y:dy+4,'text-anchor':'middle','font-size':10,fill:'#c6d2b2'},b);
  });
  const points=[selected,(selected+4)%12,(selected+8)%12,selected,(selected+6)%12].map(j=>pt(j,84).join(',')).join(' ');
  add('polyline',{points,fill:'none',stroke:'#c99266','stroke-width':1.3,pathLength:1,class:'dial-thread'});
  add('circle',{cx:160,cy:160,r:42,fill:'#192b23',stroke:'#b69263'});
  add('text',{x:160,y:158,'text-anchor':'middle',fill:'#eed3a1','font-size':22,'font-family':'serif'},palace);
  add('text',{x:160,y:179,'text-anchor':'middle',fill:'#dbc199','font-size':12},branch+' 位');
}

export function attachZiwei(dialog, content, paint) {
  const emptyInput = () => ({ year: '', month: '', day: '', precision: 'unknown', time: '', gender: '', place: '' });
  let alias = '', question = '', chosenTopic = '', ritualTimer;
  const notebook = () => notebooks[focusPalace];
  const topicsForVisit = () => notebookTopics(question, notebook().prompts);
  let input = emptyInput(), chart = null, reviewed = null, active = false, focusPalace = '命宮';
  const action = (label, name, kind = 'primary') => `<button class="button ${kind}" type="button" data-ziwei="${name}">${label}</button>`;
  const label = '';
  const privacy = '<p class="privacy-note">只用虛構資料；資料只留本頁，不保存。</p>';
  const rules = '<details class="ziwei-rules"><summary>排盤方式</summary><p>採用西曆及出生地當地鐘錶時間，不校正夏令時間或真太陽時。23:00起按翌日排盤；閏月初一至十五按前月，十六日起按後月。呢張係本命盤，不作大限、流年或吉凶預言。</p></details>';

  function text(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }
  function errorMessage(error) {
    const field = document.getElementById(`ziwei-${error.field}`);
    document.getElementById('ziwei-error').textContent = error.message;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function showEntrance() {
    paint(`<h2 id="dialog-title">玄</h2><p class="speech" id="desk-question">係咪有問題想問我？</p><div class="desk-replies"><button class="button primary" type="button" data-ziwei="greet" data-reply="yes">有呀，想傾吓。</button><button class="button secondary" type="button" data-ziwei="greet" data-reply="curious">你係邊位？</button></div>`, 'entrance');
  }
  function showChoice(reply) {
    const hello = reply === 'curious' ? '我係玄，呢位係九爺。' : reply === 'yes' ? '好呀。' : '';
    paint(`<p class="desk-speaker">玄</p><h2 id="dialog-title">${hello}想由邊方面睇起？</h2><div class="desk-topics">${Object.entries(READING_TOPICS).map(([palace, topic]) => `<button class="option" type="button" data-ziwei="focus" data-palace="${palace}"><strong>${topic.label}</strong><span>${topic.hint}</span></button>`).join('')}</div>`, 'interaction');
  }
  function showResponse() {
    if (notebook()) { showAlias(); return; }
    const topic = READING_TOPICS[focusPalace];
    paint(`<h2 id="dialog-title">九爺 · ${topic.label}</h2><p class="speech">${topic.invite}</p><p class="desk-note">用虛構出生資料，免費睇十二宮。</p><div class="dialog-actions">${action('免費試排紫微盤', 'skip')}${action('返去揀話題', 'choose-focus', 'secondary')}</div>`, 'response');
  }
  const get = id => document.getElementById(id);
  const formError = '<p id="ziwei-error" class="form-error" role="alert"></p>';
  function showAlias() {
    paint(`<p class="desk-speaker">玄 · ${READING_TOPICS[focusPalace].label}手記　01 / 03</p><h2 id="dialog-title">點稱呼你好？</h2><form id="career-alias-form" autocomplete="off" novalidate><div class="profile-fields"><label for="ziwei-alias">寫個化名，等我為你開卷。<input id="ziwei-alias" maxlength="18" placeholder="例如：阿澄" required></label></div>${privacy}${formError}<div class="dialog-actions"><button class="button primary" type="submit">填生辰</button>${action('返去揀話題','choose-focus','secondary')}</div></form>`, 'career-setup');
    get('ziwei-alias').value = alias;
  }
  function showNotebookBirth() {
    chart = reviewed = null;
    paint(`<p class="desk-speaker">玄 · 生辰入盤　02 / 03</p><h2 id="dialog-title">呢個例子喺幾時出世？</h2><form id="career-birth-form" autocomplete="off" novalidate><div class="profile-fields"><label for="ziwei-date">西曆出生日期<input id="ziwei-date" type="date" min="1900-01-01" required></label><label for="ziwei-time">出生地當地時間<input id="ziwei-time" type="time" required></label><label for="ziwei-gender">性別<select id="ziwei-gender" required><option value="">請選擇</option><option value="male">男</option><option value="female">女</option></select></label></div><p class="privacy-note">只用虛構生辰。唔知時辰排唔到呢張盤；可以用下面嘅例盤試。</p>${action('代入虛構例盤：1995 年 8 月 15 日，09:30，男','example','secondary')}${formError}<div class="dialog-actions"><button class="button primary" type="submit">下一步</button>${action('返回稱呼','edit-alias','secondary')}</div></form>`, 'career-setup');
    get('ziwei-date').value = input.day ? [input.year,input.month,input.day].join('-') : '';
    get('ziwei-time').value = input.time;
    get('ziwei-gender').value = input.gender;
  }
  function showQuestion() {
    chosenTopic = '';
    chart = reviewed = null;
    paint(`<p class="desk-speaker">玄 · 一事一問　03 / 03</p><h2 id="dialog-title">${notebook().question}</h2><p id="career-summary" class="career-summary"></p><form id="career-question-form" autocomplete="off" novalidate><div class="profile-fields"><label for="ziwei-question">寫低想問嘅事（選填）<textarea id="ziwei-question" maxlength="240" rows="3" placeholder="${notebook().example}"></textarea></label></div><p class="privacy-note">${notebook().privacy}</p>${formError}<div class="dialog-actions"><button class="button primary" type="submit">起盤睇免費手記</button><button class="button question-skip" type="submit" value="skip-question" aria-label="略過提問，直接起盤">略過提問</button>${action('修改生辰','career-birth','secondary')}</div></form>`, 'career-setup');
    get('career-summary').textContent = alias + '　／　' + [input.year,input.month,input.day].join(' · ') + '　' + input.time + '　' + (input.gender === 'male' ? '男' : '女');
    get('ziwei-question').value = question;
  }
  function startRitual(reading) {
    paint(`<p class="desk-speaker">${reading.label}　／　起盤</p><h2 id="dialog-title">為你點星</h2><section class="ritual-box" id="ritual-box"><p class="ritual-name" id="ritual-name"></p><p id="ritual-birth" class="ritual-birth"></p><svg id="career-dial" viewBox="0 0 320 320" aria-hidden="true"></svg><span class="ritual-seal" id="ritual-seal"></span><p class="ritual-fact" id="ritual-fact"></p></section>${action('直接睇六格','read-comic','secondary')}`, 'career-ritual');
    get('ritual-name').textContent = alias + '嘅' + reading.label + '盤';
    get('ritual-birth').textContent = input.year + ' 年 ' + input.month + ' 月 ' + input.day + ' 日　' + input.time;
    get('ritual-seal').textContent = reading.opposite ? '取對宮參看' : '本宮主星入卷';
    get('ritual-fact').textContent = readingFact(reading);
    const svg = get('career-dial');
    drawNotebookDial(svg, chart.palaces, reading);
    clearTimeout(ritualTimer);
    const current = () => dialog.open && get('career-dial') === svg;
    const reveal = () => { if (current()) showComic(); };
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      ritualTimer = setTimeout(reveal, 0);
      return;
    }
    const seal = get('ritual-seal');
    const holdStamp = ms => {
      if (!current()) return;
      seal.onanimationend = null;
      clearTimeout(ritualTimer);
      get('ritual-box').setAttribute('data-ink-set', '');
      ritualTimer = setTimeout(reveal, ms);
    };
    // On a slow screen, elapsed time is not proof the final stamp has painted.
    seal.onanimationend = () => holdStamp(600);
    ritualTimer = setTimeout(() => holdStamp(1200), 6000);
  }
  function showComic() {
    clearTimeout(ritualTimer);
    if (!notebook() || !alias || chart?.status !== 'ready' || reviewed !== JSON.stringify(input)) return;
    const reading = getPalaceReading(chart, focusPalace);
    if (!reading) { showResult(); return; }
    const [first, second] = reading.opposite?.stars || reading.stars;
    const topics = topicsForVisit();
    const topic = topics.includes(chosenTopic) ? chosenTopic : topics.length === 1 ? topics[0] : '';
    const choose = !topic && topics.length > 1;
    const [,answer,ask,tryIt,close] = notebook().prompts[topic] || notebook().general;
    const lead = choose ? '你提咗幾件事，想先傾邊一件？揀一樣就得，唔使再填生辰。'
      : question && !topic ? '我唔想替你估。你可以補一句最想講嘅事，或者先由' + palaceTitle(focusPalace) + '睇起。' : answer;
    const lines = [
      ['九爺', lead], ['玄 · 盤面所見', notebook().intro + readingFact(reading)],
      ['玄 · 生活對照', first.name + '有「' + first.theme + '」呢個讀法。' + (['先顧安全','尊重對方意願'].includes(topic) ? '呢個係傳統比喻，唔係叫你接觸對方。' : first.behaviour)],
      ['九爺', (second ? second.name + '可以從「' + second.theme + '」去睇。' : '') + ask],
      ['玄', close], ['九爺 · 可以試吓', tryIt]
    ];
    paint(`<header class="comic-head"><p>玄與九爺 <span>／</span> 免費${reading.label}手記</p><h2 id="dialog-title"></h2><p class="comic-caption">六格對話 · ${palaceTitle(focusPalace)} <span aria-hidden="true">↓</span></p></header><ol class="career-strip" id="career-strip" aria-label="六格故事"></ol><div class="comic-end">${action('對返'+palaceTitle(focusPalace),'view-result')}<div class="comic-alternates">${topics.length > 1 && topic ? action('返去揀重點','reset-career-topic','secondary') : ''}${action('同一張盤，再問一件事','ask-again','secondary')}${action('修改生辰','career-birth','secondary')}</div></div>`, 'career-comic');
    get('dialog-title').textContent = alias + '嘅' + reading.label + '手記';
    const strip = document.getElementById('career-strip');
    lines.forEach(([speaker,line],i) => {
      const panel = text('li','','comic-frame');
      const picture = text('div','','comic-art'); picture.setAttribute('aria-hidden','true');
      picture.append(text('span',String(i+1).padStart(2,'0'),'comic-number'));
      const speech = text('div','','comic-bubble'); speech.append(text('strong',speaker),text('p',line));
      if (i === 0 && question && !topic) {
        const actions = text('div', '', 'comic-focus');
        const add = (label, name, focus) => {
          const button = text('button', label, 'button secondary');
          button.setAttribute('type','button'); button.setAttribute('data-ziwei',name);
          if (focus) button.setAttribute('data-topic',focus);
          actions.append(button);
        };
        if (choose) topics.forEach(label => add(label, 'choose-career-topic', label));
        else add('換個講法', 'edit-question');
        speech.append(actions);
      }
      panel.append(picture,speech); strip.append(panel);
    });
  }
  function showReveal() {
    paint(`<h2 id="dialog-title">十二宮命盤排好喇。</h2><div class="dialog-actions">${action('睇命盤', 'view-result')}</div><button class="dialog-back" type="button" data-ziwei="edit-options">修改資料</button>`, 'reveal');
  }
  function showDate() {
    chart = reviewed = null;
    paint(`${label}<h2 id="dialog-title">例子入面嘅人，邊日出世？</h2><p class="dialog-lead">填一個虛構嘅西曆出生日期。</p><form id="ziwei-date-form" autocomplete="off" novalidate><div class="birth-fields"><label for="ziwei-year">年<input id="ziwei-year" data-ziwei-field="year" type="text" inputmode="numeric" placeholder="YYYY" required></label><label for="ziwei-month">月<input id="ziwei-month" data-ziwei-field="month" type="text" inputmode="numeric" placeholder="MM" required></label><label for="ziwei-day">日<input id="ziwei-day" data-ziwei-field="day" type="text" inputmode="numeric" placeholder="DD" required></label></div>${privacy}<p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">填出生時間</button></div></form><button class="dialog-back" type="button" data-ziwei="back-intro">返去揀主題</button>`, 'ziwei-date');
    for (const key of ['year', 'month', 'day']) document.getElementById(`ziwei-${key}`).value = input[key];
  }
  function showOptions() {
    chart = reviewed = null;
    paint(`${label}<h2 id="dialog-title">幾點出世？</h2><form id="ziwei-options-form" autocomplete="off" novalidate><div class="profile-fields"><label for="ziwei-precision">出生時間<select id="ziwei-precision" data-ziwei-field="precision"><option value="unknown">唔確定</option><option value="exact">知道出生時間</option></select></label><label for="ziwei-time">時間（24小時 HH:mm）<input id="ziwei-time" data-ziwei-field="time" type="text" placeholder="03:30" maxlength="5" autocomplete="off"></label><label for="ziwei-place">出生地（可不填）<input id="ziwei-place" data-ziwei-field="place" type="text" maxlength="80" placeholder="國家／地區、城市"></label><label for="ziwei-gender">性別<select id="ziwei-gender" data-ziwei-field="gender"><option value="">請選擇</option><option value="male">男</option><option value="female">女</option><option value="withheld">暫不提供</option></select></label></div><p class="privacy-note">時辰唔確定就留白，唔會代填。出生地不作校時。</p>${rules}<p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">核對資料</button>${action('返回日期', 'edit-date', 'secondary')}</div></form>`, 'ziwei-options');
    for (const key of ['precision', 'time', 'place', 'gender']) document.getElementById(`ziwei-${key}`).value = input[key];
    document.getElementById('ziwei-time').disabled = input.precision !== 'exact';
  }
  function showReview() {
    chart = null;
    reviewed = JSON.stringify(input);
    paint(`${label}<h2 id="dialog-title">資料啱嗎？</h2><dl class="visit-review" id="ziwei-review"></dl><p id="ziwei-error" class="form-error" role="alert"></p><div class="dialog-actions">${action('啱，免費排盤', 'calculate')}${action('修改資料', 'edit-options', 'secondary')}</div>`, 'ziwei-review');
    const rows = [['西曆出生日期', `${input.year}年${input.month}月${input.day}日`], ['當地出生時間', input.precision === 'exact' ? input.time : '唔確定'], ['出生地（不作校時）', input.place || '未提供'], ['性別', { male: '男', female: '女', withheld: '暫不提供' }[input.gender]]];
    const list = document.getElementById('ziwei-review');
    for (const [key, value] of rows) { const row = document.createElement('div'); row.append(text('dt', key), text('dd', value)); list.append(row); }
  }
  function starNames(palace) {
    return palace.majorStars.filter(star => star.type === 'major').map(star => star.name).join('、') || '本宮無十四主星';
  }
  function showPalace(name) {
    const reading = getPalaceReading(chart, name);
    const note = document.getElementById('ziwei-palace-note');
    note.replaceChildren();
    content.querySelectorAll('[data-ziwei="palace"]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.palace === name)));
    if (!reading) { note.append(text('p', '呢格嘅星曜資料唔齊，可以打開下面嘅十二宮，或者返去核對出生資料。')); return; }
    const { stars, opposite } = reading;
    const visibleStars = opposite ? opposite.stars : stars;
    const fact = readingFact(reading);
    note.append(text('h3', '玄 · ' + reading.label), text('p', fact, 'reading-fact'), text('p', reading.lead));
    for (const star of visibleStars) {
      const section = document.createElement('section'); section.className = 'reading-star';
      section.append(text('h4', star.name + ' · ' + star.theme), text('p', star.behaviour)); note.append(section);
    }
    note.append(text('p', '九爺：' + reading.question));
    const evidence = document.createElement('details'); evidence.className = 'reading-evidence';
    evidence.append(text('summary', '解讀依據'), text('p', opposite
      ? '本宮冇主星，傳統紫微斗數會參考正對面嗰一宮。借嚟睇嘅星仍然喺對宮，唔會搬入本宮。'
      : '呢度讀嘅係本宮主星。兩粒星可以有唔同取向，唔代表你每次都會兩樣一齊做。'),
      text('p', '星曜係傳統象徵。近況啱唔啱，由你用生活經驗對照；一粒星唔足以判定發生過咩事。'));
    note.append(evidence);
  }
  function showResult(focusNote = false) {
    if (chart.status === 'needs-input') {
      paint(`${label}<h2 id="dialog-title">資料未足，先唔落盤。</h2><p class="dialog-lead">出生時間同性別齊咗，再返嚟排盤。</p><div class="dialog-actions">${action('返回資料', 'edit-options')}</div>${privacy}`, 'ziwei');
      return;
    }
    paint(`${label}<h2 id="dialog-title">十二宮命盤</h2><p class="dialog-lead">先由「${READING_TOPICS[focusPalace].label}」睇起。想睇全盤，可以打開下面嘅十二宮。</p><p id="ziwei-result-context" class="reading-fact"></p><div class="ziwei-reading" id="ziwei-reading"></div><div class="dialog-actions palace-switches">${Object.entries(READING_TOPICS).map(([name, topic]) => `<button class="button secondary" type="button" data-ziwei="palace" data-palace="${name}" aria-pressed="false">${topic.label}</button>`).join('')}</div><section id="ziwei-palace-note" tabindex="-1" aria-live="polite" aria-atomic="true"></section><details class="ziwei-chart-details"><summary>打開十二宮命盤</summary><div class="ziwei-scroll" tabindex="0" role="region" aria-label="十二宮命盤，窄螢幕可左右捲動"><div class="ziwei-grid" id="ziwei-grid"></div></div></details>${rules}<p class="privacy-note">只作傳統文化參考，不作健康、投資或人生決定依據。未提供流年、大限或完整論命。</p><div class="dialog-actions">${notebook() && getPalaceReading(chart,focusPalace) ? action('再睇六格對話','read-comic') : ''}${action('修改資料', notebook() ? 'career-birth' : 'edit-options', notebook() ? 'secondary' : 'primary')}</div>${privacy}`, 'ziwei-result');
    document.getElementById('ziwei-result-context').textContent = `${input.year}年${input.month}月${input.day}日 ${input.time} · ${chart.fiveElementsClass}`;
    const grid = document.getElementById('ziwei-grid');
    const scroll = grid.parentElement;
    scroll.addEventListener('keydown', event => {
      if (event.target !== scroll || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      scroll.scrollBy({ left: event.key === 'ArrowRight' ? 80 : -80, behavior: 'auto' });
    });
    const positions = { 寅: [4, 1], 卯: [3, 1], 辰: [2, 1], 巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4], 酉: [2, 4], 戌: [3, 4], 亥: [4, 4], 子: [4, 3], 丑: [4, 2] };
    for (const palace of chart.palaces) {
      const cell = document.createElement('section'); cell.className = 'ziwei-palace';
      [cell.style.gridRow, cell.style.gridColumn] = positions[palace.earthlyBranch];
      cell.append(text('h3', `${palace.name}${palace.isBodyPalace ? ' · 身宮' : ''}`), text('p', `${palace.heavenlyStem}${palace.earthlyBranch}`, 'ziwei-branch'));
      for (const star of palace.majorStars) cell.append(text('p', `${star.name}${star.brightness ? ` · ${star.brightness}` : ''}${star.mutagen ? ` · 化${star.mutagen}` : ''}`, star.type === 'major' ? 'ziwei-major' : 'ziwei-minor'));
      if (!palace.majorStars.some(star => star.type === 'major')) cell.append(text('p', '本宮無十四主星', 'ziwei-minor'));
      cell.append(text('p', palace.minorStars.map(star => `${star.name}${star.mutagen ? `（化${star.mutagen}）` : ''}`).join('、'), 'ziwei-minor'));
      const details = document.createElement('details'); details.append(text('summary', '其他星曜'), text('p', palace.adjectiveStars.map(star => star.name).join('、') || '無')); cell.append(details);
      grid.append(cell);
    }
    const centre = document.createElement('div'); centre.className = 'ziwei-centre';
    centre.append(text('h3', '紫微斗數'), text('p', `${input.year}年${input.month}月${input.day}日 ${input.time}`), text('p', `排盤採用農曆：${chart.lunarDate}`), text('p', chart.fiveElementsClass)); grid.append(centre);
    const soul = chart.palaces.find(p => p.name === '命宮'), body = chart.palaces.find(p => p.isBodyPalace);
    const reading = document.getElementById('ziwei-reading');
    reading.append(text('p', `命宮：${soul.earthlyBranch}位・${starNames(soul)}。身宮：${body.name}・${body.earthlyBranch}位。`));
    showPalace(focusPalace);
    if (focusNote) document.getElementById('ziwei-palace-note').focus();
  }

  content.addEventListener('input', event => {
    if (active && notebook() && event.target.id === 'ziwei-question') question = event.target.value;
    if (active && notebook() && ['ziwei-question','ziwei-alias','ziwei-date','ziwei-time','ziwei-gender'].includes(event.target.id)) event.target.removeAttribute('aria-invalid');
    const key = event.target.dataset.ziweiField;
    if (!active || !key || !Object.hasOwn(input, key)) return;
    input[key] = event.target.value; chart = reviewed = null;
    event.target.removeAttribute('aria-invalid');
    if (key === 'precision') {
      const time = document.getElementById('ziwei-time'); time.disabled = input.precision !== 'exact';
      if (time.disabled) input.time = time.value = '';
    }
  });
  content.addEventListener('submit', event => {
    const form = event.target.id;
    if (!active || (!['ziwei-date-form','ziwei-options-form'].includes(form) && !(notebook() && ['career-alias-form','career-birth-form','career-question-form'].includes(form)))) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (form === 'career-alias-form') {
      alias = get('ziwei-alias').value.trim();
      if (!alias || alias.length>18) return errorMessage({field:'alias',message:'請寫一個 18 字以內嘅化名，唔使真名。'});
      showNotebookBirth(); return;
    }
    if (form === 'career-birth-form') {
      const [year='',month='',day=''] = get('ziwei-date').value.split('-');
      const time=get('ziwei-time').value, gender=get('ziwei-gender').value;
      const next = {year,month,day,time,precision:'exact',gender,place:''};
      const issue=getZiweiError(next);
      if (issue || !['male','female'].includes(gender)) {
        const field=issue?.field || 'gender';
        return errorMessage({field:['year','month','day'].includes(field)?'date':field,message:field==='time'?'要有出生時間先排到呢張盤；唔知道可以代入虛構例盤。':field==='gender'?'請選擇性別，或者代入虛構例盤。':issue.message});
      }
      input=next; showQuestion(); return;
    }
    if (form === 'career-question-form') {
      question = event.submitter?.value === 'skip-question' ? '' : get('ziwei-question').value.trim();
      if (question.length>240) return errorMessage({field:'question',message:'請寫低一條 240 字以內嘅問題。'});
      try {
        chart=calculateZiwei(input);
        const reading=getPalaceReading(chart,focusPalace);
        if (!alias || !reading) throw new Error();
        reviewed=JSON.stringify(input);
        startRitual(reading);
      } catch { chart=reviewed=null; showQuestion(); errorMessage({field:'question',message:'未能建立' + READING_TOPICS[focusPalace].label + '盤。請核對生辰，再試一次。'}); }
      return;
    }
    if (event.target.id === 'ziwei-date-form') {
      const error = getBirthDateError(input) || (Number(input.year) < 1900 || Number(input.year) > 2099 ? { field: 'year', message: '請填1900至2099年之間嘅西曆出生日期。' } : null);
      if (error) errorMessage(error); else showOptions();
    } else {
      const error = getZiweiError(input);
      if (error) errorMessage(error); else showReview();
    }
  }, true);
  content.addEventListener('click', event => {
    const trigger = event.target.closest('button[data-ziwei]');
    if (!active || !trigger || content.inert) return;
    const name = trigger.dataset.ziwei;
    if (name === 'greet' && ['curious', 'yes'].includes(trigger.dataset.reply)) showChoice(trigger.dataset.reply);
    if (name === 'choose-focus') { clearVisit(); showChoice(); }
    if (name === 'focus' && Object.hasOwn(READING_TOPICS,trigger.dataset.palace)) { focusPalace=trigger.dataset.palace; showResponse(); }
    if (notebook()) {
      if (name === 'edit-alias') showAlias();
      if (name === 'career-birth') showNotebookBirth();
      if (name === 'example') {
        const {year,month,day,time,gender}=NOTEBOOK_EXAMPLE;
        get('ziwei-date').value=[year,month,day].join('-'); get('ziwei-time').value=time; get('ziwei-gender').value=gender;
        get('ziwei-error').textContent='已代入虛構例盤。你可以修改生辰，或者去下一步。';
      }
      if (name === 'choose-career-topic' && topicsForVisit().includes(trigger.dataset.topic)) {
        chosenTopic=trigger.dataset.topic; showComic();
      }
      if (name === 'reset-career-topic') { chosenTopic=''; showComic(); }
      if (name === 'edit-question') { showQuestion(); get('ziwei-question').focus(); }
      if (name === 'ask-again') { question=''; showQuestion(); }
      if (name === 'read-comic') showComic();
    }
    if (!notebook() && (name === 'skip' || name === 'edit-date')) showDate();
    if (name === 'back-intro') { clearVisit(); showChoice(); }
    if (name === 'edit-options' && !notebook()) showOptions();
    if (name === 'palace' && chart?.status === 'ready') showPalace(trigger.dataset.palace);
    if (name === 'view-result' && chart?.status === 'ready' && reviewed === JSON.stringify(input)) showResult(Boolean(notebook()));
    if (name === 'calculate' && !notebook()) {
      if (reviewed !== JSON.stringify(input)) { showReview(); return; }
      try { chart = calculateZiwei(input); if (chart.status !== 'ready') showResult(); else showReveal(); }
      catch { chart = null; document.getElementById('ziwei-error').textContent = '未能建立命盤。請核對資料或重新載入後再試；未有排盤結果。'; }
    }
  });
  function clearVisit() { clearTimeout(ritualTimer); alias=question=chosenTopic=''; input=emptyInput(); focusPalace='命宮'; chart=reviewed=null; }
  dialog.addEventListener('close', () => { if (!dialog.open) { clearVisit(); active=false; } });
  return skipIntro => { clearVisit(); active=true; if (skipIntro) showDate(); else showEntrance(); };
}
