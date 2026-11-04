// Données de démonstration pour la version de test (Supabase LOCAL uniquement). Usage : node scripts/preview-demo.cjs <clé-secrète-locale>
const S=process.argv[2];
const fs=require('fs'); const cfg=fs.readFileSync('/var/tmp/sbweb/Tool-Proj/config.js','utf8'); const K=cfg.match(/supabaseKey: '([^']+)'/)[1];
const U='http://127.0.0.1:54321';
(async()=>{
 const H={apikey:S,Authorization:`Bearer ${S}`,'Content-Type':'application/json'};
 let r=await fetch(`${U}/auth/v1/admin/users`,{method:'POST',headers:H,body:JSON.stringify({email:'demo@tool.proj',password:'demo-apercu-2026',email_confirm:true,user_metadata:{onboarded:true,username:'demo',display_name:'Démo'}})});
 console.log('user',r.status);
 r=await fetch(`${U}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({email:'demo@tool.proj',password:'demo-apercu-2026'})}); const t=await r.json();
 const J={apikey:K,Authorization:`Bearer ${t.access_token}`,'Content-Type':'application/json',Prefer:'return=representation'};
 const pid=await (await fetch(`${U}/rest/v1/rpc/create_project`,{method:'POST',headers:J,body:JSON.stringify({p_name:'Appli vélo',p_description:"Projet de démonstration pour l'aperçu.",p_emoji:'🚲',p_color:'#0f766e',p_status:'active'})})).json();
 console.log('project',pid);
 const eps=await (await fetch(`${U}/rest/v1/epics`,{method:'POST',headers:J,body:JSON.stringify([['Carte et trajets','now',1],['Mode hors-ligne','now',2],['Accueil','now',3],['Boutique','later',4]].map(([title,h,p])=>({project_id:pid,title,description:'',horizon:h,position:p})))})).json();
 const mk=(title,e,type='task',status='todo',priority='normal')=>({project_id:pid,title,epic_id:e?eps[e-1].id:null,type,status,priority,position:0});
 const tasks=[mk('Afficher la carte',1),mk('Tracer un trajet',1),mk('Le GPS décroche en tunnel',1,'bug','todo','high'),mk('Télécharger une zone',2),mk('Sauvegarder les favoris',2,'improvement'),mk("Écran d'accueil",3),mk('Idée : badges de sortie',3,'idea'),mk('Corriger la police du titre',null,'bug','todo','high'),mk("Écrire la page d'aide",null),mk('Tester sur un vieux téléphone',null),mk('Mode sombre de la carte',null,'improvement'),mk('Logo',1,'task','done'),mk("Couleurs de l'app",null,'task','done')];
 tasks.forEach((x,i)=>{x.position=i+1;});
 const rt=await fetch(`${U}/rest/v1/tasks`,{method:'POST',headers:J,body:JSON.stringify(tasks)}); console.log('tasks',rt.status);
 const cols=['yellow','pink','blue','green','orange','purple'];
 const txt=['Et si on partageait les trajets ?','Mode nuit','Alerte vent fort','Classement des sorties','Photos de parcours','Météo à 3 jours','Thème « course »','Partage par lien','Rappels'];
 const rn=await fetch(`${U}/rest/v1/notes`,{method:'POST',headers:J,body:JSON.stringify(txt.map((text,i)=>({project_id:pid,text,color:cols[i%6],x:150+(i%3)*420,y:140+Math.floor(i/3)*380,z:i})))}); console.log('notes',rn.status);
})();
