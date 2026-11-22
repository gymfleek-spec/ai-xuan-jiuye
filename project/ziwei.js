import { getBirthDateError } from './content.js?v=0.13.0';
import { READING_TOPICS, BRANCHES, HOUSE_GUIDES, OPPOSITE, palaceTitle, readingFact, getPalaceReading, getZiweiError, calculateZiwei } from './scroll/chart.mjs';
export { getPalaceReading, getZiweiError, calculateZiwei, ZIWEI_RULES } from './scroll/chart.mjs';

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
  '暫停聯絡': [/^(?:我)?(?:唔想再|不想再|唔好再|不要再)(?:聯絡|聯繫)[。.!！?？\s]*$/,
    '你提到唔想再聯絡，先留返空間。未清楚係你定對方嘅界線之前，唔靠張盤催你再聯絡。',
    '呢句係你想留畀自己嘅界線，定係對方已經講明嘅意願？',
    '未發出嘅說話可以先留喺自己嘅便條，唔需要傳送或託人傳話。',
    '你同對方都有權唔聯絡。邊一方都唔需要由命盤代為答應。'],
  '尊重對方意願': [/(?:話|講明|表明|明確表示|叫我)(?:咗|過)?[「『：:\s]*(?:唔好再|不要再|唔想再|唔想我再)(?:搵|見|傳|發|約|聯絡|聯繫)|(?:封鎖|拉黑|block)(?:咗)?我|拒絕(?:再)?(?:聯絡|聯繫)/i,
    '如果有人已經講明唔想再聯絡，就以嗰句為準：唔再聯絡，亦唔需要託朋友傳話。',
    '有句說話未講完，都可以只留畀自己，唔一定要送到對方面前。',
    '如果有一段未發嘅訊息，可以放入自己嘅便條，唔撳傳送。',
    '停低聯絡係尊重對方講過嘅界線。張盤唔能夠將一句「唔想」變成答應。']
};
const familyPrompts = {
  '約家人見面': [/探(?:吓|下)?(?:望|親|屋企人|家人|爸媽|父母|媽咪|爹哋|阿[爸媽嫲爺公婆哥姐]|老[豆母爸媽])|返(?:去|屋企)食飯|(?:約(?:埋)?|同)(?:我嘅?)?(?:屋企人|家人|父母|爸媽|媽咪|爹哋|家[姐兄]|細[佬妹]|阿[爸媽嫲爺公婆哥姐]|老[豆母爸媽]).{0,6}(?:見|聚|食(?:餐)?飯|飲茶)|約食飯/,
    '想見屋企人，可以先問邊日方便，唔使一次傾埋以後要幾耐見一次。',
    '今次你最想要嘅係坐低食餐飯，定只係見一見、傾十分鐘？',
    '如果你想約，可以試一句：「星期日下晝我得閒，想過嚟坐一陣。你嗰日方唔方便？」對方唔方便就另約。',
    '見一次唔等於應承咗以後每星期都返去。你同對方都可以揀時間。'],
  '尊重對方意願': lovePrompts['尊重對方意願'],
  '暫停聯絡': lovePrompts['暫停聯絡'],
  '家務分擔': [/家務|洗碗|洗衫|晾衫|倒垃圾|收枱|分擔家事|輪流(?:煮飯|買餸)|邊個(?:煮飯|買餸)/,
    '先揀一樣，例如洗碗。今晚邊個負責，就由收碗跟到洗好，唔使另一個人次次開聲提。',
    '如果洗碗有人做，但碗碟成日留喺枱面，要傾嘅可能只係邊一步先算做完。',
    '下餐飯可以試問：「我煮飯，你由收碗跟到洗好，咁分啱唔啱？」聽埋對方點答先定。',
    '公平唔一定係一人一半。試一餐，先知呢個分法啱唔啱大家。'],
  '私人空間': [/私人空間|個人空間|自己.{0,3}空間|私隱|界線|界限|敲門|入我房|入房|翻我啲嘢|攞我啲嘢|獨處|想靜|靜一陣/,
    '將「畀啲空間我」講成一個做法。譬如想有人入房前問一聲，可以講：「麻煩敲門，等我應咗先入。」',
    '你想留低嘅，係一個唔畀人郁嘅櫃桶，定係返到屋企可以靜十分鐘？',
    '揀一件你最想保留嘅小事，補完一句：「下次＿＿之前，可唔可以先問我？」',
    '想有私人空間，唔等於要疏遠人。講清楚要留邊樣，比叫大家自己估容易。'],
  '傾返一件事': [/鬧交|嗌交|嘈交|吵架|爭執|意見唔同|分歧|拗撬|冷戰|道歉|溝通|點同(?:屋企人|家人)講/,
    '等大家都願意傾，先講返一件事：「頭先食飯嗰陣，我有半句未講完。」唔使一開口就分邊個啱。',
    '嗰次你最想人聽明嘅係邊半句？可以先喺心入面講一次。',
    '試寫低你自己把聲會講嘅一句：「頭先講到＿＿，我其實係想＿＿。」講唔講出口，由你決定。',
    '如果而家唔係傾嘅時候，可以遲啲再講。唔需要一餐飯解決晒。'],
  '安頓日常': [/收納|佈置|擺位|執屋|收拾|收執|新居|搬入/,
    '由一個位開始就夠。返到屋企第一樣要放低嘅係鎖匙、袋，定係外套？搵個最順手嘅位畀佢。',
    '如果每日都要周圍搵同一樣嘢，邊個位置你唔使刻意記都會行過？',
    '揀一件自己嘅物件，試放喺新位置一晚。聽日順手就留，唔順就搬返。',
    '屋企好唔好用，唔使同人哋間屋比。對你方便嘅擺法就值得留。'],
  '先顧安全': [/恐嚇|威脅|跟蹤|家暴|打(?:咗|過|傷)?我|郁手打|動手打|唔[畀俾]我走|唔准我走|鎖住我/,
    '如果你覺得唔安全，唔需要同對方對質。可以先去安全嘅地方；有即時危險，就聯絡當地緊急服務。',
    '有冇一個你信得過、而家又方便聯絡嘅人？唔使喺呢度留下對方資料。',
    '如果安全方便，可以同信得過嘅人講：「我而家需要有人陪，可唔可以幫我？」',
    '呢種情況唔靠命盤判斷，亦唔係靠你一個人講得好啲就要解決。']
};
const soloChores = [null,
  '食完飯，洗碗可以由自己用嗰隻開始。洗好就去抖，唔使一口氣執晒成個廚房。',
  '最容易卡住嘅係未開始，定係開始咗就覺得要一次做晒？',
  '今日揀一樣做得完嘅家務。做完就可以停，唔使順便掃埋地。',
  '今日做到幾多，睇你有幾多時間同氣力；做少一樣都得。'];
const ownChoreScenes = {
  紫微:'想聽朝一起身就沖到茶，可以先洗定隻杯。抹櫃門遲一日都唔礙事。',
  天機:'如果洗隻碗都要周圍搵海綿，試一晚將海綿放喺鋅盆邊，睇吓順唔順手。',
  太陽:'今晚洗定聽朝食早餐嗰隻碗，當係幫聽朝啱啱瞓醒嘅自己一把。',
  武曲:'水喉一開，先洗手上嗰隻碗。其餘有幾多，放低隻碗先再望。',
  天同:'如果飯後最想坐低飲杯茶，不如先洗隻茶杯。杯茶沖好，就留返嗰幾分鐘畀自己。',
  廉貞:'今日條線可以好簡單：洗完碗就算收工，雪櫃留返第二日抹。',
  天府:'如果聽朝要帶飯，今晚先洗好飯盒。其他手尾可以按氣力慢慢執。',
  太陰:'收好一隻碗之後，留意吓：係見到枱面空返一格，定係鋅盆冇積水，令你舒服啲？',
  貪狼:'如果洗碗覺得悶，可以試住播首鍾意嘅歌。歌完嗰刻，睇吓想繼續定收工。',
  巨門:'成盆碗最難落手嘅係邊度？如果係黐實嘅飯粒，下一餐食完先浸嗰隻碗就夠。',
  天相:'可以將手尾分成兩份：聽朝要用嘅今晚洗，唔趕用嘅另外安排。點分由你定。',
  天梁:'今日攰嘅話，照顧自己都算一件正經事。洗好要用嗰隻杯，就可以坐低飲啖水。',
  七殺:'成個廚房咁多嘢，今晚只揀「洗碗」一樣。抹枱做唔做，唔使一齊決定。',
  破軍:'如果次次收碗都要搬兩次，試將碗架移近鋅盆。用一餐就知順唔順手。'
};

function selfManagedChores(question) {
  // 分配 can mean splitting one's own time. Switch to shared advice only on evidence of another participant.
  let shared = false;
  const clauses = question.normalize('NFKC').replace(/[ \t]/g, '').split(/[,。；;:！？!?、\n]|但[係是]?|不過|(?=而家|依家|家陣|目前|現時|現在)/);
  for (const clause of clauses) {
    // Living apart from one relative says nothing about who shares today's chores.
    const now = clause.replace(/(?:同|跟|與)(?:屋企人|家人|父母|爸媽|阿[爸媽]|兄弟姊妹)(?:係|一直)?(?:分開住|分居|唔(?:係)?住埋一齊)/g, '')
      .replace(/^(?:喺屋企|屋企|家中|而家|依家|家陣|目前|現時|現在|其實|一直|本身|我)+/, '');
    if (!now || /^(?:以前|以往|從前|之前|曾經|當年|舊時)/.test(now)) continue;
    const alone = /^(唔係|不是|唔再|不再|唔止|唔只|不只)?(?:淨係|只係|只有|只得|得返|剩返|得|我)*(?:獨居|(?:獨自|單獨|自己(?:一個(?:人)?)?|一個(?:人)?)住)/.exec(now);
    if (alone) { shared = Boolean(alone[1]); continue; }
    if (/^(?:冇|無|沒有)(?:室友|同住者)|(?:冇|無|唔|不|唔再|不再|唔想|不想|沒有)同.{0,8}(?:住|分工)/.test(now)) { shared = false; continue; }
    if (/(?:同|跟|與)(?:我嘅|我個|我)?(?:人|佢|對方|室友|舍友|同屋|家人|屋企人|伴侶|另一半|[男女]?朋友|父母|爸媽|仔女|兄弟|姊妹|老[公婆豆母]|太太|先生|細[佬妹]|家[姐兄]|阿[\u3400-\u9fff])/.test(now) ||
        /(?:室友|同屋|屋企人|家人|伴侶|另一半|對方|佢)(?:同我|跟我|都|又|成日|肯|唔肯|負責|幫手|輪流|一齊|分工)|我哋|我們|兩個人(?:住|一齊)|一人一半|一人一樣|邊個(?:負責|洗碗|煮飯|買餸)|(?:提|催)(?:佢|對方)|(?:次次|成日)(?:都)?(?:係|要|由)?我(?:提|催)/.test(clause)) shared = true;
  }
  return !shared;
}

const visitScenes = {
  紫微:'有幾個日子可揀，可以先提自己最方便嗰日，再聽對方點講。', 天機:'如果兩邊個時間成日撞唔啱，可以問見一陣定通個電話邊樣方便啲。',
  太陽:'想順便帶啲嘢過去，可以先問對方想唔想要，唔使估。', 武曲:'想將「下次見」講實，可以提一日同一個時段，唔使即刻訂位。',
  天同:'如果一餐飯太趕，可以問對方想唔想改飲杯茶，坐一陣就得。', 廉貞:'如果今次要早走，約嗰陣講明幾點走，大家容易安排。',
  天府:'約日子時留少少空檔，試吓邊個時段見完唔使趕住走。', 太陰:'問句「朝早定下晝舒服啲？」可能比一口氣列晒全星期易答。',
  貪狼:'想試新地方，可以先問對方想出去行吓，定喺熟悉嘅地方傾。', 巨門:'「過嚟一陣」可以係十分鐘，亦可以係一餐飯。不妨講明自己有幾多時間。',
  天相:'夾時間記得計埋自己來回嗰程，唔只係望大家幾時得閒。', 天梁:'去探人唔一定要接晒所有安排。今次有冇一件事你其實想坐低聽？',
  七殺:'有一日得閒可以直接提出；對方未肯定，就留返畀對方覆。', 破軍:'飯敘成日夾唔到，可以試一次短啲嘅見面，唔一定照舊做。'
};

const moneyPrompts = {
  '儲錢目標': [/儲(?:錢|蓄|到|唔到|起|返|旅費|首期|一筆)|存(?:錢|款)|留(?:筆|一筆)錢|儲.{0,5}(?:旅行|應急|目標)/,
    '先寫低想儲嚟做乜，同大概幾時要用。譬如想去旅行，可以先查一程車費，唔使今日就定每月儲幾多。',
    '假如有個月要用多啲錢，你情願將日子推遲，定改細個目標？',
    '用紙寫一句：「我想為＿＿留起一筆錢。」再圈低一項你想先查清楚嘅使費，唔使喺呢度填銀碼。',
    '有個想法同即刻有錢剩係兩回事。今次只搞清楚想留畀邊件事，都算行咗一步。'],
  '睇清開支': [/記[帳賬數]|使費|開支|支出|收支|使咗去邊|錢去咗邊|用咗去邊|超支|超出預算|唔夠使|唔夠用|預算|月光|月尾(?:冇|無)錢/,
    '唔使由月頭補起。試記低最近三筆使費，望吓邊筆係原本預咗、邊筆係臨時先要用。',
    '有冇一筆當時好趕，過後先想起其實可以遲啲決定？冇都唔出奇。',
    '下次用完錢，先喺自己張紙記一筆：「用喺＿＿；原本有冇預到？」唔使交單據。',
    '記低係想睇清楚，唔係要將每一筆都分成啱同錯。'],
  '買之前停一停': [/衝動(?:消費|購物|買)|忍唔住買|亂買|手痕買|見到減價|限時優惠|購物籃|抵唔抵|買唔買|應唔應該買/,
    '如果唔係急用，可以先擺喺購物籃，聽朝再問自己：「冇咗個優惠，我仲想要佢嚟做乜？」',
    '你想買嘅係嗰樣嘢本身，定係見到個倒數先突然想要？',
    '今日留低貨品名就得，唔使結帳。聽朝講得出會幾時用，再決定。',
    '停一晚唔等於唔准買，係畀自己有得揀。'],
  '夾錢點分': [/夾(?:錢|份)|攤分|分[帳賬]|平分(?:飯錢|餐費)|AA制/i,
    '夾錢最好買之前就問：「今次想各自畀返自己嗰份，定一齊平分？」未講掂，唔急住代人落單。',
    '有冇一項係有人想要、有人未必會用？可以將嗰項分開傾。',
    '下次落單前試問一句：「我打算叫呢樣，各自畀返自己嗰份，好唔好？」',
    '講返點分先，唔需要估其他人負擔到幾多。'],
  '投資同買賣': [/股票|邊隻股|買咩股|買股|炒股|基金|虛擬貨幣|加密貨幣|比特幣|買入|沽出|投資|入市|放盤價/,
    '我唔會用張盤幫你揀股票，亦唔會話你應該幾時買賣。星位唔能夠話你知價格會點行。',
    '你最想搞清楚嘅係自己有咩疑問，定係有人催你即刻決定？',
    '先寫低一條未有答案嘅問題。要了解真實產品，就查正式產品資料；唔使跟住呢張盤做交易。',
    '財帛宮呢度講點樣作取捨，唔係投資建議。'],
  '財運預測': [/發達|發財|橫財|偏財|暴富|會唔會有錢|幾時有錢|幾時有財|今年(?:嘅)?財運|財運(?:點|好|如何)|賺(?:大錢|幾多)/,
    '張盤睇唔到你幾時發達，亦唔會話到將來有幾多錢。如果想講一件實在嘅事，可以由你想留起筆錢做乜講起。',
    '對你嚟講，「鬆動啲」係想少擔心邊一樣日常使費？',
    '揀一樣想預早安排嘅使費，喺自己張紙記低；唔使估幾時行好運。',
    '日子點過，唔係一粒星定好。'],
  '下注同號碼': [/六合彩|彩票|幸運(?:號碼|數字)|賭(?:波|馬|錢|博)|下注|投注|冧巴/,
    '我唔會用命盤估中獎號碼，亦唔會畀你下注貼士。幾粒星排喺邊，同開咩號碼係兩回事。',
    '如果只係好奇盤面，可以淨係睇下面財帛宮嗰格。',
    '想睇張盤，撳「對返財帛宮」就得，唔使買飛或者落注。',
    '呢份手記唔預測賽果或攪珠結果。']
};

const directionPrompts = {
  '比較兩條路': [/兩(?:條路|個(?:選擇|方向|方案))|[二兩]揀一|二選一|揀[AB]|比較(?:選擇|方向)|(?:轉工|轉行|工作|返工|做嘢|讀書|進修|升學|創業|留低|繼續讀).{0,10}(?:定係?|還是|抑或|或者|vs).{1,15}/i,
    '將兩條路各寫一行，再用同一條問題去比：「如果揀呢條，普通一個星期二，我會用時間做啲乜？」唔使今日揀定。',
    '嗰兩個星期二，邊一日有件事係你真係想試，而唔只係個名聽落好？',
    '每條路各寫一件平日會做嘅事。揀一件可以先試十分鐘嘅，試完先記低想唔想再做。',
    '比較係想知差別，唔係要張盤替你淘汰其中一條路。'],
  '試行第一步': [/第一步|下一步|踏出|拖延|遲遲未|唔知(?:由邊|點開[始頭]|從何)|由邊(?:度|樣)開始|點起步|點開始|想開始|點樣開始|未敢開始/,
    '留十分鐘做一個細到可以試完就停嘅動作。例如想寫嘢，就開張紙寫第一句，唔使先決定要寫成一本書。',
    '十分鐘之後，你想知道自己鍾唔鍾意做，定係想知卡喺邊一步？',
    '補完「我用十分鐘試＿＿」，揀個得閒嘅時段。做完只記一樣：仲想試，定想換個做法？',
    '試一次唔係答應以後都做。做到幾多，由你話事。'],
  '搵個方向': [/迷[惘茫]|冇方向|無方向|冇目標|搵(?:個|到)?方向|未有方向|搵唔到方向|唔知(?:自己)?(?:想做|適合|想要|鍾意)|唔知(?:將來|未來|前路)|揀方向|未來方向/,
    '未有方向，可以由上星期搵一幕：有冇一件小事，做完你仲想多留一陣？唔使即刻講出一個職業名。',
    '你想留低嘅，係嗰個題目、嗰種做法，定係當時可以自己掌握時間？',
    '記低嗰一幕，再寫一樣你想再試嘅細節。暫時諗唔到，就由聽日留意一次開始。',
    '一個片段未必係答案，但你可以親自再試，睇吓仲似唔似。'],
  '預測結果': [/注定|命中註定|一定(?:會|能|成功)|(?:幾時|會唔會|可唔可以|會不會).{0,5}(?:成功|有出息|夢想成真)|將來會(?:點|點樣|做咩|發生)|未來會(?:點|點樣|發生)/,
    '張盤睇唔到你將來一定會點。與其由我估結果，不如揀一樣你可以試完、再自己決定嘅事。',
    '你講嘅「成功」，係想做到一件咩事？用自己嘅講法就得。',
    '試將「會唔會成功」改成「我可以先試＿＿，睇吓＿＿」。答案可以等試完先填。',
    '命宮係一個對照選擇嘅角度，唔會替你寫結局。']
};

// These are editorial samples, not conclusions drawn from the visitor's question or stars.
const extraChapters = {
  官祿: { title:'臨收工，接唔接手？', scene:'差五分鐘收工，同事先叫你接手。幫睇一眼，同接晒成份，係兩件事。',
    cases:[['仲有少少時間','「我可以幫你睇初稿。你最想我睇邊一段？」'],['自己都有嘢要交','「我今日接唔晒。不過，如果只係對一個數，我可以同你睇一睇。」']], step:'下次應承之前，先講清楚你幫到邊一步。' },
  夫妻: { title:'想再見一面，點開口？', scene:'兩個人一齊睇完展覽，傾到門口都未夠喉。其中一個想再約，未知道對方點諗。',
    cases:[['想再約','「頭先你講嗰間書店，我都想去。下個星期六一齊行吓，好唔好？」'],['對方話未肯定','「好呀，你睇吓先。如果想去，再話我知。」']], step:'約一次就夠。講清楚想做乜，亦留位畀對方話唔去。' },
  田宅: { title:'返到屋企，邊一格先留畀自己？', scene:'鎖匙、信件同未摺嘅遮都堆喺門口。今晚只想收拾一個位，其他可以聽日先算。',
    cases:[['今晚只得兩分鐘','拎隻細碟放低自己串鎖匙，聽朝出門一伸手就攞到。'],['個位唔係得自己用','「我想喺左邊留個放鎖匙嘅位，會唔會阻住你？」傾好先郁其他人嘅嘢。']], step:'揀一件出門一定要帶嘅嘢，試放同一個位一晚。' },
  財帛: { title:'房價平咗，成程又係咪平咗？', scene:'去旅行時見到兩間房：一間近車站，一間遠少少。房價一眼睇到，來回車費未計。',
    cases:[['住近站','寫低一晚房價，再睇有邊一程可以行路。慳返嘅時間值唔值得，由你衡量。'],['住遠少少','查埋回程尾班車。如果要搭的士，先將嗰程車費加返落房價，再同近站嗰間比。']], step:'揀一晚，用「房價＋當晚來回車費」各寫一行；未知嘅一格留空，唔使估。' },
  命宮: { title:'轉工定進修？攤開一個星期二。', scene:'一邊係份新工，一邊係夜校。兩樣都吸引，但放入日曆之後，個星期二會好唔同。',
    cases:[['如果返新工','搵份同類招聘廣告，圈一句講日常工作嘅描述。嗰件事你想唔想日日做？'],['如果讀夜校','搵一堂真實上課時間，連交通一齊放入日曆。嗰晚原本做開嘅事，邊樣要調？']], step:'今次只查一樣未知道嘅資料：一項日常工作，或者一堂上課時間。未使揀。' }
};
const skipAfterword = topics => topics.some(t => ['先顧安全','暫停聯絡','尊重對方意願','下注同號碼','投資同買賣'].includes(t));

const notebooks = {
  官祿: {prompts:careerPrompts, general:generalCareerPrompt, intro:'官祿宮就係睇工作嗰格。', question:'最近工作上，想問啲乜？', example:'例如：幾樣嘢同時要交，點排先後？', privacy:'用虛構處境試，唔好寫真名、公司名或聯絡資料。'},
  夫妻: {prompts:lovePrompts, intro:'夫妻宮睇嘅係兩個人點相處，單身都可以參考。', question:'感情上，有咩想問？', example:'例如：想見多啲，但一開口就拗，點講好？', privacy:'用虛構處境試，唔好寫自己或對方嘅真名、帳號或聯絡資料。', general:[null,
    '冇特別問題都得。我哋先睇夫妻宮，諗吓自己鍾意點樣同人相處。',
    '有人陪你時，你最珍惜嘅係一齊做一件事，定係可以自在咁靜一陣？',
    '揀一個令你覺得自在嘅相處片段，寫低：「我鍾意嗰刻，因為＿＿。」',
    '而家有冇拍拖都用得着。唔似你嘅例子，唔使夾硬認。']},
  田宅: {prompts:familyPrompts, intro:'田宅宮係睇屋企同日常起居嗰格。', question:'屋企有件咩事，你想傾吓？', example:'例如：屋企啲家務點分，先唔使次次都係我提？', privacy:'用虛構例子就得，唔使寫家人真名、住址或聯絡資料。', general:[null,
    '冇特別問題都得。我哋由田宅宮講起：一個地方，點樣先住得自在？',
    '有冇一個位，坐低就可以抖一抖？一張凳都可以，唔一定要有自己間房。',
    '今晚揀屋企一個自己用嘅位，放低一樣令你覺得舒服嘅嘢，試一晚就得。',
    '自己住定同人住，都唔使套落某一種家庭。生活例子似你先攞嚟用。']},
  財帛: {prompts:moneyPrompts, intro:'財帛宮係睇點用手上資源嗰格，唔係估身家。', question:'關於用錢，有咩想傾？', example:'例如：想儲錢去旅行，點開始？', privacy:'用虛構例子就得，唔使寫真實金額、戶口或單據資料。', general:[null,
    '冇特別問題都得。我哋睇財帛宮，用「想買一樣嘢」做例，唔使交代身家。',
    '如果同一樣嘢可以遲一日先買，有咩資料會幫你決定？',
    '諗一樣你見過但未買嘅嘢，寫低佢用嚟做乜。唔買都可以完成呢一步。',
    '星位可以當一個角度，唔會決定你有幾多錢。']},
  命宮: {prompts:directionPrompts, intro:'命宮係呢度用嚟對照自己點揀路嗰格，唔係預告將來。', question:'諗緊下一步，有邊件事想問？', example:'例如：轉工定進修，兩條路點揀？', privacy:'用虛構選擇就得，唔使寫真名、公司名或聯絡資料。', general:[null,
    '冇定好目標都可以睇。我哋由命宮開始，諗吓有新嘢想試嗰陣，咩會幫你行出第一步。',
    '試想像有一個鐘自己安排：邊件小事你願意分十分鐘畀佢？',
    '留低一句：「如果有十分鐘，我想試＿＿。」得閒先試，唔使而家揀一世。',
    '生活例子啱用先留低，唔啱唔使夾硬跟。']}
};

function notebookTopics(question, prompts) {
  for (const boundary of ['先顧安全','暫停聯絡','尊重對方意願']) if (prompts[boundary]?.[0].test(question)) return [boundary];
  // shortcut: only explicit topics and priorities; if more than one fits, let the reader choose.
  const topics = new Set(), preferred = new Set();
  let hasPriority = false;
  const parts = question.normalize('NFKC').split(/[,。！？!?;；、\n]|但[係是]?|不過|而[係是]|(?=唔想|不想|(?:只(?:係)?|淨係|主要|反而|又|仲)想)|\bbut\b/i);
  for (let part of parts) {
    if (!part.trim()) continue;
    // Refusing overtime is a request about hours, unlike refusing to discuss overtime.
    const reduceHours = /(?:唔想|不想)(?:再|成日|日日|晚晚|繼續|被迫|\s)*(?:加班(?!費)|OT\b|超時工作)/i.test(part);
    const declined = /(?:唔係|不是|並非)(?:想|要|問|傾)|唔想|不想|唔打算|冇打算|唔考慮|唔(?:再)?諗(?:住)?|不打算|無意|暫不考慮|(?:唔係|不是)(?:我)?(?:最)?想(?:問|傾|講)|\b(?:not asking|not interested|(?:don't|do not) want)\b/i.test(part);
    // Wanting reminders or intrusions to stop is different from declining to discuss that topic.
    const familyBurden = prompts === familyPrompts && /(?:唔想|不想)(?:再|成日|次次|日日|繼續)*(?:一個人做|自己做|做晒|做哂|做家務|洗碗|洗衫|晾衫|倒垃圾|收枱|(?:提|催).{0,9}(?:家務|洗碗|收枱|倒垃圾)|.{0,9}(?:未問|唔敲門)就入|[嘈嗌鬧]交)/.test(part);
    const wantsChange = (prompts === moneyPrompts && /(?:唔想|不想)(?:再|次次|成日|繼續)*(?:超支|亂買|衝動(?:消費|購物))/.test(part)) ||
      (prompts === directionPrompts && /(?:唔想|不想)(?:再|成日|繼續)*拖延/.test(part));
    if (declined && !reduceHours && !familyBurden && !wantsChange) continue;
    const first = /只(?:係)?想|淨係想|主要想|反而想|想先|最想|先(?:問|傾|處理)|\bonly (?:ask|want)/i.test(part);
    if (first) {
      hasPriority = true;
      part = part.split(/之後|跟住|然後|再(?:傾|諗|問|談|睇|考慮)/,1)[0];
    }
    const financialDecision = prompts === moneyPrompts && (moneyPrompts['投資同買賣'][0].test(part) || moneyPrompts['下注同號碼'][0].test(part));
    for (const [topic,[words]] of Object.entries(prompts)) {
      if (financialDecision && topic === '買之前停一停') continue;
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
  if (prompts === familyPrompts && found.size > 1 && !/鬧交|嗌交|嘈交|吵架|爭執|意見唔同|分歧|拗撬|冷戰|道歉/.test(question)) found.delete('傾返一件事');
  return [...found];
}

const NOTEBOOK_EXAMPLE = Object.freeze({ year:'1995', month:'08', day:'15', time:'09:30', precision:'exact', gender:'male', place:'' });

// The renderer accepts chart evidence only, never the birth form, alias or free-text question.
function makePalaceCard(r) {
  const canvas = document.createElement('canvas');
  canvas.width = 900; canvas.height = 1600;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('card');
  const fonts = '"PingFang HK","Noto Sans CJK TC",sans-serif';
  const write = (value,x,y,size,colour='#f3e7cd',family=fonts) => {
    c.fillStyle=colour; c.font=size+'px '+family; c.fillText(value,x,y);
  };
  function paragraph(value,y,size,step) {
    c.font=size+'px '+fonts;
    let line='';
    for (const char of value) {
      if (line && c.measureText(line+char).width>690) {write(line,100,y,size);y+=step;line='';}
      line+=char;
    }
    if (line) write(line,100,y,size);
  }
  c.fillStyle='#192a24'; c.fillRect(0,0,900,1600);
  c.strokeStyle='#b69868'; c.lineWidth=2; c.strokeRect(42,42,816,1516);
  write('玄 與 九 爺　／　手 記',100,156,32,'#dfbd87');
  write(r.label,96,328,80,'#f3e7cd','serif');
  write(palaceTitle(r.palace)+'　·　'+r.branch+'位',100,411,38);
  c.strokeStyle='#72816a'; c.beginPath(); c.arc(450,635,136,0,2*Math.PI);c.stroke();
  BRANCHES.forEach((b,i)=>{
    const a=i*Math.PI/6-Math.PI/2;
    c.beginPath(); c.arc(450+136*Math.cos(a),635+136*Math.sin(a),b===r.branch?10:4,0,2*Math.PI);
    c.fillStyle=b===r.branch?'#e5bb7f':'#8a9b84';c.fill();
  });
  c.textAlign='center';write(r.branch,450,660,74,'#e5bb7f','serif');c.textAlign='left';
  write('壹　／　盤面',100,874,30,'#dfbd87'); paragraph(readingFact(r),960,40,62);
  write('貳　／　留一問',100,1222,30,'#dfbd87'); paragraph(r.question,1306,36,56);
  write('虛構例盤　·　傳統文化參考',100,1487,26,'#bfccb9');
  const url=canvas.toDataURL('image/png');
  if (!url.startsWith('data:image/png;base64,')) throw new Error('card');
  return url;
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
    const house=add('text',{x,y:y+4,'text-anchor':'middle','font-size':11,fill:j===selected?'#ffbe92':'#ede0ba',class:'dial-house'},palaces.find(p=>p.earthlyBranch===b).name);
    house.style.animationDelay=j*.075+'s';
    add('text',{x:dx,y:dy+4,'text-anchor':'middle','font-size':10,fill:'#c6d2b2'},b);
  });
  const points=[selected,(selected+4)%12,(selected+8)%12,selected,(selected+6)%12].map(j=>pt(j,84).join(',')).join(' ');
  add('polyline',{points,fill:'none',stroke:'#c99266','stroke-width':1.3,pathLength:1,class:'dial-thread'});
  add('circle',{cx:160,cy:160,r:42,fill:'#192b23',stroke:'#b69263'});
  add('text',{x:160,y:158,'text-anchor':'middle',fill:'#eed3a1','font-size':22,'font-family':'serif'},palace);
  add('text',{x:160,y:179,'text-anchor':'middle',fill:'#dbc199','font-size':12},branch+' 位');
}

export function attachZiwei(dialog, content, paint, openBook) {
  const emptyInput = () => ({ year: '', month: '', day: '', precision: 'unknown', time: '', gender: '', place: '' });
  let alias = '', question = '', chosenTopic = '', ritualTimer;
  let activeHouse = '', cardFromChart = false, lastAction = '';
  const notebook = () => notebooks[focusPalace];
  const topicsForVisit = () => notebookTopics(question, notebook().prompts);
  const selectedTopic = topics => topics.includes(chosenTopic) ? chosenTopic : topics.length === 1 ? topics[0] : '';
  const familyScenes = topic => topic === '家務分擔' && selfManagedChores(question) ? ownChoreScenes : topic === '約家人見面' ? visitScenes : null;
  let input = emptyInput(), chart = null, reviewed = null, active = false, focusPalace = '';
  const action = (label, name, kind = 'primary', palace) => `<button class="button ${kind}" type="button" data-ziwei="${name}"${palace ? ` data-palace="${palace}"` : ''}>${label}</button>`;
  const label = '';
  const privacy = '<p class="privacy-note">只用虛構資料；資料只留本頁，不保存。</p>';
  const rules = '<details class="ziwei-rules"><summary>排盤方式</summary><p>採用西曆及出生地當地鐘錶時間，不校正夏令時間或真太陽時。23:00起按翌日排盤；閏月初一至十五按前月，十六日起按後月。按本命四化與當期運限，整理2026–2028嘅節奏。</p></details>';

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
    const plaques = {
      官祿: ['官','留低定轉彎'], 夫妻: ['夫','關係拉扯'], 田宅: ['田','界線與歸屬'],
      財帛: ['財','籌碼與節奏'], 命宮: ['命','大運轉折']
    };
    const cards = Object.entries(READING_TOPICS).map(([palace, topic]) => {
      const [seal, line] = plaques[palace], house = palaceTitle(palace);
      return `<button class="topic-card" type="button" data-ziwei="focus" data-palace="${palace}" aria-label="${topic.label}，${house}" aria-describedby="topic-hint-${palace}">
        <span class="seal-badge" aria-hidden="true">${seal}</span>
        <span class="topic-copy"><span class="topic-meta"><strong>${topic.label}</strong><span class="topic-palace">${house}</span></span><span class="topic-hint" id="topic-hint-${palace}">${topic.hint}・${line}</span></span>
        <span class="topic-arrow" aria-hidden="true">›</span>
      </button>`;
    }).join('');
    paint(`<header class="topic-heading"><p class="topic-eyebrow">玄・輕輕合上摺扇</p><h2 id="dialog-title">${hello}想由邊方面睇起？</h2><p class="topic-guide">先揀你今晚最在意嗰一件事，其餘之後隨時可以再睇。</p></header><div class="desk-topics" role="group" aria-label="話題選擇">${cards}</div>`, 'interaction');
  }
  const get = id => document.getElementById(id);
  const formError = '<p id="ziwei-error" class="form-error" role="alert"></p>';
  function showAlias() {
    paint(`<p class="desk-speaker">玄 · ${READING_TOPICS[focusPalace].label}手記　01 / 03</p><h2 id="dialog-title">點稱呼你好？</h2><form id="career-alias-form" autocomplete="off" novalidate><div class="profile-fields"><label for="ziwei-alias">寫個化名，等我為你開卷。<input id="ziwei-alias" maxlength="18" placeholder="例如：阿澄" required></label></div>${privacy}${formError}<div class="dialog-actions"><button class="button primary" type="submit">填生辰</button>${action('返去揀話題','choose-focus','secondary')}</div></form>`, 'career-setup');
    get('ziwei-alias').value = alias;
  }
  function showNotebookBirth() {
    chart = reviewed = null;
    paint(`<p class="desk-speaker">玄 · 生辰入盤　02 / 03</p><h2 id="dialog-title">留低出生時間，等玄為你開盤。</h2><form id="career-birth-form" autocomplete="off" novalidate><div class="profile-fields"><label for="ziwei-date">西曆出生日期<input id="ziwei-date" type="date" min="1900-01-01" required></label><label for="ziwei-time">出生地當地時間<input id="ziwei-time" type="time" required></label><label for="ziwei-gender">性別<select id="ziwei-gender" required><option value="">請選擇</option><option value="male">男</option><option value="female">女</option></select></label></div><p class="privacy-note">只用虛構生辰試閱；未知時辰時，先確認資料，唔使勉強估。</p>${formError}<div class="dialog-actions"><button class="button primary" type="submit">下一步</button>${action('返回稱呼','edit-alias','secondary')}</div></form>`, 'career-setup');
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
    paint(`<p class="desk-speaker">${reading.label}　／　起盤</p><h2 id="dialog-title">為你點星</h2><section class="ritual-box" id="ritual-box"><p class="ritual-name" id="ritual-name"></p><p id="ritual-birth" class="ritual-birth"></p><svg id="career-dial" viewBox="0 0 320 320" aria-hidden="true"></svg><span class="ritual-seal" id="ritual-seal"></span><p class="ritual-fact" id="ritual-fact"></p></section>${openBook ? '' : action('直接睇六格','read-comic','secondary')}`, 'career-ritual');
    get('ritual-name').textContent = alias + '嘅' + reading.label + '盤';
    get('ritual-birth').textContent = input.year + ' 年 ' + input.month + ' 月 ' + input.day + ' 日　' + input.time;
    get('ritual-seal').textContent = (openBook ? '命盤已成　·　' : '') + (reading.opposite ? '取對宮參看' : '本宮主星入卷');
    get('ritual-fact').textContent = openBook ? '先為你點亮'+reading.label+'嗰盞燈；坐穩，唔使急住有答案。' : readingFact(reading);
    const svg = get('career-dial');
    drawNotebookDial(svg, chart.palaces, reading);
    clearTimeout(ritualTimer);
    const current = () => dialog.open && get('career-dial') === svg;
    const reveal = () => {
      if (!current()) return;
      if (!openBook) { showComic(); return; }
      const topics=topicsForVisit(), topic=topics.find(t=>skipAfterword([t])) || selectedTopic(topics);
      const entry=familyScenes(topic)===ownChoreScenes ? soloChores : notebook().prompts[topic] || notebook().general;
      const reply=question && !topic ? '你提到嘅事，唔可以單憑張盤斷定。先由'+palaceTitle(focusPalace)+'嗰章對照你見過嘅情況。' : entry[1];
      try { openBook({chart,input,alias,question,subject:reading.label,reply,offer:!skipAfterword(topics)}); }
      catch { showQuestion(); errorMessage({field:'question',message:'未能打開今次嘅命書。請核對資料再試。'}); }
    };
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      ritualTimer = setTimeout(reveal, openBook ? 700 : 0);
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
  function afterword() {
    const order = [focusPalace, ...Object.keys(extraChapters).filter(key => key !== focusPalace)];
    return `<section class="xj-afterword" aria-labelledby="xj-extra-title">
<div class="xj-rule"><span>玄與九爺　／　卷後</span><span>五篇選讀</span></div>
<div class="xj-cover"><img src="assets/office-desk-chair-v12.jpg" alt="玄收起摺扇，灰狐九爺坐喺枱邊。" width="1080" height="1920">
<div class="xj-invite"><small>可選加閱　·　延伸手記</small><h3 id="xj-extra-title">同一件事，<br>換個處境呢？</h3>
<p><b>九爺</b>　頭先嗰一步，你已經可以試。想睇遇到另一種情況可以點做？揀一篇，玄同你翻開兩個例子。</p></div></div>
<div class="xj-index"><strong>翻開延伸手記樣板</strong><p>先放你啱啱睇嘅${READING_TOPICS[focusPalace].label}篇。每篇都有兩個虛構處境，睇完可以帶走文字版。</p><small>只供試讀，未開放購買。</small></div>
${order.map((palace,i) => {
      const c=extraChapters[palace], label=READING_TOPICS[palace].label;
      return `<details name="xj-shelf"><summary><span><small>${i===0?'接住今篇':'另篇試讀'}　／　${label}</small>${c.title}</span><span class="xj-plus" aria-hidden="true"></span></summary>
<article class="xj-sample"><small>玄開卷　／　${label}篇 · 虛構例子</small><h4>${c.title}</h4><p class="xj-preface"><b>玄</b>　${c.scene}</p>
<div class="xj-scenes">${c.cases.map(([when,what],j)=>`<section><small>${j?'貳':'壹'}　／　${when}</small><p>${what}</p></section>`).join('')}</div>
<p class="xj-try"><b>九爺留一句</b><br>${c.step}</p><div class="dialog-actions">${action('睇'+label+'篇收錄咩','preview-review','primary',palace)}</div></article></details>`;
    }).join('')}
<button type="button" class="xj-back" data-ziwei="read-comic">↑　只睇免費結果，返原篇</button></section>`;
  }
  function showComic() {
    clearTimeout(ritualTimer);
    if (!notebook() || !alias || chart?.status !== 'ready' || reviewed !== JSON.stringify(input)) return;
    const reading = getPalaceReading(chart, focusPalace);
    if (!reading) { showResult(); return; }
    const [first, second] = reading.opposite?.stars || reading.stars;
    const topics = topicsForVisit();
    const topic = selectedTopic(topics);
    const choose = !topic && topics.length > 1;
    const scenes = familyScenes(topic);
    const [,answer,ask,tryIt,close] = scenes === ownChoreScenes ? soloChores : notebook().prompts[topic] || notebook().general;
    const lead = choose ? '你提咗幾件事，想先傾邊一件？揀一樣就得，唔使再填生辰。'
      : question && !topic ? '我唔想替你估。你可以補一句最想講嘅事，或者先由' + palaceTitle(focusPalace) + '睇起。' : answer;
    const lines = [
      ['九爺', lead], ['玄 · 盤面所見', notebook().intro + readingFact(reading) + (focusPalace === '田宅' && reading.opposite ? '「子女」係對宮個名，唔係話你有小朋友。' : '')],
      ['玄 · 生活對照', first.name + '有「' + first.theme + '」呢個讀法。' + (['先顧安全','尊重對方意願'].includes(topic) ? '呢個係傳統比喻，唔係叫你接觸對方。' : (focusPalace === '田宅' ? '試想一幕：' : '') + (scenes?.[first.name] || first.behaviour))],
      ['九爺', (second ? second.name + '可以從「' + second.theme + '」去睇。' : '') + ask],
      ['玄', close], ['九爺 · 可以試吓', tryIt]
    ];
    lastAction = tryIt;
    paint(`<header class="comic-head"><p>玄與九爺 <span>／</span> 免費${reading.label}手記</p><h2 id="dialog-title"></h2><p class="comic-caption">六格對話 · ${palaceTitle(focusPalace)} <span aria-hidden="true">↓</span></p></header><ol class="career-strip" id="career-strip" aria-label="六格故事"></ol><div class="comic-end">${action('對返'+palaceTitle(focusPalace),'view-result')}${action('帶走手記卡','card-comic','secondary')}<div class="comic-alternates">${topics.length > 1 && topic ? action('返去揀重點','reset-career-topic','secondary') : ''}${action('同一張盤，再問一件事','ask-again','secondary')}${action('修改生辰','career-birth','secondary')}</div></div>${skipAfterword(topics) ? '' : afterword()}`, 'career-comic');
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
  function showCard() {
    const r=getPalaceReading(chart, cardFromChart ? activeHouse : focusPalace);
    if (!r) return;
    paint(`<p class="desk-speaker">玄與九爺　／　留一張卡</p><h2 id="dialog-title">${palaceTitle(r.palace)}手記卡</h2><p>圖入面只留宮位、主星同一條可以帶走嘅問題，唔印化名、生辰或原句。</p><figure class="takeaway" id="takeaway"></figure><div id="takeaway-download"></div><div class="dialog-actions">${action(cardFromChart?'返去睇呢一宮':'返原篇手記','card-back','secondary')}<button class="button secondary" type="button" data-action="close">完成，返回首頁</button></div>`, 'ziwei');
    try {
      const url=makePalaceCard(r), image=document.createElement('img'), download=text('a','下載手記卡（PNG）','button primary');
      image.alt=r.label+'手記卡。'+readingFact(r)+' '+r.question; image.src=url;
      download.href=url; download.download='Xuan-Jiuye-card-'+palaceTitle(r.palace)+'.png';
      get('takeaway').append(image);get('takeaway-download').append(download);
    } catch {
      get('takeaway').append(text('p',readingFact(r)),text('p',r.question));
      get('takeaway-download').append(text('p','呢個瀏覽器暫時整唔到圖片；可以抄低上面嗰一問，或者返去繼續睇。'));
    }
  }
  function showExtra(review, palace=focusPalace) {
    if (!lastAction || !Object.hasOwn(extraChapters,palace) || skipAfterword(topicsForVisit())) return;
    const r=getPalaceReading(chart,palace), c=extraChapters[palace];
    if (!r) return;
    if (review) {
      paint(`<p class="desk-speaker">玄與九爺　／　卷後選讀</p><h2 id="dialog-title">核對試讀內容</h2><p class="extra-chapter-name">${r.label}篇　／　${c.title}</p><p>同一張例盤，今篇睇${palaceTitle(r.palace)}。打開就有盤上嘅星、頭先兩個虛構處境同九爺留低嗰一步，成篇可以下載。</p><p class="privacy-note">免費示範。唔會落單、扣款或寄電郵。</p><div class="dialog-actions">${action('打開示範手記','preview-report','primary',palace)}${action('唔加閱，返原篇','read-comic','secondary')}</div>`, 'ziwei');
      return;
    }
    paint(`<p class="desk-speaker">延伸手記　／　試行 2 · 2</p><h2 id="dialog-title">${r.label} · 示範手記</h2><article class="extra-pages" id="extra-pages"></article><p class="privacy-note">呢份係本頁試讀，唔係已購買嘅報告。</p><div id="extra-copy"></div><div class="dialog-actions">${action('返原篇免費手記','read-comic','secondary')}<button class="button secondary" type="button" data-action="close">完成，返回首頁</button></div>`, 'ziwei');
    const stars = r.opposite?.stars || r.stars;
    const sections=[
      ['今篇睇邊度',r.label+'篇 · '+palaceTitle(r.palace)+'\n'+c.title],
      ['張盤見到乜',readingFact(r)+'\n'+stars.map(s=>s.name+'可以從「'+s.theme+'」去睇。').join('')],
      ['點樣對照','虛構例子，唔係預測。玄：'+c.scene+'\n\n'+c.cases.map(([when,what])=>when+'：'+what).join('\n\n')],
      ['留一步試吓',c.step]
    ];
    for (const [title,body] of sections) get('extra-pages').append(text('h3',title),text('p',body));
    const a=text('a','下載呢份示範手記（文字檔）','button primary');
    a.download='Xuan-Jiuye-sample-'+r.label+'.txt';
    a.href='data:text/plain;charset=utf-8,'+encodeURIComponent('\uFEFF玄與九爺　／　虛構例盤 · 免費示範\n\n'+sections.map(pair=>pair.join('\n')).join('\n\n'));
    get('extra-copy').append(a);
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
  function houseButton(label,kind,name) {
    const b=text('button',label,'house-link'); b.setAttribute('type','button');b.setAttribute('data-ziwei',kind);b.setAttribute('data-palace',name);return b;
  }
  function showPalace(name) {
    const reading = getPalaceReading(chart, name);
    const note = document.getElementById('ziwei-palace-note');
    note.replaceChildren();
    activeHouse=name;
    content.querySelectorAll('[data-ziwei="palace"], [data-ziwei="inspect-house"]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.palace === name)));
    if (!reading) { note.append(text('p', '呢格嘅星曜資料唔齊，可以打開下面嘅十二宮，或者返去核對出生資料。')); return; }
    const { stars, opposite } = reading;
    const visibleStars = opposite ? opposite.stars : stars;
    const fact = readingFact(reading);
    const scenes = name === '田宅' && focusPalace === name ? familyScenes(selectedTopic(topicsForVisit())) : null;
    note.append(text('h3', '玄 · ' + reading.label), text('p', fact, 'reading-fact'), text('p', scenes === ownChoreScenes ? '諗返一餐飯之後，你最想先執好邊樣，令自己用得舒服？' : scenes === visitScenes ? '如果想約家人見面，幾時、見幾耐先啱自己？' : reading.lead));
    for (const star of visibleStars) {
      const section = document.createElement('section'); section.className = 'reading-star';
      section.append(text('h4', star.name + ' · ' + star.theme));
      const scene=scenes?.[star.name] || star.behaviour;
      if (scene) section.append(text('p',scene));
      note.append(section);
    }
    note.append(text('p', '九爺：' + (scenes === visitScenes ? '想見面嗰次，你願意預幾多時間？' : reading.question)));
    const evidence = document.createElement('details'); evidence.className = 'reading-evidence';
    evidence.append(text('summary', '解讀依據'), text('p', opposite
      ? '本宮冇主星，傳統紫微斗數會參考正對面嗰一宮。借嚟睇嘅星仍然喺對宮，唔會搬入本宮。'
      : '呢度讀嘅係本宮主星。兩粒星可以有唔同取向，唔代表你每次都會兩樣一齊做。'),
      text('p', '星曜係傳統象徵。近況啱唔啱，由你用生活經驗對照；一粒星唔足以判定發生過咩事。'));
    note.append(evidence,houseButton((opposite?'去對宮睇原星：':'睇對面：')+palaceTitle(OPPOSITE[name]),'open-opposite',OPPOSITE[name]),houseButton('喺十二宮搵返'+palaceTitle(name),'locate-house',name),houseButton('帶走呢一宮嘅手記卡','card-chart',name));
  }
  function showResult(focusNote = false, opened = focusPalace || '命宮') {
    if (chart.status === 'needs-input') {
      paint(`${label}<h2 id="dialog-title">資料未足，先唔落盤。</h2><p class="dialog-lead">出生時間同性別齊咗，再返嚟排盤。</p><div class="dialog-actions">${action('返回資料', 'edit-options')}</div>${privacy}`, 'ziwei');
      return;
    }
    const initialPalace = focusPalace || '命宮';
    paint(`${label}<h2 id="dialog-title">十二宮命盤</h2><p class="dialog-lead">先由「${READING_TOPICS[initialPalace].label}」睇起。想睇全盤，可以打開下面嘅十二宮。</p><p id="ziwei-result-context" class="reading-fact"></p><div class="ziwei-reading" id="ziwei-reading"></div><div class="dialog-actions palace-switches">${Object.entries(READING_TOPICS).map(([name, topic]) => `<button class="button secondary" type="button" data-ziwei="palace" data-palace="${name}" aria-pressed="false">${topic.label}</button>`).join('')}</div><section id="ziwei-palace-note" tabindex="-1" aria-live="polite" aria-atomic="true"></section><details class="ziwei-chart-details"><summary>打開十二宮命盤</summary><div class="ziwei-scroll" tabindex="0" role="region" aria-label="十二宮命盤，窄螢幕可左右捲動"><div class="ziwei-grid" id="ziwei-grid"></div></div></details>${rules}<p class="privacy-note">只作傳統文化參考，不作健康、投資或人生決定依據。本命四化與三年運限或完整論命。</p><div class="dialog-actions">${notebook() && getPalaceReading(chart,focusPalace) ? action('再睇六格對話','read-comic') : ''}${action('修改資料', notebook() ? 'career-birth' : 'edit-options', notebook() ? 'secondary' : 'primary')}</div>${privacy}`, 'ziwei-result');
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
      cell.append(houseButton('睇'+palaceTitle(palace.name),'inspect-house',palace.name)); grid.append(cell);
    }
    const centre = document.createElement('div'); centre.className = 'ziwei-centre';
    centre.append(text('h3', '紫微斗數'), text('p', `${input.year}年${input.month}月${input.day}日 ${input.time}`), text('p', `排盤採用農曆：${chart.lunarDate}`), text('p', chart.fiveElementsClass)); grid.append(centre);
    const soul = chart.palaces.find(p => p.name === '命宮'), body = chart.palaces.find(p => p.isBodyPalace);
    const reading = document.getElementById('ziwei-reading');
    reading.append(text('p', `命宮：${soul.earthlyBranch}位・${starNames(soul)}。身宮：${body.name}・${body.earthlyBranch}位。`));
    showPalace(opened);
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
        return errorMessage({field:['year','month','day'].includes(field)?'date':field,message:field==='time'?'要有出生時間先排到呢張盤；唔確定可以先核對資料。':field==='gender'?'請選擇呢份生辰資料嘅性別。':issue.message});
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
    if (name === 'focus' && Object.hasOwn(READING_TOPICS,trigger.dataset.palace)) { focusPalace=trigger.dataset.palace; showAlias(); }
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
    if (chart?.status==='ready' && reviewed===JSON.stringify(input)) {
      if (['inspect-house','open-opposite'].includes(name) && Object.hasOwn(HOUSE_GUIDES,trigger.dataset.palace)) {
        showPalace(trigger.dataset.palace); get('ziwei-palace-note').focus();
      }
      if (name==='locate-house' && Object.hasOwn(HOUSE_GUIDES,trigger.dataset.palace)) {
        const group=content.querySelector('.ziwei-chart-details'); group.open=true;
        group.querySelector('[data-ziwei="inspect-house"][data-palace="'+trigger.dataset.palace+'"]').focus();
      }
      if (name==='card-comic'||name==='card-chart') {cardFromChart=name==='card-chart'; showCard();}
      if (name==='card-back') {if (cardFromChart) showResult(true,activeHouse); else showComic();}
      if (name==='preview-review'||name==='preview-report') showExtra(name==='preview-review',trigger.dataset.palace);
    }
    if (name === 'view-result' && chart?.status === 'ready' && reviewed === JSON.stringify(input)) showResult(Boolean(notebook()));
    if (name === 'calculate' && !notebook()) {
      if (reviewed !== JSON.stringify(input)) { showReview(); return; }
      try { chart = calculateZiwei(input); if (chart.status !== 'ready') showResult(); else showReveal(); }
      catch { chart = null; document.getElementById('ziwei-error').textContent = '未能建立命盤。請核對資料或重新載入後再試；未有排盤結果。'; }
    }
  });
  function clearVisit() { clearTimeout(ritualTimer); alias=question=chosenTopic=activeHouse=lastAction=''; cardFromChart=false; input=emptyInput(); focusPalace=''; chart=reviewed=null; }
  dialog.addEventListener('close', () => { if (!dialog.open) { clearVisit(); active=false; } });
  return skipIntro => { clearVisit(); active=true; if (skipIntro) showDate(); else showEntrance(); };
}
