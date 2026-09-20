// Isolated preview: public catalog reads only, no database or account writes.
const { createRequire }=require('node:module');
const req=createRequire('D:/Backend/NoPlan/package.json');
const express=req('express'),app=express();
app.use(req('cors')({origin:['http://127.0.0.1:5177'],credentials:true}));
app.use(express.json());
app.get('/api/auth/session',(_req,res)=>res.json({success:false}));
app.get('/api/events',(_req,res)=>res.json({events:[],sources:[],total:0}));
app.post('/api/pc-diagnostics',(_req,res)=>res.sendStatus(204));
const {createTourismService}=req('./routes/tourism/service');
const {createTourismRouter}=req('./routes/tourism/router');
app.use('/api/tourism',createTourismRouter(createTourismService({})));
app.listen(4327,'127.0.0.1',()=>console.log('Language preview API: 4327 (no external calls / DB writes)'));
