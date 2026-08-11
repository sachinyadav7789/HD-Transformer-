import {initializeApp} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {getFirestore,collection,addDoc,setDoc,doc,onSnapshot,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import products from "./products.js";

const firebaseConfig={apiKey:"AIzaSyDxdkJQjRJ1pmYxz233DXLLhbfigb4BMSU",authDomain:"hd-transformer.firebaseapp.com",projectId:"hd-transformer",storageBucket:"hd-transformer.firebasestorage.app",messagingSenderId:"641041626094",appId:"1:641041626094:web:6fca1898fcfd3972df54ff2",measurementId:"G-JV6XWX06S2"};
const app=initializeApp(firebaseConfig),db=getFirestore(app);
const WHATSAPP_NUMBER="917949347417";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let state={products:[...products],shown:12,category:"",query:"",requestType:"inquiry",selected:null};

const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n)||0);
function categories(){return [...new Set(state.products.map(p=>p.category))].sort()}
function setupFilters(){
  const cats=categories();
  $("#category").innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  $("#categoryChips").innerHTML='<button class="chip active" data-cat="">All</button>'+cats.map(c=>`<button class="chip" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
  $$(".chip").forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;$("#category").value=state.category;$$(".chip").forEach(x=>x.classList.toggle("active",x===b));state.shown=12;render()});
  $("#category").onchange=e=>{state.category=e.target.value;$$(".chip").forEach(x=>x.classList.toggle("active",x.dataset.cat===state.category));state.shown=12;render()};
  $("#search").oninput=e=>{state.query=e.target.value.toLowerCase();state.shown=12;render()};
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function filtered(){return state.products.filter(p=>(!state.category||p.category===state.category)&&(!state.query||(`${p.name} ${p.category} ${JSON.stringify(p.specs)}`).toLowerCase().includes(state.query)))}
function card(p){
  const img=p.imageUrl||"./assets/product-images/2000-kva-three-phase-power-transformer-p001.svg";
  const specs=Object.entries(p.specs||{}).slice(0,4).map(([k,v])=>`<span class="spec">${escapeHtml(k)}: ${escapeHtml(v)}</span>`).join("");
  return `<article class="product"><div class="product-img"><img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null;this.src='./assets/product-images/2000-kva-three-phase-power-transformer-p001.svg'"></div><div class="product-body"><span class="product-cat">${escapeHtml(p.category)}</span><h3>${escapeHtml(p.name)}</h3><div class="price">${money(p.price)} <span class="muted">/ ${escapeHtml(p.unit||"Piece")}</span></div><div class="specs">${specs}</div><div class="product-actions"><button data-view="${escapeHtml(p.id)}">Details</button><button class="buy" data-request="${escapeHtml(p.id)}">Enquire</button></div></div></article>`;
}
function render(){
  const list=filtered();
  $("#productGrid").innerHTML=list.slice(0,state.shown).map(card).join("")||`<div class="muted">No products matched your search.</div>`;
  $("#loadMore").style.display=state.shown<list.length?"flex":"none";
  $$("[data-request]").forEach(b=>b.onclick=()=>openRequest(state.products.find(p=>p.id===b.dataset.request),"inquiry"));
  $$("[data-view]").forEach(b=>b.onclick=()=>openRequest(state.products.find(p=>p.id===b.dataset.view),"inquiry","view"));
}
function openRequest(p,type="inquiry",mode="normal"){
  state.selected=p||null;state.requestType=type;$("#modal").hidden=false;$("#fProduct").value=p?.name||"";
  $$(".request-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.type===type));
  $("#modalTitle").textContent=type==="order"?"Order request":type==="callback"?"Request a callback":"Send enquiry";
  if(mode==="view") $("#requestForm textarea").value=`Please share technical and commercial details for ${p?.name||"this product"}.`;
  updateWA();
}
function updateWA(){
  const d=new FormData($("#requestForm")),p=state.selected?.name||d.get("productName")||"General requirement";
  const msg=`Hello H.D. Transformers, I want to ${state.requestType}.\nProduct: ${p}\nName: ${d.get("name")||""}\nPhone: ${d.get("phone")||""}\nCity: ${d.get("city")||""}\nQuantity: ${d.get("quantity")||1}\nMessage: ${d.get("message")||""}`;
  $("#waRequest").href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  $("#waTop").href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello H.D. Transformers, I want to discuss a transformer requirement.")}`;
}
function validate(){
  let ok=true;
  $$("#requestForm input[required],#requestForm textarea[required]").forEach(x=>{
    const wrap=x.closest("label");
    let bad=!x.value.trim();
    if(x.name==="phone") bad=!/^[0-9+()\\-\\s]{7,20}$/.test(x.value.trim());
    if(x.name==="email" && x.value.trim()) bad=!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(x.value.trim());
    wrap.classList.toggle("invalid",bad); if(bad)ok=false;
  });
  return ok;
}
async function submitRequest(e){
  e.preventDefault();$("#formStatus").textContent="";
  if(!validate()){ $("#formStatus").style.color="#d63b3b";$("#formStatus").textContent="Please check the red fields and complete the required details.";return; }
  const d=Object.fromEntries(new FormData(e.target).entries());
  const payload={...d,type:state.requestType,productId:state.selected?.id||null,productName:state.selected?.name||d.productName||"",productPrice:state.selected?.price||null,createdAt:serverTimestamp(),source:"website",status:"new"};
  const collectionName=state.requestType==="order"?"orders":state.requestType==="callback"?"callbacks":"inquiries";
  try{
    await addDoc(collection(db,collectionName),payload);
    const key=(d.phone||d.email||d.name).trim().replace(/[^a-zA-Z0-9]/g,"").slice(0,70)||("customer-"+Date.now());
    await setDoc(doc(db,"customers",key),{name:d.name,phone:d.phone,email:d.email||"",city:d.city,lastProduct:payload.productName,lastRequestType:state.requestType,lastRequestAt:serverTimestamp()},{merge:true});
    $("#formStatus").style.color="#16824f";$("#formStatus").textContent="Request sent successfully. We will contact you shortly.";
    e.target.reset();$("#fProduct").value=state.selected?.name||"";updateWA();setTimeout(()=>{$("#modal").hidden=true;$("#formStatus").textContent=""},1300);
  }catch(err){console.error(err);$("#formStatus").style.color="#d63b3b";$("#formStatus").textContent="Online submission failed. Please use WhatsApp or call the company."; }
}
$("#navToggle").onclick=()=>$("#mainNav").classList.toggle("open");
$$("[data-close]").forEach(x=>x.onclick=()=>$("#modal").hidden=true);
$$("[data-action]").forEach(x=>x.onclick=()=>openRequest(null,"inquiry"));
$$(".request-tabs button").forEach(b=>b.onclick=()=>{state.requestType=b.dataset.type;$$(".request-tabs button").forEach(x=>x.classList.toggle("active",x===b));$("#modalTitle").textContent=state.requestType==="order"?"Order request":state.requestType==="callback"?"Request a callback":"Send enquiry";updateWA()});
$("#requestForm").addEventListener("submit",submitRequest);$("#requestForm").addEventListener("input",updateWA);
$("#loadMore").onclick=()=>{state.shown+=12;render()};setupFilters();render();updateWA();

onSnapshot(collection(db,"products"),snap=>{
  if(!snap.empty){
    state.products=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.available!==false);
    setupFilters();render();
  }
},err=>console.warn("Firestore product sync unavailable; local catalogue remains active.",err));

if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.warn);
