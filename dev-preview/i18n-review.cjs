// Isolated QA API: fixed public sample copy and previously verified translations.
// No database, accounts, writes, or live translation requests.
const req=require('node:module').createRequire('D:/Backend/NoPlan/package.json');
const app=req('express')();app.use(req('cors')({origin:'http://127.0.0.1:5178',credentials:true}));app.use(req('express').json());
const translated=require('../output/i18n/public-probe.json');
const event={id:'seoul-123',provider:'seoul',providerId:'123',title:'2026 답십리 영화제',kind:'festival',startDate:'2026-09-18',endDate:'2026-12-20',address:'',region:'서울특별시',venue:'답십리영화미디어아트센터',lat:null,lng:null,imageUrl:'',imageLicense:'',sourceUrl:'',description:'친구와 함께 둘러보는 전시',hours:'',price:'',isFree:true,age:'',phone:'',status:'scheduled',sourceLabel:'서울문화포털'};
const course={id:123,title:'연남동 맞춤 코스',location:'연남동',likes:1,views:2,course_data:[{id:'1',title:'바다주막에서 가볍게 마무리',name:'바다주막에서 가볍게 마무리',type:'food',summary:'친구와 함께 둘러보는 전시',durationMinutes:60}]};
app.get('/api/auth/session',(_q,r)=>r.json({success:false}));
app.get('/api/events',(_q,r)=>r.json({events:[event],sources:[],total:1,page:1,pageSize:12}));
app.get('/api/events/:id/translations',(q,r)=>r.json(translated[q.query.locale]||{items:[],status:'unavailable'}));
app.get('/api/events/:id',(_q,r)=>r.json({event}));
app.get('/api/course/explore/public-translations/:id',(q,r)=>r.json(translated[q.query.locale]||{items:[],status:'unavailable'}));
app.get('/api/course/explore/explore-courses',(_q,r)=>r.json({success:true,courses:[course]}));
app.get('/api/course/explore/hot-courses',(_q,r)=>r.json({success:true,courses:[course]}));
app.post('/api/pc-diagnostics',(_q,r)=>r.sendStatus(204));
app.use('/api/tourism',req('./routes/tourism/router').createTourismRouter(req('./routes/tourism/service').createTourismService({})));
app.listen(4328,'127.0.0.1',()=>console.log('Isolated language QA API: 4328'));
