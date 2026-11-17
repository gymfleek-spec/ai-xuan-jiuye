// Original fictional stories. Birth dates never determine their content.
export const WELCOME = [
  { speaker: '玄', text: '入嚟坐。今日，想同我哋傾啲乜？' },
  { speaker: '九爺', text: '唔使諗住講得好聽。講你真正在意嗰樣就得。' },
  { speaker: '玄', text: '開始之前，先核對出生日期、時間同排盤參數。我哋按盤面逐樣睇，唔會替你決定。' }
];

export const GOALS = { clarity: '釐清選擇', understand: '理解自己', action: '一個小行動' };

export const DETAIL_STEPS = [
  { title: '你知道自己幾點出世？', hint: '不知道可以直接選。唔會替你補一個時間。', fields: [
    { key: 'time_precision', label: '時間準確程度', options: { '': '未提供', exact: '確切時間', approximate: '約略時間', unknown: '不知道' } },
    { key: 'birth_time', label: '出生時間', type: 'time' }
  ] },
  { title: '你喺邊度出世？', hint: '國家／地區同城市就得，唔需要詳細地址。', fields: [
    { key: 'birth_country', label: '出生國家／地區' }, { key: 'birth_city', label: '出生城市' }
  ] },
  { title: '你而家住喺邊個城市？', hint: '與出生地分開填，唔需要門牌或定位。', fields: [
    { key: 'residence_country', label: '現居國家／地區' }, { key: 'residence_city', label: '現居城市' }
  ] },
  { title: '你而家嘅感情狀況係？', hint: '唔係單身，唔一定等於已婚。', fields: [
    { key: 'relationship', label: '感情狀況', options: { '': '未提供', single: '單身', dating: '交往中', married: '已婚', other: '其他', private: '不想透露' } }
  ] },
  { title: '今次，你最想問一件乜嘢事？', hint: '唔需要填其他人嘅姓名、聯絡資料或證件資料。最多500字。', fields: [
    { key: 'question', label: '想問嘅事', type: 'textarea' }
  ] }
];

export function emptyDetails() {
  return Object.fromEntries(DETAIL_STEPS.flatMap(step => step.fields.map(field => [field.key, ''])));
}

export function getDetailsError(answers) {
  for (const field of DETAIL_STEPS.flatMap(step => step.fields)) {
    const value = answers[field.key];
    if (typeof value !== 'string' || value.length > (field.key === 'question' ? 500 : 80)) return { field: field.key, message: '答案過長或格式不正確。' };
    if (field.options && !Object.hasOwn(field.options, value)) return { field: field.key, message: '請核對選項。' };
  }
  if (['exact', 'approximate'].includes(answers.time_precision)) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(answers.birth_time)) return { field: 'birth_time', message: '請填有效時間，或選不知道。' };
  } else if (answers.birth_time) return { field: 'birth_time', message: '未知時間唔會補造時間值。' };
  return null;
}

export function getBirthDateError({ year, month, day }, today = new Date()) {
  for (const [field, value] of Object.entries({ year, month, day })) {
    if (!/^\d+$/.test(value)) return { field, message: '請填齊西曆年、月、日，只用數字。' };
  }
  const y = Number(year), m = Number(month), d = Number(day);
  if (year.length > 4 || y < 1 || y > 9999) return { field: 'year', message: '請輸入 1 至 9999 之間嘅西曆年份。' };
  if (month.length > 2 || m < 1 || m > 12) return { field: 'month', message: '月份應該係 1 至 12。' };
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day.length > 2 || d < 1 || d > days[m - 1]) return { field: 'day', message: '呢個月份冇呢一日，請再核對。' };
  const date = y * 10000 + m * 100 + d;
  const now = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  if (date > now) return { field: 'year', message: '出生日期唔可以係未來日子。' };
  return null;
}

export const STORIES = {
  work: {
    topic: '工作', title: '留低，定係轉個彎？',
    intro: [
      { speaker: '故事館', text: '阿澄推門入嚟，電話仲停喺招聘網站。佢坐低第一句就問：「我係咪應該辭職？」' },
      { speaker: '玄', text: '「走之前，不如先分清楚：你唔想再做呢份工，定係唔想再用而家嘅方式做落去？」' }
    ],
    question: '如果係你，會先做邊件事？',
    choices: [
      { id: 'talk', label: '先同主管講清楚，想改變啲乜', outcome: '阿澄約咗一次傾談。工作未即刻變好，但佢終於講得出，自己唔想再無限加班。', speaker: '九爺', line: '「原來你最想辭嘅，係嗰個唔敢開口嘅自己。」', reflection: '留低唔一定係妥協。當你知道想改變嘅係乜，先可以觀察對方有冇空間回應。', action: '寫低一件想改變嘅工作安排，再約一個合適時間傾。傾完之後，為自己定一個回顧日期。' },
      { id: 'explore', label: '先了解其他機會，唔急住辭職', outcome: '阿澄更新咗履歷，約咗一次行業交流。佢未有答案，但發現自己唔係得一條路。', speaker: '玄', line: '「行出去睇下，同即刻走，係兩件事。」', reflection: '轉變未必要由一個大決定開始。先了解選項，可以幫你分清係一時疲累，定係長期唔適合。', action: '揀一個你有興趣嘅職位，列出已經識同仲要了解嘅事。今個星期只做一個細小嘅了解行動。' }
    ]
  },
  love: {
    topic: '感情', title: '嗰句訊息，仲傳唔傳？',
    intro: [
      { speaker: '故事館', text: '夜晚十一點，阿晴將同一句說話打咗又刪。對話框停咗好耐，佢仲未捨得熄。' },
      { speaker: '玄', text: '「你想講清楚，定係想佢證明，你仍然重要？」九爺冇插嘴，只係輕輕將電話推返畀佢。' }
    ],
    question: '嗰句說話，你會點處理？',
    choices: [
      { id: 'send', label: '傳一次，清楚講自己想講嘅事', outcome: '訊息送出咗。畫面顯示已讀，但冇回覆。阿晴第一次試住唔再用通知聲，決定自己今晚點過。', speaker: '玄', line: '「表達係你嘅選擇，回應唔完全喺你手上。」', reflection: '傳訊息本身冇對錯。你可以真誠表達，但唔需要用對方有冇回覆，判斷自己值唔值得被在乎。', action: '為等候定一個你接受到嘅界線。之後安排一件唔需要對方參與、而你自己想做嘅事。' },
      { id: 'write', label: '先寫低，今晚唔傳', outcome: '阿晴將四行字寫喺紙上，收起電話。難受冇即刻消失，但嗰晚佢終於冇再不停刷新。', speaker: '九爺', line: '「收起電話唔係認輸，係攞返你自己個夜晚。」', reflection: '寫低說話，可以幫你分開兩件事：你想完成表達，定係一定要對方畀一個答案。', action: '寫低最想問嘅一句，再問自己：如果暫時冇答案，我今晚可以點照顧自己？' }
    ]
  },
  self: {
    topic: '自己', title: '點解總係覺得，自己慢咗？',
    intro: [
      { speaker: '故事館', text: '阿言一路滑電話，一路數身邊人嘅好消息。數到最後，佢覺得自己好似乜都冇。' },
      { speaker: '九爺', text: '「你攞住人哋張成績表，點解要填自己個名？」玄笑咗笑，問佢最近有冇一件事，做完其實幾開心。' }
    ],
    question: '而家嘅你，想先試邊一樣？',
    choices: [
      { id: 'notice', label: '寫返自己最近做過嘅一件小事', outcome: '阿言寫低，自己終於學識煮一餐飯。件事冇人按讚，但佢記返嗰晚食得幾開心。', speaker: '玄', line: '「有啲進步，唔會出現喺人哋嘅動態入面。」', reflection: '睇到別人嘅成果，好容易忽略自己嘅過程。小事唔會解決全部問題，但可以幫你攞返一個屬於自己嘅尺度。', action: '寫低一件最近做過、令你有少少滿足感嘅事。唔使同任何人比較，講清楚自己點解在意就夠。' },
      { id: 'pause', label: '先停一停，畀自己少啲比較', outcome: '阿言將最常打開嘅社交程式移出首頁。世界冇慢落嚟，但佢終於有空聽到自己想去邊。', speaker: '九爺', line: '「唔係每場比賽，都需要你報名。」', reflection: '暫停比較唔係逃避努力。留少少安靜，先有機會分清楚，邊啲係你真係想要，邊啲只係怕落後。', action: '今晚留一小段唔睇社交動態嘅時間。諗一件冇人知道，你仍然想做嘅事。' }
    ]
  }
};

export function getStory(id) {
  return Object.hasOwn(STORIES, id) ? STORIES[id] : null;
}

export function getChoice(storyId, choiceId) {
  return getStory(storyId)?.choices.find(choice => choice.id === choiceId) ?? null;
}
