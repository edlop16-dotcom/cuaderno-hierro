/* Fotos de Free Exercise DB (dominio público) para los ejercicios nuevos del catálogo (Tanda G).
   Solo las que coinciden exactamente con el ejercicio y su equipo; las demás siguen con su figura.
   Mismo formato que las de siempre (ex/<clave>-0/1.webp, 480×320). Solo en el teléfono: el reloj no cambia.
   Al estar en PHOTO_KEYS, la Biblioteca, el selector, la ficha y la sesión las muestran con carga diferida
   y el mismo toque de siempre para ver la figura. */
const CAT_PHOTOS = 'calfpress,vbarpush,smithbench,widebench,db1bench,dbneutral,floorpress,svend,cablepress,smithincline,dbinclneutral,cableincline,declbench,dbdecline,smithdecline,dbinclinefly,dbdeclfly,crosshl,crosslh,inclcablefly,cableflybench,cablefly1,bandfly,widepush,declpush,trxpush,chinup,bandpull,weightpull,scappull,closepull,suppull,neutralpd,onearmpd,ropepullover,onearmrow,kneelrow1,yates,smithrow,dbrow2,csrow,ctrow,meadows,highrowmach,trxrow,bbshrug,cableshrug,bbshrugback,rackpull,deficitdl,seatbbohp,smithohp,neutralohp,db1ohp,cableohp,pushpress,bradford,cuban,hspu,seatlat,lyinglat,bandlat,platefront,cablefront,inclfront,csrear,cablerear,revpecdeck,pullapart,bbrearrow,bbupright,cableupright,dbupright,smithupright,bandupright,cableextrot,cableintrot,bandextrot,ezcurl,closecurl,widecurl,dragcurl,altcurl0,crosshammer,inclhammer,scotthammer,cablehammer,dbpreacher,cablepreacher,machpreacher,machcurl,inclinecurl,spidercurl,zottman,cablecurl,cablecurl1,lyingcablecurl,highcablecurl,revcurl,revezscott,revdbcurl,revcablecurl,revpush,ohcablerope,incltricable,lyingtricable,oh1,dbskull,declskull,jmpress,tatepress,closebench,smithclose,dbclose,dbkick,machtri,machdip,weightbenchdip,tridips,wristcurl,revwrist,dbwrist,cablewrist,behindwrist,roller,pinch,fingercurl,narrowpress,narrowhack,bbhack,sllegext,frontsquat,kbfrontsquat,zercher,boxsquat,sumobb,dbsquat,bblunge,smithbulg,splitsquat,revlunge,dbstepup,bbstepup,standcurl,ballcurl,sliders,nordic,ghr,sldl,dbsldl,goodmorning,bbbridge,smithbridge,quadkick,monsterwalk,pullthrough,sumodl,hexdl,sumosquat,cableadd,bandadd,smithcalf,bbcalf,dbcalf,bandcalf,bbseatcalf,dbseatcalf1,donkeycalf,machcrunch,cabletwist,declcrunch,obliquecrunch,revcrunch,declrevcrunch,benchtuck,bikecrunch,situp,vup,heeltouch,captain,sideplank,rollout,russian,woodchop,woodchoplh,pallof,pallofrot,dbsidebend,kbwindmill,farmer,powerclean,kbsnatch,sledpush,sleddrag,battlerope'.split(',');
if (!isWatch()) CAT_PHOTOS.forEach(k => PHOTO_KEYS.add(k));

/* Ajustes → Acerca de (teléfono) */
function abCard() {
  return `<div class="card ab-set"><h3>Acerca de</h3>
    <div class="muted" style="font-size:13px">Forja · ${LIB.length} ejercicios, ${PHOTO_KEYS.size} con foto.</div>
    <div style="font-size:13.5px;margin-top:6px">Fotos de ejercicios: Free Exercise DB (dominio público)</div></div>`;
}
const _vSettingsAb = vSettings;
vSettings = function () {
  const h = _vSettingsAb();
  if (isWatch()) return h;
  return h.replace('<div class="muted" style="font-size:11.5px;text-align:center">Forja · Fotos de ejercicios: Free Exercise DB (dominio público)</div>', '') + abCard();
};
if (typeof SET_ORDER !== 'undefined') { SET_ORDER.push(['ab-set', 13.5]); SET_ORDER.sort((a, b) => a[1] - b[1]); }
try { SET_GRP.find(g => g[0] === 'datos')[4].push('.ab-set'); } catch (e) {}

bootRender();
