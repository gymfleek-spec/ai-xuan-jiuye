// Visual layer only. The caller supplies approved short copy and labels, not a chart or a form value.
export const WIDTH = 720, HEIGHT = 1280;
const ART_WIDTH = 1080, ART_HEIGHT = 1920;
export const TOPICS = Object.freeze({career:'事業', love:'愛情', family:'家庭', wealth:'財運', direction:'未來方向'});
const serif = '"Songti TC","Noto Serif CJK TC","Noto Serif TC","PingFang TC",serif';
const sans = '"PingFang TC","Noto Sans CJK TC",system-ui,sans-serif';
const clean = (s) => typeof s === 'string' ? s.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
const CARD_NICKNAMES = Object.freeze({guest:'夜茶客', listener:'聽雨人', friend:'九巷茶友'});
// Fixed public homepage; drawing modules avoids image requests and cannot encode visitor data.
const HOME_QR = [
  '11111110101111110101000001100',
  '10000010010010110001011011101',
  '10111010001001111010101111110',
  '10111010010110011011010101101',
  '10111010010111011001111111001',
  '10000010001001001011100010010',
  '11111110001011111011101011100',
  '00000000101111010000100011000',
  '10101011010000011100111110111',
  '10010001011010110010110110000',
  '11010111100101110001010011001',
  '11001101001100010111001110111',
  '00100111111010100111000001100',
  '10110001010001110000000010101',
  '11001110001001110100111111100',
  '10000100110001111001101110011',
  '11101110000111111001001100001',
  '11101100101000101000010101000',
  '10110011011110010000001000000',
  '01101000011010110011000010110',
  '10000010100110110100111001110',
  '00000000100001001001000000000',
  '11111110101010101010101111111',
  '10000010010111101010001000001',
  '10111010010011001111101011101',
  '10111010110100100100101011101',
  '10111010111010101010101011101',
  '10000010111111100100101000001',
  '11111110001000101100001111111',
];

export function checkedSignature(value) {
  return value === '' ? '' : typeof value === 'string' && Object.hasOwn(CARD_NICKNAMES,value) ? CARD_NICKNAMES[value] : null;
}

export function checkedArtwork({topic, pattern, quote, signature = ''}) {
  const breaks = typeof quote === 'string' ? quote.split(/\r?\n/).map(clean) : [];
  const tag = clean(pattern), line = breaks.join(''), sign = checkedSignature(signature) || '';
  if (!Object.hasOwn(TOPICS, topic) || breaks.length > 4 || breaks.some(part=>!part)
    || !/^[\p{Script=Han}・、]{3,24}$/u.test(tag)
    || !/^[\p{Script=Han} ，。？！、；：「」『』…]+$/u.test(line) || [...line].length > 55 || !/\p{Script=Han}/u.test(line)) {
    throw new TypeError('判詞未齊，請稍後再試。');
  }
  return {topic, tag, line, breaks, sign};
}
const startPunctuation = /^[，。？！、；：」』…]/u;
function linesFor(ctx, text, width) {
  const lines = [];
  let s = '';
  for (const glyph of text) {
    if (s && ctx.measureText(s + glyph).width > width && !startPunctuation.test(glyph)) {
      lines.push(s.trim()); s = '';
    }
    s += glyph;
  }
  if (s.trim()) lines.push(s.trim());
  return lines;
}
function fillGradient(c, x0,y0,x1,y1, stops, x,y,w,h) {
  const g=c.createLinearGradient(x0,y0,x1,y1);
  stops.forEach(([at,color])=>g.addColorStop(at,color));
  c.fillStyle=g; c.fillRect(x,y,w,h);
}
function draw(c, t, x, y, color, font, align='left') {
  c.fillStyle=color; c.font=font; c.textAlign=align; c.textBaseline='alphabetic'; c.fillText(t,x,y);
}
function rule(c, x1, y, x2, color) {
  c.strokeStyle=color; c.lineWidth=2;
  c.beginPath(); c.moveTo(x1,y); c.lineTo(x2,y); c.stroke();
}
export function paintShareArtwork(canvas, fields, portrait) {
  const v=checkedArtwork(fields);
  canvas.width=WIDTH; canvas.height=HEIGHT;
  const c=canvas.getContext('2d');
  if (!c) throw new Error('暫時未畫到判詞卡。');
  c.setTransform(WIDTH / ART_WIDTH, 0, 0, HEIGHT / ART_HEIGHT, 0, 0);
  const gold='#c9a14e', light='#f5e7c6', muted='#d2b675';
  fillGradient(c,0,0,0,ART_HEIGHT,[[0,'#10221a'],[1,'#050807']],0,0,ART_WIDTH,ART_HEIGHT);
  // Only the left close-up from the original reference sheet; both ears and the jade pendant stay in frame.
  const plate=canvas.ownerDocument.createElement('canvas');
  plate.width=1000; plate.height=970;
  const ink=plate.getContext('2d');
  if (!ink) throw new Error('暫時未畫到判詞卡。');
  ink.drawImage(portrait,0,0,836,902,-40,2,1020,1101);
  ink.globalCompositeOperation='destination-in';
  fillGradient(ink,0,0,0,970,[[0,'transparent'],[0.12,'#000'],[0.53,'#000'],[0.75,'#0009'],[1,'transparent']],0,0,1000,970);
  fillGradient(ink,0,0,1000,0,[[0,'transparent'],[0.11,'#000'],[0.73,'#000'],[1,'transparent']],0,0,1000,970);
  c.drawImage(plate,40,120);

  c.strokeStyle=gold; c.lineWidth=2; c.strokeRect(38,50,1004,1820);
  c.strokeStyle='#745d37'; c.strokeRect(52,64,976,1792);
  c.strokeStyle=gold; c.lineWidth=3;
  for (const [x,y,dx,dy] of [[69,81,1,1],[1011,81,-1,1],[69,1839,1,-1],[1011,1839,-1,-1]]) {
    c.beginPath();c.moveTo(x,y+dy*56);c.lineTo(x,y);c.lineTo(x+dx*56,y);c.lineTo(x+dx*56,y+dy*18);c.lineTo(x+dx*20,y+dy*18);c.lineTo(x+dx*20,y+dy*39);c.stroke();
  }
  draw(c,'玄 與 九 爺',108,136,light,'600 46px '+serif);
  rule(c,109,162,290,gold);
  c.lineWidth=2;
  c.strokeStyle=gold; c.strokeRect(887,213,74,137);
  draw(c,'九',924,268,light,'600 43px '+serif,'center');
  draw(c,'爺',924,323,light,'600 43px '+serif,'center');

  const tagFont='500 45px '+sans;
  c.font=tagFont;c.fillStyle='#183127';
  const tagWidth=Math.min(875,c.measureText(v.tag).width+58);
  if (typeof c.roundRect==='function') {
    c.beginPath();c.roundRect(97,976,tagWidth,70,35);c.fill();
  } else c.fillRect(97,976,tagWidth,70);
  draw(c,v.tag,120,1026,muted,tagFont);
  rule(c,110,1060,242,gold);
  let size=78, rows=[];
  do {
    c.font='600 '+size+'px '+serif; rows=v.breaks.length>1 ? v.breaks : linesFor(c,v.line,790);
    if (rows.length<=4 && rows.every(row=>c.measureText(row).width<=900)) break;
    size-=4;
  } while(size>=54);
  // One punctuation glyph may hang outside the text measure, still inside the frame.
  if (rows.length>4 || rows.some(row=>c.measureText(row).width>900)) throw new Error('判詞太長，未能放入卡面。');
  rows.forEach((row,i)=>draw(c,row,105,1168+i*(size+13),light,'600 '+size+'px '+serif));
  if(v.sign) draw(c,'寫畀 '+v.sign,109,1500,muted,'500 40px '+sans);

  rule(c,110,1550,970,'#665134');
  const x=750,y=1587,step=6,quiet=4,edge=(HOME_QR.length+quiet*2)*step;
  c.fillStyle='#fff';c.fillRect(x,y,edge,edge);
  c.fillStyle='#101411';
  HOME_QR.forEach((row,r)=>[...row].forEach((module,col)=>{
    if(module==='1') c.fillRect(x+(col+quiet)*step,y+(r+quiet)*step,step,step);
  }));
  draw(c,'九爺命格判詞',108,1680,light,'600 59px '+serif);
  draw(c,'玄與九爺・'+TOPICS[v.topic]+'篇',110,1744,muted,'500 34px '+sans);
  draw(c,'xuan-jiuye-preview.pages.dev',110,1800,light,'500 24px '+sans);
  return canvas;
}
