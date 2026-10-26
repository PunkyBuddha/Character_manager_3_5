export const ABILITY_KEYS=['str','dex','con','int','wis','cha'];
export const ABILITY_BONUS_TYPES=['Sem tipo','Melhoria','Moral','Sorte','Competência','Sagrado','Profano','Racial','Alquímico','Circunstância','Inerente'];
export function abilityBonus(c,key){const typed=new Map();let sum=0;const named=new Map();
 for(const b of c.abilityBonuses?.[key]||[]){if(!b.enabled)continue;const source=b.name.trim().toLocaleLowerCase('pt-BR'),identity=source?b.type+'\0'+source:null;if(!identity){apply(b);continue;}const g=named.get(identity)||{...b,value:0,penalty:0};g.value=Math.max(g.value,b.value);g.penalty=Math.min(g.penalty,b.value);named.set(identity,g);}
 for(const b of named.values()){apply(b);if(b.penalty)apply({...b,value:b.penalty});}
 function apply(b){if(b.type==='Sem tipo'||b.type==='Circunstância'){sum+=b.value;return;}const g=typed.get(b.type)||{positive:0,negative:0};g.positive=Math.max(g.positive,b.value);g.negative+=Math.min(0,b.value);typed.set(b.type,g);}
 return sum+[...typed.values()].reduce((n,g)=>n+g.positive+g.negative,0);
}
export const abilityValue = (c, key) => {
  const base = (c.wildShape?.active && ['str', 'dex', 'con'].includes(key) && c.wildShape[key] !== undefined)
    ? c.wildShape[key]
    : c.attrs[key];
  return Math.max(0, base + abilityBonus(c, key));
};
export function validateAbilityBonuses(c){if(c.abilityBonuses===undefined)return;const data=c.abilityBonuses;if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!ABILITY_KEYS.includes(k)))throw Error('Modificadores de atributo inválidos.');for(const rows of Object.values(data)){if(!Array.isArray(rows)||rows.length>30)throw Error('Lista de modificadores inválida.');const ids=new Set();for(const b of rows){if(!b||typeof b.id!=='string'||!b.id||ids.has(b.id)||typeof b.name!=='string'||b.name.length>120||!Number.isInteger(b.value)||Math.abs(b.value)>999||!ABILITY_BONUS_TYPES.includes(b.type)||typeof b.enabled!=='boolean')throw Error('Modificador de atributo inválido.');ids.add(b.id);}}}
