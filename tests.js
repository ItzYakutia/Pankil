/* Тесты движка калькулятора: код берётся прямо из index.html */
const fs=require('fs');
const src=fs.readFileSync('/Applications/XAMPP/xamppfiles/htdocs/karasnew/index.html','utf8');
eval(src.slice(src.indexOf('/* Грааль даёт процент'), src.indexOf('/* --------------------------------------------------- обмен аккаунтами */'))+`
function num(v){if(typeof v==='number')return v;const s=String(v==null?'':v).replace(/\\s|\\u00a0|\\u202f/g,'').replace(',','.');const n=parseFloat(s);return isFinite(n)?n:0;}`);

let pass=0, fail=0;
const ok  = (c,m)=>{ if(c){pass++;} else {fail++; console.log('  ✗ '+m);} };
const grp = t => console.log('\n'+t);

const acc = o => Object.assign({mults:[],ad:0,grail:false,grailPct:0,cur:0,target:0}, o);

/* ---------- честный полный перебор всех точных решений ---------- */
function bruteAll(a, noAd){
  const R = Math.max(0, Math.round(a.target) - Math.round(a.cur));
  let vs = variants(a); if(noAd) vs = vs.filter(v=>!v.useAd);
  const out = new Set();
  for(const v of vs) if(R % v.v === 0 && R/v.v >= 3) out.add(v.base+':'+(v.useAd?1:0)+':'+(R/v.v));
  for(let i=0;i<vs.length;i++) for(let j=i;j<vs.length;j++){
    const A=vs[i], B=vs[j]; if(A.v===B.v) continue;
    for(let x=3; A.v*x <= R-3*B.v; x++){
      const rem=R-A.v*x; if(rem % B.v) continue;
      const y=rem/B.v; if(y<3) continue;
      out.add([A.base+':'+(A.useAd?1:0)+':'+x, B.base+':'+(B.useAd?1:0)+':'+y].sort().join('|'));
    }
  }
  return out;
}
const keyOfSol = s => s.moves.map(m=>m.base+':'+(m.useAd?1:0)+':'+m.count).sort().join('|');

/* =================================================================== */
grp('1. Суммы всех показанных вариантов');
const cases = [
  acc({mults:[60820,43677,36785,27248,20367,9770], ad:13, target:152681196}),
  acc({mults:[13714,60820,43677,27248,20367,9770], target:8255828}),
  acc({mults:[60820,43677,36785,27248,20367,9770], ad:13, grail:true, grailPct:8,  target:152681196}),
  acc({mults:[60820,43677,36785,27248,20367,9770], ad:13, grail:true, grailPct:7.5,target:98765432}),
  acc({mults:[41557,32112,32099,24776,24763,24422,24409,12606,12593,7445], ad:137, target:987654321}),
  acc({mults:[9770,20367], ad:13, cur:100000000, target:152681196}),
  acc({mults:[1000,7,13], target:2014}),
  acc({mults:[13714], target:8255828}),
];
cases.forEach((a,i)=>{
  const R = Math.max(0, Math.round(a.target)-Math.round(a.cur));
  const r = solve(a,false);
  r.exact.forEach(s=>{
    ok(s.sum === R, 'кейс '+(i+1)+': сумма '+s.sum+' != остатка '+R);
    ok(s.moves.every(m=>Number.isInteger(m.count) && m.count>0), 'кейс '+(i+1)+': нецелое число очков');
    ok(s.moves.every(m=>m.v === effective(m.base, m.useAd, a)), 'кейс '+(i+1)+': КМ не совпадает с расчётным');
  });
});
console.log('  проверено вариантов: '+cases.reduce((n,a)=>n+solve(a,false).exact.length,0));

grp('2. Правила отбора');
cases.forEach((a,i)=>{
  const r = solve(a,false);
  ok(r.exact.every(s=>s.moves.every(m=>m.count>=3)), 'кейс '+(i+1)+': есть ход дешевле 3 очков');
  ok(r.exact.every(s=>!(s.moves.length===2 && s.moves[0].v===s.moves[1].v)), 'кейс '+(i+1)+': пара из одинаковых КМ');
  ok(r.exact.every(s=>!(s.moves.length===2 && s.moves[0].useAd && !s.moves[1].useAd)), 'кейс '+(i+1)+': реклама слева');
  const idx = r.exact.findIndex(s=>s.moves.length===2);
  const last1 = r.exact.map(s=>s.moves.length).lastIndexOf(1);
  ok(idx === -1 || last1 === -1 || last1 < idx, 'кейс '+(i+1)+': одноходовые не первыми');
  ok(new Set(r.exact.map(keyOfSol)).size === r.exact.length, 'кейс '+(i+1)+': есть дубли');
});

grp('3. Полнота: не теряются ли верные варианты (сверка с полным перебором)');
[
  acc({mults:[13714,60820,43677,27248,20367,9770], target:8255828}),
  acc({mults:[1000,700,13], target:20014}),
  acc({mults:[503,401], target:60000}),
  acc({mults:[9770,20367,27248], ad:13, target:2000000}),
  acc({mults:[97,101,103], target:50000}),
  acc({mults:[60820,43677,36785,27248,20367,9770], ad:13, target:152681196}),
  acc({mults:[60820,43677,36785,27248,20367,9770], ad:13, grail:true, grailPct:8, target:152681196}),
  acc({mults:[41557,32112,32099,24776,24763,24422,24409,12606,12593,7445], ad:137, target:987654321}),
].forEach((a,i)=>{
  const all = bruteAll(a,false);
  const got = new Set(solve(a,false).exact.map(keyOfSol));
  const missing = [...all].filter(k=>!got.has(k));
  const extra   = [...got].filter(k=>!all.has(k));
  ok(extra.length===0, 'полнота '+(i+1)+': лишние варианты '+extra.slice(0,2));
  const r = solve(a,false);
  ok(r.total === all.size, 'полнота '+(i+1)+': счётчик '+r.total+' != реального числа '+all.size);
  console.log('  кейс '+(i+1)+': существует '+all.size+', показано '+got.size+
              (missing.length ? ' (обрезано, счётчик показывает '+r.total+')' : ' — все'));
});

grp('4. Вкладка «Без рекламы»');
[cases[0], cases[2], cases[4]].forEach((a,i)=>{
  const r = solve(a,true);
  ok(r.exact.every(s=>s.moves.every(m=>!m.useAd)), 'без рекламы '+(i+1)+': в списке есть реклама');
  const R = Math.max(0, Math.round(a.target)-Math.round(a.cur));
  ok(r.exact.every(s=>s.sum===R), 'без рекламы '+(i+1)+': сумма не сходится');
});

grp('5. Эффективный КМ (Грааль и реклама)');
const g = acc({mults:[60820], ad:13, grail:true, grailPct:8});
ok(effective(60820,false,g) === Math.round(60820*1.08), 'грааль без рекламы');
ok(effective(60820,true ,g) === Math.round(60820*1.08)+13, 'грааль + реклама (реклама после округления)');
ok(effective(60820,false,acc({ad:13})) === 60820, 'без бонусов КМ не меняется');
ok(effective(60820,true ,acc({ad:13})) === 60833, 'только реклама');
ok(effective(36785,false,acc({grail:true,grailPct:8})) === 39728, 'округление вверх 39727.8 -> 39728');
ok(effective(43677,false,acc({grail:true,grailPct:8})) === 47171, 'округление вниз 47171.16 -> 47171');
ok(effective(100,false,acc({grail:true,grailPct:0.5})) === 101, 'ровно .5 -> вверх (100.5 -> 101)');
{ /* сплошная сверка округления с точной целочисленной арифметикой */
  let bad=0, n=0;
  for(const p of [0.1,0.25,0.5,1,1.5,2.5,3.33,4.5,5,7.5,8,12.5,15,17.5,25,33.3,50]){
    for(let v=101; v<=90000; v+=97){
      n++;
      /* эталон на BigInt: без двоичных дробей вообще */
      const pm = BigInt(Math.round(p*1000));
      const nn = BigInt(v) * (100000n + pm);
      const q = nn / 100000n, rem = nn % 100000n;
      const want = Number(q) + (rem*2n >= 100000n ? 1 : 0);
      if(effective(v,false,acc({grail:true,grailPct:p})) !== want) bad++;
    }
  }
  ok(bad===0, 'округление Грааля расходится в '+bad+' случаях из '+n);
  console.log('  сверено округлений: '+n+', расхождений: '+bad);
}

grp('6. Уже набрано');
const cu = acc({mults:[60820,43677,36785,27248,20367,9770], ad:13, cur:100000000, target:152681196});
const rc = solve(cu,false);
ok(rc.R === 52681196, 'остаток = цель минус набранное');
ok(rc.exact.every(s=>s.sum===52681196), 'варианты считаются от остатка');
ok(solve(acc({mults:[9770],cur:200,target:100}),false).R === 0, 'цель уже достигнута -> остаток 0');
ok(solve(acc({mults:[9770],cur:200,target:100}),false).exact.length === 0, 'цель достигнута -> вариантов нет');

grp('7. Крайние случаи (не должно быть падений)');
[
  acc({mults:[], target:1000}), acc({mults:[0,-5,9770], target:9770*10}),
  acc({mults:[9770], target:0}), acc({mults:[9770], target:1}),
  acc({mults:[9770], ad:-13, target:97700}), acc({mults:[1], target:3}),
  acc({mults:[60820], grail:true, grailPct:1000, target:99999999}),
  acc({mults:[60820,43677], ad:13, grail:true, grailPct:0.1, target:1234567890}),
].forEach((a,i)=>{
  let r=null, err=null;
  try{ r = solve(a,false); }catch(e){ err = e.message; }
  ok(!err, 'крайний случай '+(i+1)+': падение — '+err);
  if(r) ok(r.exact.every(s=>s.sum===r.R), 'крайний случай '+(i+1)+': сумма не сходится');
});

grp('8. Скорость');
[cases[0], cases[4]].forEach((a,i)=>{
  const t=Date.now(); for(let k=0;k<20;k++) solve(a,false);
  const dt=(Date.now()-t)/20;
  ok(dt < 150, 'скорость '+(i+1)+': '+dt.toFixed(1)+' мс');
  console.log('  кейс '+(i+1)+': '+dt.toFixed(1)+' мс на расчёт');
});

console.log('\n================ ИТОГ: успешно '+pass+', провалено '+fail+' ================');
