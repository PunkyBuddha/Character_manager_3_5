import {abilityValue,validateAbilityBonuses} from './ability-bonuses.js';
import {validateMapPoints} from './map-model.js';
import {migrateLanguages,validateLanguages} from './languages.js';
export const RACES=['Humano','Anão','Elfo','Gnomo','Meio-elfo','Meio-orc','Halfling'];
export const DEFAULT_ORDER=['sheet','momf','traits','combat','magic','bag','notes','map'];
export const id=()=>crypto.randomUUID();
export function normalizeOrder(order){return Array.isArray(order)&&[6,7,8].includes(order.length)&&new Set(order).size===order.length&&order.every(k=>DEFAULT_ORDER.includes(k))?[...order,...DEFAULT_ORDER.filter(k=>!order.includes(k))]:DEFAULT_ORDER.slice();}
export function createTable(name='',casting='int'){return {id:id(),name,namedByUser:!!name.trim(),casting:['int','wis','cha'].includes(casting)?casting:'int',spellMisc:0,slots:Array.from({length:10},()=>({max:0,used:0}))};}
export function upgrade(c){
 migrateLanguages(c);c.mapPoints||=[];c.abilityBonuses??={};
 c.customSkills||=[];
 c.wildShape||={active:false};
 c.wildShapeUses||={max:7,used:0,featExtra:true};
 c.savedShapes||=[];
 c.classes.forEach(cl=>{cl.id||=id();cl.customBab??=0;cl.customSaves??={f:0,r:0,w:0};});c.speedUnit||='m';
 if(!c.castingTables?.length){const t=createTable('',c.casting);t.slots=c.slots;t.spellMisc=c.spellMisc;c.castingTables=[t];}
 c.castingTables.forEach(t=>{if(!['int','wis','cha'].includes(t.casting))t.casting='int';if(t.namedByUser===undefined){const generated=t.name===c.classes[0]?.name&&!['Bardo','Clérigo','Druida','Feiticeiro','Mago','Paladino','Ranger'].includes(t.name)&&!c.spells.some(s=>s.tableId===t.id)&&t.slots.every(s=>s.max===0&&s.used===0);t.namedByUser=!generated;if(generated)t.name='';}});
 c.activeTableId=c.castingTables.some(t=>t.id===c.activeTableId)?c.activeTableId:c.castingTables[0].id;
 c.spells.forEach(s=>{s.tableId=c.castingTables.some(t=>t.id===s.tableId)?s.tableId:c.castingTables[0].id;});
 activateTable(c,c.activeTableId);return c;
}
export function activeTable(c){return c.castingTables.find(t=>t.id===c.activeTableId)||c.castingTables[0];}
export function syncTable(c){const t=activeTable(c);t.casting=c.casting;t.spellMisc=c.spellMisc;t.slots=c.slots;}
export function activateTable(c,key){const t=c.castingTables.find(t=>t.id===key)||c.castingTables[0];c.activeTableId=t.id;c.casting=t.casting;c.spellMisc=t.spellMisc;c.slots=t.slots;return t;}
export function tableFor(c,spell){return c.castingTables.find(t=>t.id===spell.tableId)||activeTable(c);}
export function spellDC(c,s){const t=tableFor(c,s);return 10+s.level+Math.floor((abilityValue(c,t.casting)-10)/2)+t.spellMisc;}
export const displaySpeed=c=>c.speed/(c.speedUnit==='squares'?1.5:1);
export const speedInMeters=(value,unit)=>Number(value)*(unit==='squares'?1.5:1);
export function validateExtended(c){
 validateLanguages(c);validateMapPoints(c);validateAbilityBonuses(c);
 const number=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=999999;
 if(c.speedUnit!==undefined&&!['m','squares'].includes(c.speedUnit))throw Error('Unidade inválida.');
 for(const cl of c.classes){if(typeof cl.name!=='string'||!cl.name.trim()||cl.name.length>300)throw Error('Classe inválida.');if(cl.customBab!==undefined&&!number(cl.customBab))throw Error('BBA inválido.');if(cl.customSaves!==undefined&&(!cl.customSaves||['f','r','w'].some(k=>!number(cl.customSaves[k]))))throw Error('Resistências inválidas.');}
 if(c.customSkills!==undefined&&(!Array.isArray(c.customSkills)||c.customSkills.length>500||c.customSkills.some(s=>!s||typeof s.name!=='string'||s.name.length>300||!['str','dex','con','int','wis','cha'].includes(s.ability)||typeof s.trained!=='boolean')))throw Error('Especialidades inválidas.');
 if(c.castingTables!==undefined){if(!Array.isArray(c.castingTables)||!c.castingTables.length||c.castingTables.length>30)throw Error('Tabelas inválidas.');const ids=new Set();for(const t of c.castingTables){if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.name!=='string'||t.name.length>300||!['str','dex','con','int','wis','cha'].includes(t.casting)||!number(t.spellMisc)||!Array.isArray(t.slots)||t.slots.length!==10||t.slots.some(s=>!s||!number(s.max)||!number(s.used)||s.max<0||s.used<0||s.used>s.max))throw Error('Tabela inválida.');ids.add(t.id);}if(!ids.has(c.activeTableId)||c.spells.some(s=>s.tableId!==undefined&&!ids.has(s.tableId)))throw Error('Vínculo de magia inválido.');}
}
