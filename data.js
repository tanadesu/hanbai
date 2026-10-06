/* ゲームのバランス調整はこのファイルに集約。需要値は画面に表示しない。 */
const CONFIG = {
 duration:300, saleSeconds:4, commentSeconds:14, rankingKey:'read-the-crowd-ranking-v1', goalCount:2,
 products:[
  {id:'water',name:'水',icon:'◒',stock:12,cost:80,price:180,comments:['のどが渇いたな。飲み物、どこかで買える？','ステージ始まる前に飲み物買っておけばよかった','歩き回ると、冷たい水がほしくなるね。']},
  {id:'snack',name:'お菓子',icon:'▧',stock:8,cost:90,price:200,comments:['次の予定までに、ちょっと何かつまみたい。','お昼を食べそびれて、小腹がすいてきた。','みんなで分けられるおやつがあるといいね。']},
  {id:'umbrella',name:'傘',icon:'☂',stock:4,cost:250,price:450,comments:['外、すごい雨。傘を持ってこなかった…。','駅まで濡れずに帰りたいな。','入口で雨が弱まるのを待っているんだ。']},
  {id:'battery',name:'モバイルバッテリー',icon:'▣',stock:3,cost:650,price:1000,comments:['スマホで写真撮ってたら、もう充電が少ない。','動画を撮りたいけど、電池があと少し…。','帰りの乗り換えを調べるまで充電もつかな。']},
  {id:'light',name:'ペンライト',icon:'✦',stock:6,cost:400,price:700,comments:['応援グッズを持ってくればよかった。','ステージに合わせて光を振るの、楽しそう！','客席を一緒に盛り上げたいな。']},
  {id:'key',name:'キーホルダー',icon:'◇',stock:8,cost:150,price:350,comments:['せっかくだし何か記念に買って帰ろうかな。','バッグに付けられるお土産を探してる。','今日の思い出を、何か形に残したいな。']}
 ],
 places:[
  {id:'lobby',name:'ロビーの受付・展示',short:'受付・展示',x:31,y:45,group:'left',room:'lobby',base:[.65,.60,.06,.25,.15,.40],chat:['受付はここで合ってるかな。','展示の案内をもらってから回ろう。']},
  {id:'cafe',name:'ゼロコーヒー',short:'ゼロコーヒー',x:20,y:63,group:'left',room:'lobby',base:[.86,.82,.02,.35,.08,.22],chat:['ちょっと座って休憩しよう。','この会場、明るくて居心地がいいね。']},
  {id:'experience',name:'体験コーナー',short:'体験コーナー',x:36.3,y:73.5,group:'left',room:'lobby',base:[.70,.62,.02,.72,.12,.30],chat:['さっきの体験、もう一度やってみたい。','次は何のゲームを試そうかな。']},
  {id:'theater',name:'A室のシアター客席',short:'A室 シアター',x:72.5,y:25,group:'right',room:'A',base:[.68,.30,.02,.30,.78,.25],chat:['ステージ、よく見える席を探そう。','プログラムの次の演目も気になるね。']},
  {id:'booth',name:'B室の展示ブース',short:'B室 展示ブース',x:60.8,y:50.5,group:'right',room:'B',base:[.40,.62,.02,.32,.12,.85],chat:['ここの展示、写真を撮ってもいいかな。','スタッフさんの説明が面白かったね。']},
  {id:'soccer',name:'B室のドローンサッカー観戦エリア',short:'B室 ドローンサッカー',x:86.7,y:51.5,group:'right',room:'B',base:[.78,.72,.02,.65,.38,.28],chat:['ドローンサッカー、次の試合も見ていこう。','今のゴール見た？すごかった！']}
 ],
 crowd:{
  count:26,retargetSeconds:[10,18],speed:[7,12],demandFactor:{min:.55,max:1.45,strength:.45},market:{buyersPerVisitor:.28,conversion:.72},
  navNodes:{
   lEntry:[29,27],lEntryRight:[38,31],lDoorA:[44,36],lUpperEast:[43,42],lEastMid:[43,52],lDoorB:[43,61],
   lNorthWest:[23,42],lWestMid:[22,53],lWestSouth:[23,61],aGap:[48,36],aEntry:[52,37],tEntry:[53,40],
   lDoorBGap:[47,61],bEntry:[52,61],bWest:[52,73],bSouthWest:[54,77],bSouthCenter:[68,77],bCenterSouth:[76,77],bCenterMid:[76,62],bCenterNorth:[76,48],
   cTop:[26,62],cMiddle:[26,70],cSouth:[26,79],eWest:[26,85],eSouth:[35,89],eSouthEast:[44,88],eEast:[44,78],eNorthEast:[44,70],lLowerEast:[44,66],
   tBackLeft:[53,24],tBackCenter:[73,23],tBackRight:[94,23],tAisleLeft:[53,32],tSeatAisle1:[63,26],tSeatAisle1Front:[63,40],tSeatAisle2:[73,26],tSeatAisle2Front:[73,40],tSeatAisle3:[84,26],tSeatAisle3Front:[84,40],tSeatAisle4:[94,26],tSeatAisle4Front:[94,40],tFrontCenter:[73,41],
   sWestNorth:[76,48],sWestSouth:[76,72],sSouthCenter:[86,73],sEastSouth:[96,72],sEastNorth:[96,48],sWestMid:[76,61],sNorthCenter:[86,48],
   bBoothWest:[52,68],bBoothSouth:[58,76],bBoothCenter:[64,76],bBoothEast:[69,76],bAisleEast:[71,68]
  },
  navEdges:[
   ['lEntry','lEntryRight'],['lEntryRight','lDoorA'],['lDoorA','lUpperEast'],['lUpperEast','lEastMid'],['lEastMid','lDoorB'],
   ['lDoorA','lNorthWest'],['lNorthWest','lWestMid'],['lWestMid','lWestSouth'],['lWestSouth','cTop'],['lNorthWest','lEntry'],
   ['lDoorA','aGap'],['aGap','aEntry'],['aEntry','tEntry'],
   ['lDoorB','lDoorBGap'],['lDoorBGap','bEntry'],['bEntry','bWest'],['bWest','bSouthWest'],['bSouthWest','bSouthCenter'],['bSouthCenter','bCenterSouth'],['bCenterSouth','bCenterMid'],['bCenterMid','bCenterNorth'],
   ['cTop','cMiddle'],['cMiddle','cSouth'],['cSouth','eWest'],['eWest','eSouth'],['eSouth','eSouthEast'],['eSouthEast','eEast'],['eEast','eNorthEast'],['eNorthEast','lLowerEast'],['lLowerEast','lDoorB'],
   ['tEntry','tAisleLeft'],['tAisleLeft','tBackLeft'],['tBackLeft','tBackCenter'],['tBackCenter','tBackRight'],['tBackLeft','tSeatAisle1'],['tSeatAisle1','tSeatAisle1Front'],['tSeatAisle1Front','tFrontCenter'],['tBackCenter','tSeatAisle2'],['tSeatAisle2','tSeatAisle2Front'],['tSeatAisle2Front','tFrontCenter'],['tBackCenter','tSeatAisle3'],['tSeatAisle3','tSeatAisle3Front'],['tSeatAisle3Front','tFrontCenter'],['tBackRight','tSeatAisle4'],['tSeatAisle4','tSeatAisle4Front'],['tSeatAisle4Front','tFrontCenter'],
   ['bEntry','bBoothWest'],['bBoothWest','bSouthWest'],['bSouthWest','bBoothSouth'],['bBoothSouth','bBoothCenter'],['bBoothCenter','bBoothEast'],['bBoothEast','bSouthCenter'],['bBoothEast','bAisleEast'],['bAisleEast','bCenterMid'],
   ['bCenterNorth','sWestNorth'],['sWestNorth','sWestMid'],['sWestMid','sWestSouth'],['sWestSouth','sSouthCenter'],['sSouthCenter','sEastSouth'],['sEastSouth','sEastNorth'],['sEastNorth','sNorthCenter'],['sNorthCenter','sWestNorth']
  ],
  stops:{lobby:['lDoorB','lUpperEast'],cafe:['cMiddle'],experience:['eEast','eSouthEast'],theater:['tFrontCenter','tSeatAisle2Front'],booth:['bBoothCenter','bAisleEast'],soccer:['sWestMid','sSouthCenter']},
  phases:[
   {at:0,weights:{lobby:.28,cafe:.17,experience:.12,theater:.20,booth:.11,soccer:.12}},
   {at:60,weights:{lobby:.12,cafe:.12,experience:.11,theater:.35,booth:.14,soccer:.16}},
   {at:135,weights:{lobby:.08,cafe:.13,experience:.25,theater:.10,booth:.22,soccer:.22}},
   {at:210,weights:{lobby:.22,cafe:.25,experience:.18,theater:.07,booth:.13,soccer:.15}},
   {at:260,weights:{lobby:.29,cafe:.15,experience:.12,theater:.05,booth:.24,soccer:.15}}
  ],
  eventBoosts:[{at:95,weights:{soccer:.25}},{at:145,weights:{experience:.10,booth:.10}},{at:190,weights:{lobby:.16}},{at:225,weights:{lobby:.12,cafe:.13}},{at:265,weights:{lobby:.12,booth:.08}}],
  outfitColors:['#e86f4b','#4c83a6','#dbad49','#718f63','#946db2','#d66d89']
 },
 goals:[
  {id:'theater-light',title:'開演前のひと押し',description:'A室でペンライトを2個販売',placeId:'theater',productId:'light',quantity:2,deadline:115,reward:300},
  {id:'theater-water',title:'開演前に水分補給',description:'A室で水を2個販売',placeId:'theater',productId:'water',quantity:2,deadline:150,reward:300},
  {id:'cafe-snacks',title:'休憩のおとも',description:'ゼロコーヒーでお菓子を2個販売',placeId:'cafe',productId:'snack',quantity:2,deadline:205,reward:300},
  {id:'booth-keychains',title:'展示の思い出をおみやげに',description:'B室の展示ブースでキーホルダーを2個販売',placeId:'booth',productId:'key',quantity:2,deadline:290,reward:300},
  {id:'lobby-umbrella',title:'雨の帰り道に備えて',description:'雨のアナウンス後、ロビーで傘を1個販売',placeId:'lobby',productId:'umbrella',quantity:1,deadline:280,reward:300,afterEvent:190},
  {id:'experience-battery',title:'体験の瞬間を残そう',description:'体験コーナーでモバイルバッテリーを1個販売',placeId:'experience',productId:'battery',quantity:1,deadline:255,reward:300},
  {id:'soccer-water',title:'試合のおとも',description:'ドローンサッカー会場で水を2個販売',placeId:'soccer',productId:'water',quantity:2,deadline:220,reward:300,afterEvent:95}
 ],
 policies:{quick:{price:.8,demand:1.28},standard:{price:1,demand:1},premium:{price:1.3,demand:.67}},
 phases:[{at:0,name:'入場・受付',boost:{lobby:[.24,.22,0,0,0,0]}},{at:60,name:'開演前',boost:{theater:[.24,0,0,0,.28,0]}},{at:135,name:'展示・体験',boost:{experience:[.1,.1,0,.12,0,0],booth:[0,.1,0,0,0,.1],theater:[0,-.12,0,0,-.3,0]}},{at:210,name:'休憩時間',boost:{lobby:[.22,.16,0,.1,0,0],cafe:[.1,.1,0,.3,0,0],theater:[-.3,-.1,0,0,-.4,0]}},{at:260,name:'帰り支度',boost:{lobby:[0,0,0,0,0,.55],booth:[0,0,0,0,0,.2],theater:[-.25,0,0,0,-.4,0]}}],
 events:[{at:0,text:'開場しました。ロビーの受付に来場者が集まっています。',boost:{}},{at:45,text:'A室のプログラムがまもなく始まります。',boost:{theater:[.15,0,0,0,.2,0]}},{at:95,text:'ドローンサッカーの試合が始まりました！',boost:{soccer:[.18,.16,0,.2,.1,0]}},{at:145,text:'体験・展示がにぎわっています。写真を撮る姿も。',boost:{experience:[.1,0,0,.2,0,0],booth:[0,0,0,.15,0,.1]}},{at:190,text:'雨が強まり、ロビー入口付近で傘を探す声が聞こえます。',boost:{lobby:[0,0,.95,0,0,0]}},{at:225,text:'休憩する来場者がロビーや喫茶に戻ってきました。',boost:{lobby:[.1,.1,.65,0,0,0],cafe:[.1,.1,0,.15,0,0]}},{at:265,text:'閉場が近づき、記念品を探す人が増えています。雨も続いています。',boost:{lobby:[0,0,.8,0,0,.2],booth:[0,0,0,0,0,.15]}}]
};
if(typeof module!=='undefined')module.exports=CONFIG;
